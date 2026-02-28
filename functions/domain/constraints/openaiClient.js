import { parseJsonSafe } from '../../shared/text.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_CONTEXT = `# SYSTEM: Team Slot Filler

## Mission
- You fill pre-defined team slots with participants.
- Team slots are FIXED. Do NOT add, remove, or resize any team.
- Your only job: decide WHICH participant goes into WHICH slot.

## Thinking Process (이 순서를 반드시 지켜라)
Step 1: TEAM SLOTS를 확인하라. 각 팀의 정확한 인원수를 파악하라.
Step 2: USER REQUEST를 읽고, 배치 기준(criteria)을 추출하라.
        예: "성비 균형" → 기준: 성별 / "MBTI 유사" → 기준: MBTI
Step 3: PARTICIPANTS의 features에서 해당 기준 값만 분석하라.
        요청과 무관한 features는 배치 기준으로 사용하지 마라.
Step 4: 분석 결과를 바탕으로 각 슬롯에 참가자를 배치하라.

## Overflow/Underflow Rules
- 유사 그룹 > 슬롯 크기: 슬롯 크기만큼 넣고, 나머지는 다른 팀에 분산. 유사한 사람이 많은 팀에 우선 배치.
- 유사 그룹 < 슬롯 크기: 해당 그룹 전원 넣고, 빈자리는 가장 유사한 참가자로 채움.
- 슬롯 크기는 절대 변경 불가. 빈칸도 불가, 초과도 불가.

## Output Contract
- Return JSON object only.
- Do not return markdown/code fences.
- Write all user-facing text in the same language as the user prompt.
- Use a friendly, clear, beginner-friendly tone.

## Checklist Rules
- Convert user prompt into atomic checklist items (one intent per item).
- Include irrelevant items too. For irrelevant items, mark status as unmet and explain why the item is irrelevant to team assignment.
- For every checklist item, provide:
  - status_key: full | partial | unmet
  - status_label: natural-language label in user language
  - reason: why this status was chosen
  - applied_detail: how it was reflected (or why not)
  - evidence: concrete supporting facts from final teams when available
- Keep checklist item content faithful to original prompt intent. Do not merge multiple intents into one item.`;

const buildSlotTemplate = (targetTeamSizes) => {
  return targetTeamSizes.map((size, i) => {
    const blanks = Array(size).fill('_').join(', ');
    return `Team ${i + 1} (${size}명): [${blanks}]`;
  }).join('\n');
};

const buildSlotReminder = (targetTeamSizes) => {
  return targetTeamSizes.map((size, i) =>
    `team_${i + 1}: 정확히 ${size}명`
  ).join('\n');
};

const buildOutputSchema = (targetTeamSizes) => {
  const schema = {};
  targetTeamSizes.forEach((size, i) => {
    schema[`team_${i + 1}`] = {
      members: Array(size).fill('participant_id'),
      analysis: 'Why this team was formed.'
    };
  });
  schema.reason = 'Overall assignment reasoning in user language.';
  schema.prompt_checklist = [
    {
      intent_id: 'I1',
      item: 'One atomic request item from user prompt',
      is_relevant: true,
      ignore_reason: '',
      status_key: 'full | partial | unmet',
      status_label: 'Natural language label in user language',
      reason: 'Why this status was selected for this item',
      applied_detail: 'Detailed reflection for this item',
      evidence: ['Concrete evidence for this item']
    }
  ];
  schema.warnings = ['Optional warning messages for unavoidable trade-offs.'];
  return schema;
};

const buildPrompt = ({
  participants,
  teamSize,
  targetTeamCount,
  targetTeamSizes,
  customPrompt
}) => {
  const slotTemplate = buildSlotTemplate(targetTeamSizes);
  const slotReminder = buildSlotReminder(targetTeamSizes);
  const schema = buildOutputSchema(targetTeamSizes);
  const totalParticipants = participants.length;

  return [
    '# [1] TEAM SLOTS (이 틀 안에서 배치하라)',
    slotTemplate,
    `총 참가자: ${totalParticipants}명 / 총 팀: ${targetTeamCount}개 / 팀당 기준 인원: ${teamSize}명`,
    '',
    '# [2] USER REQUEST (이 기준으로 features를 분석하라)',
    customPrompt || '(없음)',
    '',
    '# [3] PARTICIPANTS (JSON)',
    JSON.stringify(participants),
    '',
    '# [4] RULES + SLOT REMINDER',
    '- 각 팀의 members 배열 원소 수는 해당 슬롯 크기와 정확히 일치해야 한다.',
    '- 모든 참가자 id를 정확히 1회 사용할 것. 중복/누락 불가.',
    '- 팀을 추가하거나 삭제하거나 크기를 변경하지 말 것.',
    '- USER REQUEST에서 언급한 기준만 분석하여 배치할 것.',
    '- 출력 전 자기 검증: 아래 슬롯 크기와 일치하는지 확인할 것.',
    '',
    '## SLOT REMINDER (다시 한번 확인)',
    slotReminder,
    '',
    '# [5] OUTPUT_SCHEMA',
    JSON.stringify(schema)
  ].join('\n');
};

const callOpenAIOnce = async ({
  participants,
  teamSize,
  remainderPolicy,
  targetTeamCount,
  targetTeamSizes,
  customPrompt,
  env
}) => {
  const prompt = buildPrompt({
    participants,
    teamSize,
    targetTeamCount,
    targetTeamSizes,
    customPrompt
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
        { role: 'system', content: SYSTEM_CONTEXT },
        { role: 'user', content: prompt }
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

export { callOpenAIOnce };
