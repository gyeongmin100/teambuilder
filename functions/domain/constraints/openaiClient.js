import { parseJsonSafe } from '../../shared/text.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_CONTEXT = `# SYSTEM: Team Assignment Optimizer

## Mission
- You are the sole decision-maker for team assignment.
- Use all participant information and prioritize user prompt intent.

## Prompt-First Interpretation
- Treat the prompt as request items and reflect them directly.
- If requests conflict, choose the best trade-off and explain briefly.

## Remainder Handling
- remainderPolicy: spread | new_team | custom
- If remainderPolicy is custom, follow customRemainderPlan exactly.

## Output Rules
- Return JSON object only.
- Explain what was reflected / partially reflected / not reflected in user language.
- The server will trust this output directly, so provide final teams carefully.`;

const buildPrompt = ({
  participants,
  teamSize,
  remainderPolicy,
  targetTeamCount,
  targetTeamSizes,
  customRemainderPlan,
  customPrompt,
  feedback
}) => {
  const schema = {
    teams: [
      {
        id: 1,
        members: ['id1', 'id2', 'id3'],
        analysis: 'Why this team was formed according to user requests and available data.'
      }
    ],
    reason: 'Short global summary of assignment rationale.',
    remainder_decision: {
      mode: 'existing_teams | new_team',
      allowed_team_count_change: false,
      reason: 'Decision reason for remainder handling.'
    },
    request_reflection: {
      intent_results: [
        {
          intent_id: 'I1',
          original_text: 'Original user request item text',
          status: 'fulfilled | partial | unfulfilled',
          reason: 'Why this status was decided'
        }
      ]
    },
    request_status: [
      {
        request: 'Legacy compatible request text',
        status: 'satisfied | partially_satisfied | unmet',
        reason: 'Legacy compatible reason'
      }
    ],
    warnings: ['Optional warnings for unavoidable trade-offs.']
  };

  const ruleLines = [
    '- Use participant ids from input.',
    '- Interpret user_prompt directly as request items.',
    '- For multiple requests, evaluate each item and return per-item status.',
    '- Respect remainderPolicy and targetTeamSizes.',
    '- If remainderPolicy=custom, apply customRemainderPlan exactly.',
    '- If team count is changed, set remainder_decision.allowed_team_count_change=true.',
    '- Fill both request_reflection.intent_results and request_status for compatibility.',
    '- Return JSON object only (no markdown/code fences).'
  ];

  return [
    '# INPUT',
    `teamSize: ${teamSize}`,
    `remainderPolicy: ${remainderPolicy}`,
    `targetTeamCount: ${targetTeamCount}`,
    `targetTeamSizes: ${JSON.stringify(targetTeamSizes)}`,
    `customRemainderPlan: ${JSON.stringify(customRemainderPlan || {})}`,
    `user_prompt: ${customPrompt || '(none)'}`,
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
  remainderPolicy,
  targetTeamCount,
  targetTeamSizes,
  customRemainderPlan,
  customPrompt,
  feedback,
  env
}) => {
  const prompt = buildPrompt({
    participants,
    teamSize,
    remainderPolicy,
    targetTeamCount,
    targetTeamSizes,
    customRemainderPlan,
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

const callOpenAIRequestVerifier = async ({
  customPrompt,
  teams,
  teamSize,
  remainderMode,
  targetTeamCount,
  targetTeamSizes,
  env
}) => {
  const prompt = [
    '# TASK',
    'Check whether team assignment follows the user request.',
    '',
    '# USER_PROMPT',
    String(customPrompt || ''),
    '',
    '# CONTEXT',
    `teamSize: ${teamSize}`,
    `remainderMode: ${remainderMode}`,
    `targetTeamCount: ${targetTeamCount}`,
    `targetTeamSizes: ${JSON.stringify(targetTeamSizes)}`,
    '',
    '# TEAMS',
    JSON.stringify(
      (teams || []).map((t) => ({
        id: t.id,
        size: Array.isArray(t.members) ? t.members.length : 0,
        member_ids: Array.isArray(t.members) ? t.members.map((m) => m.id) : []
      }))
    ),
    '',
    '# OUTPUT_JSON_ONLY',
    JSON.stringify({
      is_match: true,
      issues: ['short reason if mismatch']
    })
  ].join('\n');

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
            'You are a strict assignment validator. Return JSON only. Decide match only by user prompt compliance, not by writing style.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0
    })
  });

  if (!res.ok) {
    const failText = await res.text();
    throw new Error(`OpenAI request verifier API error: ${failText}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  const parsed = parseJsonSafe(raw, {});
  return {
    isMatch: parsed?.is_match !== false,
    issues: Array.isArray(parsed?.issues) ? parsed.issues.map((x) => String(x || '').trim()).filter(Boolean) : []
  };
};

export { callOpenAIOnce, callOpenAIRequestVerifier };
