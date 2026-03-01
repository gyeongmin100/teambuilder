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
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
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

const EXTRACT_SYSTEM = `너는 사용자 요청을 개별 요청 단위로 분해하는 분석기다.
참가자 데이터는 주어지지 않는다. 요청의 의도만 파악하라.
팀 배정이나 데이터 분석은 하지 마라.

## 분해 규칙
- 하나의 문장에 여러 의도가 있으면 각각 분리하라.
- 의도가 모호하면 가장 합리적인 해석 하나를 채택하라.
- 팀 배정과 무관한 요청도 포함하되 is_relevant: false로 표시하라.
- JSON object만 반환하라. markdown/code fence 금지.
- 사용자 프롬프트와 같은 언어로 작성하라.

## 예시 (few-shot)

입력: "내향적인 사람끼리 묶고, 리더십 강한 사람은 각 팀에 분산시켜줘"
출력:
{"requests":[
  {"id":"R1","request":"내향적인 성향의 사람들을 같은 팀에 배치","type":"group_similar","priority":"must","is_relevant":true},
  {"id":"R2","request":"리더십이 강한 사람을 각 팀에 1명씩 분산 배치","type":"distribute","priority":"must","is_relevant":true}
]}

입력: "오늘 날씨 좋다, 그리고 같은 학과끼리 안 겹치게 해줘"
출력:
{"requests":[
  {"id":"R1","request":"오늘 날씨가 좋다","type":"other","priority":"prefer","is_relevant":false,"ignore_reason":"팀 배정과 무관한 일상 발언"},
  {"id":"R2","request":"같은 학과의 사람이 같은 팀에 배정되지 않도록 분산","type":"group_different","priority":"must","is_relevant":true}
]}`;

const callExtract = async ({ customPrompt, env }) => {
  const userPrompt = [
    '# USER PROMPT',
    customPrompt,
    '',
    '# OUTPUT_SCHEMA',
    '{"requests":[{"id":"R1","request":"...","type":"group_similar|group_different|balance|distribute|specific_together|specific_apart|other","priority":"must|prefer","is_relevant":true,"ignore_reason":""}]}'
  ].join('\n');

  return callOpenAI(EXTRACT_SYSTEM, userPrompt, env);
};

/* ═══════════════════════════════════════════
   2단계: 데이터 분석 (callAnalyze)
   ═══════════════════════════════════════════ */

const ANALYZE_SYSTEM = `너는 분해된 요청을 기준으로 참가자 데이터를 분석하는 분석기다.
팀 배정은 하지 마라. 분석만 수행하라.
JSON object만 반환하라.
사용자 프롬프트와 같은 언어로 작성하라.

## 분석 방법

### Step A: 요청별 개별 분석
각 요청마다:
1. 해당 요청이 참가자 데이터의 어떤 feature(열)에 해당하는지 찾아라.
2. 해당 feature의 값별로 참가자를 그룹화하라.
3. 각 그룹의 인원 수를 기록하라.

### Step B: 복수 요청 교차 분석
요청이 2개 이상일 때:
- 각 참가자에 대해 모든 요청의 기준 feature 값을 나란히 정리하라.
- 요청 간 조합을 분석하라. 한 요청을 지키면 다른 요청이 깨지는지 확인하라.
- 상충(한 요청을 지키면 다른 요청 위반) / 조화(동시 달성 가능) 여부를 판단하라.

### Step C: 적합도 태그
교차 분석 결과를 바탕으로 핵심 참가자에 태그를 붙여라.
- 복수 요청을 동시에 충족시킬 수 있는 핵심 인원
- 특정 요청에는 적합하나 다른 요청과 상충하는 인원`;

