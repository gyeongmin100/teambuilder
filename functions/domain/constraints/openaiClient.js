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
- remainderPolicy: spread | new_team | one_team
- If remainderPolicy is one_team, place all remainder members into one existing team.

## Output Rules
- Return JSON object only.
- Explain what was reflected / partially reflected / not reflected in user language.
- The server will trust this output directly, so provide final teams carefully.`;

const CHECKLIST_SYSTEM_CONTEXT = `# SYSTEM: Prompt Relevance Judge for Team Assignment

## Mission
- Split user prompt into atomic request items.
- Decide whether each item is relevant to team assignment.
- If irrelevant, explain why briefly and concretely.

## Rules
- Return JSON object only.
- Do not create team assignment in this step.
- Keep decisions grounded in the given user prompt text.
- status_label must be exactly one of: 반영, 일부반영, 미반영.`;

const normalizePromptChecklist = (value) => {
  const rawList = Array.isArray(value) ? value : [];
  return rawList
    .map((item, idx) => {
      const text = String(
        item?.item || item?.text || item?.request || item?.original_text || item?.content || ''
      ).trim();
      if (!text) return null;

      const reason = String(
        item?.reason || item?.ignore_reason || item?.comment || item?.explanation || ''
      ).trim();
      const isRelevant = item?.is_relevant === true;
      const rawStatusKey = String(item?.status_key || item?.statusKey || '').trim().toLowerCase();
      const statusKey = ['applied', 'partial', 'unmet'].includes(rawStatusKey) ? rawStatusKey : 'unmet';
      const rawStatusLabel = String(
        item?.status_label || item?.statusLabel || item?.status || item?.result || ''
      ).trim();
      const statusLabel = ['반영', '일부반영', '미반영'].includes(rawStatusLabel) ? rawStatusLabel : '미반영';

      return {
        item: text,
        is_relevant: isRelevant,
        ignore_reason: isRelevant ? '' : reason,
        status_key: statusKey,
        status_label: statusLabel,
        status: statusLabel,
        statusLabel: statusLabel,
        reason,
        intent_id: String(item?.intent_id || `I${idx + 1}`)
      };
    })
    .filter(Boolean);
};

const buildPrompt = ({
  participants,
  teamSize,
  remainderPolicy,
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
        analysis: 'Why this team was formed according to user requests and available data.'
      }
    ],
    reason: 'Short global summary of assignment rationale.',
    global_report: 'Detailed free-form overall report in user language. End with a concise 2-line summary.',
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
    prompt_checklist: [
      {
        item: 'One atomic request item interpreted from user_prompt',
        status_key: 'applied | partial | unmet',
        status_label: '반영 | 일부반영 | 미반영',
        is_relevant: true,
        ignore_reason: '',
        reason: 'Why this checklist item has this status'
      }
    ],
    warnings: ['Optional warnings for unavoidable trade-offs.']
  };

  const ruleLines = [
    '- Use participant ids from input.',
    '- Interpret user_prompt directly as request items, without omitting ambiguous parts.',
    '- For multiple requests, evaluate each item and return per-item status.',
    '- Build prompt_checklist as atomic items and include status_key/status_label per item.',
    '- If an item is irrelevant to team assignment, set is_relevant=false and fill ignore_reason.',
    '- status_key must be one of: applied, partial, unmet.',
    '- status_label must be exactly one of: 반영, 일부반영, 미반영.',
    '- Write reason in free natural language. Do NOT use fixed/template phrases.',
    '- reason must be specific to that request item, not generic policy text.',
    '- Write global_report as a detailed free-form overall report (no fixed format/template), and end with a concise summary within 2 lines.',
    '- Respect remainderPolicy and targetTeamSizes.',
    '- If remainderPolicy=one_team, put all remainder members into one existing team.',
    '- If team count is changed, set remainder_decision.allowed_team_count_change=true.',
    '- Fill request_reflection.intent_results and prompt_checklist.',
    '- Return JSON object only (no markdown/code fences).'
  ];

  return [
    '# INPUT',
    `teamSize: ${teamSize}`,
    `remainderPolicy: ${remainderPolicy}`,
    `targetTeamCount: ${targetTeamCount}`,
    `targetTeamSizes: ${JSON.stringify(targetTeamSizes)}`,
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

const buildChecklistPrompt = ({ customPrompt }) => {
  const schema = {
    prompt_checklist: [
      {
        intent_id: 'I1',
        item: 'Atomic request item from user prompt',
        status_key: 'applied | partial | unmet',
        status_label: '반영 | 일부반영 | 미반영',
        is_relevant: true,
        ignore_reason: '',
        reason: 'Why this item is relevant or irrelevant to team assignment'
      }
    ]
  };

  return [
    '# INPUT',
    `user_prompt: ${customPrompt || '(none)'}`,
    '',
    '# RULES',
    '- Split the user prompt into atomic request items.',
    '- For each item, set is_relevant=true only when it can directly affect team assignment.',
    '- Fill status_key and status_label for every item.',
    '- status_key must be one of: applied, partial, unmet.',
    '- status_label must be exactly one of: 반영, 일부반영, 미반영.',
    '- Write reason in free natural language for each item.',
    '- Keep each reason specific to the request item context.',
    '- If is_relevant=false, fill ignore_reason with a concrete reason in user language.',
    '- Fill reason for every item.',
    '- Return JSON object only (no markdown/code fences).',
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

const callOpenAIPromptChecklist = async ({ customPrompt, env }) => {
  const prompt = buildChecklistPrompt({ customPrompt });

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CHECKLIST_SYSTEM_CONTEXT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0
    })
  });

  if (!res.ok) {
    const failText = await res.text();
    throw new Error(`OpenAI checklist API error: ${failText}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI checklist response is empty.');
  const parsed = parseJsonSafe(raw, {});
  return normalizePromptChecklist(parsed?.prompt_checklist);
};

export { callOpenAIOnce, callOpenAIRequestVerifier, callOpenAIPromptChecklist };

