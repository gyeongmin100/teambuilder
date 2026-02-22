import { parseJsonSafe } from '../../shared/text.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const buildPrompt = ({ participants, teamSize, remainderMode, customPrompt, constraints }) => {
  const schema = {
    request_status: [
      {
        request: '요청 원문 일부',
        status: 'satisfied | partially_satisfied | violated | impossible | not_verifiable',
        reason: '판단 근거'
      }
    ],
    teams: [
      {
        id: 1,
        members: ['id1', 'id2', 'id3'],
        analysis: '왜 이 조합인지 간단히 설명'
      }
    ],
    reason: '전체 배정 요약',
    warnings: ['불가능/모호/충돌 관련 경고'],
    decision_log: ['모순/모호 시 어떤 판단으로 최선안을 선택했는지']
  };

  return [
    '역할: 너는 팀빌딩 최적화 엔진이다.',
    '최우선 목표: 사용자 요청 최대 반영.',
    '차선 목표: 불가능/모순 구간을 최소화.',
    '필수: 어떤 요청이 왜 미충족/부분충족인지 근거를 남긴다.',
    '다음 참가자 전원을 팀으로 배정해라.',
    '중요: 반드시 JSON 객체만 반환한다. Markdown 금지.',
    `teamSize: ${teamSize}`,
    `remainderMode: ${remainderMode}`,
    `customRequirements: ${customPrompt || '(없음)'}`,
    `normalizedConstraints(JSON): ${JSON.stringify(constraints || [])}`,
    '',
    '규칙:',
    '- 모든 id를 정확히 한 번씩만 사용',
    '- 존재하지 않는 id 사용 금지',
    '- 사용자 요청사항을 최대한 반영',
    '- 모호한 요청은 가장 보수적이고 일관된 해석 1개를 택하고 reason/decision_log에 남김',
    '- 불가능한 요청은 억지로 숨기지 말고 impossible 또는 partially_satisfied로 명시',
    '- 모순되는 요청은 전체 위반 수를 최소화하는 안을 선택하고 warnings에 기록',
    '- remainderMode가 spread면 팀 개수는 floor(전체인원/teamSize)로 유지하고, 나머지 인원만 기존 팀에 추가 배정 (새 팀 생성 금지)',
    '- remainderMode가 keep_partial이면 마지막 부족 팀 1개 생성 허용',
    '- remainderMode가 prompt면 customRequirements에서 나머지 처리 지시를 우선 적용한다. 명시 지시가 없으면 spread로 처리',
    '',
    'participants(JSON):',
    JSON.stringify(participants),
    '',
    '반환 스키마 예시:',
    JSON.stringify(schema)
  ].join('\n');
};

const callOpenAIOnce = async ({ participants, teamSize, remainderMode, customPrompt, constraints, env }) => {
  const prompt = buildPrompt({ participants, teamSize, remainderMode, customPrompt, constraints });

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
            '너는 팀빌딩 배정 엔진이다. 반드시 JSON 객체만 출력한다. 참가자 id 누락/중복 금지. 사용자 조건 우선. 미충족 요청의 원인과 판단 근거를 숨기지 말고 reason/warnings/decision_log에 남겨라.'
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