const callAnalyze = async ({ requests, participants, env }) => {
  const relevantRequests = (requests || []).filter((r) => r.is_relevant !== false);

  const userPrompt = [
    '# REQUESTS (분해된 요청 목록)',
    JSON.stringify(relevantRequests),
    '',
    '# PARTICIPANTS',
    JSON.stringify(participants),
    '',
    '# OUTPUT_SCHEMA',
    JSON.stringify({
      individual_analysis: [
        {
          request_id: 'R1',
          target_feature: 'feature_name',
          groups: [{ value: 'value', members: ['id'], count: 0 }]
        }
      ],
      cross_analysis: {
        conflicts: ['상충 설명'],
        compatible: ['조화 설명'],
        member_tags: [{ id: 'participant_id', tags: '적합도 설명' }]
      }
    })
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
    schema[`team_${i + 1}`] = { members: Array(s).fill('participant_id'), analysis: '이 팀 구성 이유 서술' };
  });
  schema.reason = '전체 배정 사유 서술';
  schema.prompt_checklist = [{
    request_id: 'R1', item: '요청 원문', status_key: 'full|partial|unmet',
    reason: '이 status인 이유 서술', applied_detail: '팀별 반영 내용 서술',
    evidence: ['수치적 근거'], trade_off: '상충 시 어떤 요청을 양보했는지 서술'
  }];
  return schema;
};

const ASSIGN_SYSTEM = `너는 분석 결과를 바탕으로 팀 슬롯에 참가자를 배치하는 배정자다.
JSON object만 반환하라.
사용자 프롬프트와 같은 언어로 작성하라.

## 배치 전략
1. priority가 must인 요청을 먼저 반영하라.
2. ANALYSIS의 cross_analysis.member_tags에서 핵심 인원을 확인하고, 해당 인원부터 먼저 배치하라.
   ANALYSIS의 cross_analysis.conflicts를 확인하고, 상충하는 요청의 trade_off를 체크리스트에 반드시 서술하라.
   ANALYSIS를 무시하고 자체 판단으로 배치하지 마라.
3. individual_analysis의 groups를 기준으로 나머지 인원을 채우라.

## 슬롯 불일치 처리
- 유사 그룹 > 슬롯 크기: 슬롯 크기만큼만 배치. 나머지는 유사 그룹이 가장 많은 다른 팀에 배치.
- 유사 그룹 < 슬롯 크기: 해당 그룹 전원 배치 후, 빈자리는 가장 유사한 그룹의 멤버로 채움.
- 복수 요청 상충 시: must 우선 반영. 상충 사실을 체크리스트의 trade_off에 서술.

## 무관 요청 처리
REQUESTS 중 is_relevant: false인 항목도 체크리스트에 반드시 포함하라.
status_key: "unmet", reason에 "팀 배정과 무관한 요청입니다" 등으로 표시하라.

## 체크리스트 작성 방법
각 요청에 대해:
- item: 요청 원문
- status_key: full | partial | unmet
- reason: "~하였으나 ~때문에 부분 충족으로 판단하였습니다" 형태로 서술
- applied_detail: 각 팀에 어떻게 반영되었는지 팀별로 서술
- evidence: 팀별 수치 근거. 반드시 "Team N: 값 N명(비율)" 형태로 각 팀마다 기재. 전체 분포가 아닌 팀별 분포를 작성할 것. 전체 합계만 쓰면 안 된다.
- trade_off: 다른 요청과 상충한 경우, 어떤 요청과 어떻게 상충했고 왜 양보했는지 서술. 상충 없으면 빈 문자열.

## 체크리스트 작성 예시 (이 형태를 따라라)
{"request_id":"R1","item":"MBTI 유사한 사람끼리 배치","status_key":"partial","reason":"INTJ 4명은 Team 1에 전원 배치하였으나, ENTP 3명은 슬롯 4명 중 나머지 1자리를 ENFP로 보완하여 부분 충족으로 판단하였습니다.","applied_detail":"Team 1에는 INTJ 4명과 INFJ 1명을 배치하여 IN형 중심으로 구성. Team 2에는 ENTP 3명과 ENFP 1명을 배치하여 EN형 중심으로 구성. Team 3에는 ISFJ 2명, INFJ 1명, ENFP 1명을 배치.","evidence":["Team1: INTJ 4명(80%), INFJ 1명(20%)","Team2: ENTP 3명(75%), ENFP 1명(25%)","Team3: ISFJ 2명(50%), INFJ 1명(25%), ENFP 1명(25%)"],"trade_off":""}

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
