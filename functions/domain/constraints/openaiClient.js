import { parseJsonSafe } from '../../shared/text.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/* ─── 공통 헬퍼 ─── */

const callOpenAI = async (systemPrompt, userPrompt, env) => {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const failText = await res.text();
    throw new Error(`OpenAI API error: ${failText}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI response is empty.');
  return parseJsonSafe(raw, null);
};

/* ═══════════════════════════════════════════
   1단계: 프롬프트 분해 (callExtract)
   ═══════════════════════════════════════════ */

const EXTRACT_SYSTEM = `너는 사용자 프롬프트를 분석하여 개별 요청으로 분해하는 분석기다.
JSON object만 반환하라.
사용자 프롬프트와 같은 언어로 작성하라.

## 작업
사용자 프롬프트를 개별 요청(request)으로 분해하라.
각 요청에 대해:
- id: R1, R2, ... 순서
- request: 요청 원문 (사용자가 쓴 그대로, 한 문장)
- type: group_similar | group_different | balance | exclude | include | custom
- target_feature: 이 요청이 참조하는 참가자 속성 (예: mbti, gender, age). 없으면 빈 문자열.
- priority: must | prefer (팀 배정에 직접적 영향 = must, 가능하면 = prefer)
- is_relevant: true | false (팀 배정과 무관한 요청이면 false)

## few-shot 예시
입력: "오늘 날씨 어때? MBTI 비슷한 사람끼리 팀 짜주고 성비도 맞춰줘"
출력:
{"requests":[
  {"id":"R1","request":"오늘 날씨 어때?","type":"custom","target_feature":"","priority":"prefer","is_relevant":false},
  {"id":"R2","request":"MBTI 비슷한 사람끼리 팀 배치","type":"group_similar","target_feature":"mbti","priority":"must","is_relevant":true},
  {"id":"R3","request":"성비를 균등하게 맞춰줘","type":"balance","target_feature":"gender","priority":"prefer","is_relevant":true}
]}`;

const callExtract = async ({ customPrompt, env }) => {
  return callOpenAI(EXTRACT_SYSTEM, customPrompt, env);
};

/* ═══════════════════════════════════════════
   2단계: 데이터 분석 (callAnalyze)
   ═══════════════════════════════════════════ */

const ANALYZE_SYSTEM = `너는 분해된 요청과 참가자 데이터를 교차 분석하는 분석가다.
JSON object만 반환하라.
사용자 프롬프트와 같은 언어로 작성하라.

## 작업
1. individual_analysis: 각 요청별로 참가자 데이터를 분석하라.
   - request_id, groups (해당 feature 기준 그룹핑), distribution (분포)
2. cross_analysis: 복수 요청 간 교차 분석.
   - conflicts: 어떤 요청끼리 상충하는지, 왜 상충하는지
   - member_tags: 복수 요청을 동시에 만족시킬 핵심 인원 식별

팀 배정은 하지 마라. 분석만 수행하라.`;

const callAnalyze = async ({ requests, participants, env }) => {
  const userPrompt = [
    '# REQUESTS (1단계에서 분해된 요청)',
    JSON.stringify(requests),
    '',
    '# PARTICIPANTS',
    JSON.stringify(participants.map(p => ({
      id: p.id,
      name: p.name || p.displayName,
      features: p.features || {}
    })))
  ].join('\n');

  return callOpenAI(ANALYZE_SYSTEM, userPrompt, env);
};

/* ═══════════════════════════════════════════
   3단계: 슬롯 배정 (callAssign)
   ═══════════════════════════════════════════ */

const buildSlotTemplate = (sizes) =>
  sizes.map((s, i) => `Team ${i + 1} (${s}명): [${Array(s).fill('_').join(', ')}]`).join('\n');

const buildSlotReminder = (sizes) =>
  sizes.map((s, i) => `team_${i + 1}: 정확히 ${s}명`).join('\n');

const buildOutputSchema = (sizes) => {
  const schema = {};
  sizes.forEach((s, i) => {
    schema[`team_${i + 1}`] = { members: Array(s).fill('participant_id') };
  });
  schema.checklist = [{ item: '요청 원문', status: 'full|partial|unmet' }];
  schema.report = '배정 과정과 결과를 구체적으로 서술';
  return schema;
};

const ASSIGN_SYSTEM = `너는 분석 결과를 바탕으로 팀 슬롯에 참가자를 배치하는 배정자다.
JSON object만 반환하라.
사용자 프롬프트와 같은 언어로 작성하라.

## 배치 전략
1. priority가 must인 요청을 먼저 반영하라.
2. ANALYSIS의 cross_analysis.member_tags에서 핵심 인원을 확인하고, 해당 인원부터 먼저 배치하라.
   ANALYSIS의 cross_analysis.conflicts를 확인하고 반드시 고려하라.
   ANALYSIS를 무시하고 자체 판단으로 배치하지 마라.
3. individual_analysis의 groups를 기준으로 나머지 인원을 채우라.

## 슬롯 불일치 처리
- 유사 그룹 > 슬롯 크기: 슬롯 크기만큼만 배치. 나머지는 유사 그룹이 가장 많은 다른 팀에 배치.
- 유사 그룹 < 슬롯 크기: 해당 그룹 전원 배치 후, 빈자리는 가장 유사한 그룹의 멤버로 채움.
- 복수 요청 상충 시: must 우선 반영.

## 출력 형식
1. checklist: REQUESTS의 모든 항목(is_relevant: false 포함)에 대해 item(요청 원문)과 status(full/partial/unmet)만 기입.
2. report: 배정 과정과 결과를 구체적으로 자유서술.

## report 작성 규칙
- 팀별 수치(비율, 인원수)를 포함하라.
- 요청 간 상충이 있었으면 무엇을 우선하고 무엇을 양보했는지 쓰라.
- 무관 요청은 왜 반영하지 않았는지 간단히 언급하라.
- 추상적이거나 일반적인 표현("팀별로 구성하였습니다")을 쓰지 마라.

## 출력 전 자기 검증
- 각 team_N.members 배열 길이가 슬롯 크기와 일치하는지 확인.
- 모든 참가자 id가 정확히 1회 사용되었는지 확인.`;

const callAssign = async ({
  requests, analysis, participants, targetTeamSizes, teamSize, env
}) => {
  const slotTemplate = buildSlotTemplate(targetTeamSizes);
  const slotReminder = buildSlotReminder(targetTeamSizes);
  const schema = buildOutputSchema(targetTeamSizes);
  const allRequests = requests || [];

  const userPrompt = [
    '# [1] TEAM SLOTS (이 틀 안에서 배치하라)',
    slotTemplate,
    `총 참가자: ${participants.length}명 / 총 팀: ${targetTeamSizes.length}개 / 팀당 기준 인원: ${teamSize}명`,
    '',
    '# [2] REQUESTS (분해된 요청 — is_relevant: false 포함)',
    JSON.stringify(allRequests),
    '',
    '# [3] ANALYSIS (2단계 분석 결과)',
    JSON.stringify(analysis),
    '',
    '# [4] PARTICIPANTS',
    JSON.stringify(participants),
    '',
    '# [5] RULES + SLOT REMINDER',
    '- 각 팀의 members 배열 원소 수는 해당 슬롯 크기와 정확히 일치해야 한다.',
    '- 모든 참가자 id를 정확히 1회 사용할 것. 중복/누락 불가.',
    '- 팀을 추가하거나 삭제하거나 크기를 변경하지 말 것.',
    '',
    '## SLOT REMINDER (다시 한번 확인)',
    slotReminder,
    '',
    '# [6] OUTPUT_SCHEMA',
    JSON.stringify(schema)
  ].join('\n');

  return callOpenAI(ASSIGN_SYSTEM, userPrompt, env);
};

export { callExtract, callAnalyze, callAssign };
