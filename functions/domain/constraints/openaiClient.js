import { parseJsonSafe } from '../../shared/text.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

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
    warnings: ['정량 또는 정성적으로 완전 충족하지 못한 이유']
  };

  const ruleLines = [
    '- 모든 참가자 id는 반드시 정확히 한 번씩만 사용',
    '- 존재하지 않는 id 사용 금지',
    '- 팀 개수는 targetTeamCount와 동일해야 함',
    '- 팀별 인원은 targetTeamSizes를 가능한 한 정확히 맞춰야 함',
    '- 사용자 맞춤 프롬프트를 최우선으로 반영',
    '- remainderMode가 prompt면 나머지 인원 처리 방식을 remainder_decision에 명시',
    '- 팀 수를 바꿨다면 remainder_decision.allowed_team_count_change=true 로 표시',
    '- 요청 충돌 시 어떤 요청을 우선했는지 request_status.reason에 명시',
    '- JSON 객체만 출력 (Markdown 금지)'
  ];

  return [
    '역할: 너는 팀 배정 의사결정 엔진이다.',
    `teamSize: ${teamSize}`,
    `remainderMode: ${remainderMode}`,
    `targetTeamCount: ${targetTeamCount}`,
    `targetTeamSizes: ${JSON.stringify(targetTeamSizes)}`,
    `customPrompt: ${customPrompt || '(없음)'}`,
    feedback ? `validationFeedback: ${feedback}` : '',
    '',
    '규칙:',
    ...ruleLines,
    '',
    'participants(JSON):',
    JSON.stringify(participants),
    '',
    '반환 스키마:',
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
          content:
            '너는 팀 배정 엔진이다. 반드시 JSON 객체만 출력한다. 중복/누락/잘못된 id를 절대 만들지 않는다. 사용자 요청을 최대한 반영하되 충족 여부를 request_status로 설명한다.'
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
