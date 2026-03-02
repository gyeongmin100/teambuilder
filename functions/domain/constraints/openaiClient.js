import { parseJsonSafe } from '../../shared/text.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_CONTEXT = `# SYSTEM: Team Assignment Decision Maker

## Mission
- You are the final decision maker for team assignment.
- Respect assignment frame first (targetTeamCount, targetTeamSizes, unique participant ids), then satisfy user requests as much as possible.

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

const buildPrompt = ({
  participants,
  teamSize,
  remainderPolicy,
  targetTeamCount,
  targetTeamSizes,
  customPrompt
}) => {
  const schema = {
    reason: 'Overall assignment reasoning in user language.',
    teams: [
      {
        id: 1,
        members: ['participant_id_1', 'participant_id_2'],
        analysis: 'Why this team was formed.'
      }
    ],
    remainder_decision: {
      mode: 'existing_teams | new_team',
      allowed_team_count_change: false,
      reason: 'Reason for remainder handling.'
    },
    prompt_checklist: [
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
    ],
    warnings: ['Optional warning messages for unavoidable trade-offs.']
  };

  return [
    '# INPUT',
    `teamSize: ${teamSize}`,
    `remainderPolicy: ${remainderPolicy}`,
    `targetTeamCount: ${targetTeamCount}`,
    `targetTeamSizes: ${JSON.stringify(targetTeamSizes)}`,
    `user_prompt: ${customPrompt || '(none)'}`,
    '',
    '# RULES',
    '- Use only participant ids from input.',
    '- Every participant id must appear exactly once across teams.',
    '- Number of teams must match targetTeamCount.',
    '- Team sizes must exactly match targetTeamSizes.',
    '- Build prompt_checklist directly from user_prompt; do not skip unrelated items.',
    '- Include explicit unmet reasoning for irrelevant or unreflected items.',
    '- Return JSON object only.',
    '',
    '# participants(JSON)',
    JSON.stringify(participants),
    '',
    '# OUTPUT_SCHEMA',
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
    remainderPolicy,
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
