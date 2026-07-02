import { parseJsonSafe } from '../../shared/text.js';

const OPENAI_URL = 'https://api.openai.com/v1/responses';

const HANGUL_REGEX = /[\u3131-\u318E\uAC00-\uD7A3]/g;
const LATIN_REGEX = /[A-Za-z]/g;

const detectPromptLanguage = (text = '') => {
  const source = String(text || '');
  const hangulCount = (source.match(HANGUL_REGEX) || []).length;
  const latinCount = (source.match(LATIN_REGEX) || []).length;

  if (hangulCount === 0 && latinCount === 0) return 'unknown';
  if (hangulCount >= latinCount) return 'ko';
  return 'en';
};

const normalizeOutputLanguage = (lang) => (lang === 'en' ? 'en' : 'ko');

const buildLanguageInstruction = (outputLanguage) => {
  if (outputLanguage === 'en') {
    return 'Write all natural-language output fields in English.';
  }
  return 'Write all natural-language output fields in Korean.';
};

const callOpenAI = async (systemPrompt, userPrompt, env, outputLanguage = 'ko') => {
  const safeLanguage = normalizeOutputLanguage(outputLanguage);
  const languageInstruction = buildLanguageInstruction(safeLanguage);

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-5.4',
      input: [
        {
          role: 'system',
          content: `${systemPrompt}\n\n## Output language\n${languageInstruction}`
        },
        { role: 'user', content: userPrompt }
      ],
      text: { format: { type: 'json_object' } }
    })
  });

  if (!res.ok) {
    const failText = await res.text();
    throw new Error(`OpenAI API error: ${failText}`);
  }

  const data = await res.json();
  const raw =
    data?.output
      ?.find((item) => item?.type === 'message')
      ?.content?.find((c) => c?.type === 'output_text')
      ?.text;

  if (!raw) throw new Error('OpenAI response is empty.');
  return parseJsonSafe(raw, null);
};

const EXTRACT_SYSTEM = `You decompose a user prompt into atomic assignment requests.
Return JSON object only.

Task:
- Split the user prompt into request items.
- For each item return:
  - id: R1, R2, ...
  - request: original request text
  - type: group_similar | group_different | balance | exclude | include | custom
  - target_feature: referenced participant feature key (or empty string)
  - priority: must | prefer
  - is_relevant: true | false (false if unrelated to team assignment)

Output shape:
{"requests":[
  {
    "id":"R1",
    "request":"...",
    "type":"group_similar",
    "target_feature":"mbti",
    "priority":"must",
    "is_relevant":true
  }
]}`;

const callExtract = async ({ customPrompt, env, outputLanguage = 'ko' }) => {
  return callOpenAI(EXTRACT_SYSTEM, customPrompt, env, outputLanguage);
};

const ANALYZE_SYSTEM = `You analyze decomposed requests against participant data.
Return JSON object only.
Do not assign teams in this stage.

Task:
1) individual_analysis
- For each request_id, analyze groups and distribution by related feature.
2) cross_analysis
- Identify conflicts among requests.
- Identify member tags useful for satisfying multiple requests together.`;

const callAnalyze = async ({ requests, participants, env, outputLanguage = 'ko' }) => {
  const userPrompt = [
    '# REQUESTS',
    JSON.stringify(requests || []),
    '',
    '# PARTICIPANTS',
    JSON.stringify(
      (participants || []).map((p) => ({
        id: p.id,
        name: p.name || p.displayName,
        features: p.features || {}
      }))
    )
  ].join('\n');

  return callOpenAI(ANALYZE_SYSTEM, userPrompt, env, outputLanguage);
};

const buildSlotTemplate = (sizes) =>
  sizes.map((s, i) => `Team ${i + 1} (${s} members): [${Array(s).fill('_').join(', ')}]`).join('\n');

const buildSlotReminder = (sizes) =>
  sizes.map((s, i) => `team_${i + 1}: exactly ${s} members`).join('\n');

const buildOutputSchema = (sizes) => {
  const schema = {};
  sizes.forEach((s, i) => {
    schema[`team_${i + 1}`] = { members: Array(s).fill('participant_id') };
  });
  schema.checklist = [
    {
      item: 'original request',
      status: 'full|partial|unmet',
      detail: '1-2 sentence background explanation'
    }
  ];
  return schema;
};

const ASSIGN_SYSTEM = `You assign participants to fixed team slots using extracted requests and analysis.
Return JSON object only.

Rules:
1) Prioritize requests with priority=must.
2) Respect cross_analysis conflicts and member_tags.
3) Fill every team slot exactly.
4) Use each participant id exactly once.
5) Do not create/delete teams or change team sizes.

Checklist output rules:
- Include every request item.
- For each checklist item return:
  - item
  - status: full | partial | unmet
  - detail: short background explanation (1-2 sentences)
- Do not return evidence field.`;

const callAssign = async ({
  customPrompt = '',
  requests,
  analysis,
  participants,
  targetTeamSizes,
  teamSize,
  env,
  outputLanguage = 'ko'
}) => {
  const slotTemplate = buildSlotTemplate(targetTeamSizes);
  const slotReminder = buildSlotReminder(targetTeamSizes);
  const schema = buildOutputSchema(targetTeamSizes);
  const allRequests = requests || [];

  const userPrompt = [
    '# [1] TEAM SLOTS',
    slotTemplate,
    `Total participants: ${participants.length} / Total teams: ${targetTeamSizes.length} / Base team size: ${teamSize}`,
    '',
    '# [2] USER_PROMPT',
    String(customPrompt || '').trim(),
    '',
    '# [3] REQUESTS',
    JSON.stringify(allRequests),
    '',
    '# [4] ANALYSIS',
    JSON.stringify(analysis || {}),
    '',
    '# [5] PARTICIPANTS',
    JSON.stringify(participants || []),
    '',
    '# [6] RULES + SLOT REMINDER',
    '- Each team members length must exactly match slot size.',
    '- Every participant id must be used exactly once (no duplicate, no missing).',
    '- Do not add/remove teams or change team size.',
    '',
    '## SLOT REMINDER',
    slotReminder,
    '',
    '# [7] OUTPUT_SCHEMA',
    JSON.stringify(schema)
  ].join('\n');

  return callOpenAI(ASSIGN_SYSTEM, userPrompt, env, outputLanguage);
};

export {
  detectPromptLanguage,
  normalizeOutputLanguage,
  callExtract,
  callAnalyze,
  callAssign
};
