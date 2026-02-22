import { parseJsonSafe } from '../../shared/text.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_CONTEXT = `# SYSTEM: Team Assignment Optimizer

## 0) Mission
- 이 서비스의 핵심 KPI는 사용자 프롬프트 반영 정확도 최대화다.
- 단, 불변 하드제약은 항상 100% 충족해야 한다.

## 1) Non-Negotiable Constraints (절대 위반 금지)
1. 모든 참가자는 정확히 1개 팀에만 배정
2. 중복 배정 0명
3. 누락 0명
4. 존재하지 않는 id 배정 금지
5. 팀 인원은 1명 이상
6. 결과 팀 수/인원 분포는 수학적으로 일관

## 2) User-Overridable Hard Constraints
- 팀 수 고정/가변
- 팀당 인원 고정/범위
- 나머지 인원 처리 방식
- 요청 우선순위
- 단, 위 변경 후에도 1) 불변 하드제약은 반드시 유지

## 3) Prompt Understanding Protocol
1. user_prompt를 항상 intent_items 배열로 분해(단일 요청도 길이 1)
2. 각 intent별 category/priority/target_scope/feasibility 판정
3. intent 충돌 시 우선순위+실행가능성으로 조정
4. 단일 요청은 단일 최적화, 복합 요청은 다목표 최적화
5. 정량 검증 실패 피드백(validationFeedback)을 반영해 재생성

## 4) Remainder Policy
- mode: spread | keep_partial | prompt
- prompt 모드에서는 사용자 지시를 우선 해석
- 불변 하드제약 위반 시 해당 지시는 무효 처리하고 최선 대안을 선택

## 5) Output Rules
- 내부 기술 용어(fallback, parser, soft_objective 등) 노출 금지
- 사용자 관점 문장만 사용
- 요청별 반영 결과를 intent 단위로 설명
- 반드시 JSON 객체만 출력`;

const buildPrompt = ({
  participants,
  teamSize,
  remainderMode,
  targetTeamCount,
  targetTeamSizes,
  customPrompt,
  feedback
}) => {
  const schema = {
    teams: [
      {
        id: 1,
        members: ['id1', 'id2', 'id3'],
        analysis: '해당 팀 구성이 왜 사용자 요청과 데이터 조건에 맞는지 설명'
      }
    ],
    reason: '전체 팀 배정 핵심 요약',
    remainder_decision: {
      mode: 'existing_teams | new_team',
      allowed_team_count_change: false,
      reason: '나머지 인원 처리 판단 근거'
    },
    request_status: [
      {
        request: '사용자 요청 문장',
        status: 'satisfied | partially_satisfied | unmet',
        reason: '판단 이유'
      }
    ],
    request_reflection: {
      intent_results: [
        {
          intent_id: 'I1',
          original_text: '원문 요청',
          status: 'fulfilled | partial | unfulfilled',
          reason: '판정 이유'
        }
      ]
    },
    integrity_check: {
      duplicate_count: 0,
      missing_count: 0,
      invalid_id_count: 0,
      team_count_match: true
    },
    warnings: ['정량 또는 정성적으로 완전 충족하지 못한 이유']
  };

  const ruleLines = [
    '- 참가자 id 중복/누락/무효 id는 절대 허용하지 마라',
    '- teamSize, targetTeamCount, targetTeamSizes를 최대한 맞춰라',
    '- user_prompt는 단일/복합 요청 모두 intent 단위로 분해해 반영하라',
    '- 충돌 요청은 우선순위와 실행가능성 기준으로 조정하고 이유를 남겨라',
    '- remainderMode가 prompt면 사용자 지시를 우선하되, 불변 제약 위반 시 무효 처리하라',
    '- 팀 수를 바꿨다면 remainder_decision.allowed_team_count_change=true로 명시하라',
    '- request_status(기존 호환)와 request_reflection.intent_results(신규 상세)를 함께 채워라',
    '- JSON 객체만 출력 (설명문/Markdown/코드블록 금지)'
  ];

  return [
    '# INPUT',
    '역할: 너는 팀 배정 의사결정 엔진이다.',
    `teamSize: ${teamSize}`,
    `remainderMode: ${remainderMode}`,
    `targetTeamCount: ${targetTeamCount}`,
    `targetTeamSizes: ${JSON.stringify(targetTeamSizes)}`,
    `user_prompt: ${customPrompt || '(없음)'}`,
    feedback ? `validationFeedback: ${feedback}` : '',
    '',
    '# RULES',
    ...ruleLines,
    '',
    '# participants(JSON)',
    JSON.stringify(participants),
    '',
    '# OUTPUT_SCHEMA',
    JSON.stringify(schema)
  ]
    .filter(Boolean)
    .join('\n');
};

const callOpenAIOnce = async ({
  participants,
  teamSize,
  remainderMode,
  targetTeamCount,
  targetTeamSizes,
  customPrompt,
  feedback,
  env
}) => {
  const prompt = buildPrompt({
    participants,
    teamSize,
    remainderMode,
    targetTeamCount,
    targetTeamSizes,
    customPrompt,
    feedback
  });

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_CONTEXT
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const failText = await res.text();
    throw new Error(`OpenAI API 오류: ${failText}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI 응답이 비어 있습니다.');
  return parseJsonSafe(raw, null);
};

export { callOpenAIOnce };
