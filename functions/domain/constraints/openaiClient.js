import { parseJsonSafe } from '../../shared/text.js';

const OPENAI_URL = 'https://api.openai.com/v1/responses';

/* ??? 怨듯넻 ?ы띁 ??? */

const callOpenAI = async (systemPrompt, userPrompt, env) => {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      input: [
        { role: 'system', content: systemPrompt },
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
    data?.output?.find((item) => item?.type === 'message')?.content?.find((c) => c?.type === 'output_text')?.text;
  if (!raw) throw new Error('OpenAI response is empty.');
  return parseJsonSafe(raw, null);
};

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   1?④퀎: ?꾨＼?꾪듃 遺꾪빐 (callExtract)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/

const EXTRACT_SYSTEM = `?덈뒗 ?ъ슜???꾨＼?꾪듃瑜?遺꾩꽍?섏뿬 媛쒕퀎 ?붿껌?쇰줈 遺꾪빐?섎뒗 遺꾩꽍湲곕떎.
JSON object留?諛섑솚?섎씪.
?ъ슜???꾨＼?꾪듃? 媛숈? ?몄뼱濡??묒꽦?섎씪.

## ?묒뾽
?ъ슜???꾨＼?꾪듃瑜?媛쒕퀎 ?붿껌(request)?쇰줈 遺꾪빐?섎씪.
媛??붿껌?????
- id: R1, R2, ... ?쒖꽌
- request: ?붿껌 ?먮Ц (?ъ슜?먭? ??洹몃?濡? ??臾몄옣)
- type: group_similar | group_different | balance | exclude | include | custom
- target_feature: ???붿껌??李몄“?섎뒗 李멸????띿꽦 (?? mbti, gender, age). ?놁쑝硫?鍮?臾몄옄??
- priority: must | prefer (? 諛곗젙??吏곸젒???곹뼢 = must, 媛?ν븯硫?= prefer)
- is_relevant: true | false (? 諛곗젙怨?臾닿????붿껌?대㈃ false)

## few-shot ?덉떆
?낅젰: "?ㅻ뒛 ?좎뵪 ?대븣? MBTI 鍮꾩듂???щ엺?쇰━ ? 吏쒖＜怨??깅퉬??留욎떠以?
異쒕젰:
{"requests":[
  {"id":"R1","request":"?ㅻ뒛 ?좎뵪 ?대븣?","type":"custom","target_feature":"","priority":"prefer","is_relevant":false},
  {"id":"R2","request":"MBTI 鍮꾩듂???щ엺?쇰━ ? 諛곗튂","type":"group_similar","target_feature":"mbti","priority":"must","is_relevant":true},
  {"id":"R3","request":"?깅퉬瑜?洹좊벑?섍쾶 留욎떠以?,"type":"balance","target_feature":"gender","priority":"prefer","is_relevant":true}
]}`;

const callExtract = async ({ customPrompt, env }) => {
  return callOpenAI(EXTRACT_SYSTEM, customPrompt, env);
};

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   2?④퀎: ?곗씠??遺꾩꽍 (callAnalyze)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/

const ANALYZE_SYSTEM = `?덈뒗 遺꾪빐???붿껌怨?李멸????곗씠?곕? 援먯감 遺꾩꽍?섎뒗 遺꾩꽍媛??
JSON object留?諛섑솚?섎씪.
?ъ슜???꾨＼?꾪듃? 媛숈? ?몄뼱濡??묒꽦?섎씪.

## ?묒뾽
1. individual_analysis: 媛??붿껌蹂꾨줈 李멸????곗씠?곕? 遺꾩꽍?섎씪.
   - request_id, groups (?대떦 feature 湲곗? 洹몃９??, distribution (遺꾪룷)
2. cross_analysis: 蹂듭닔 ?붿껌 媛?援먯감 遺꾩꽍.
   - conflicts: ?대뼡 ?붿껌?쇰━ ?곸땐?섎뒗吏, ???곸땐?섎뒗吏
   - member_tags: 蹂듭닔 ?붿껌???숈떆??留뚯”?쒗궗 ?듭떖 ?몄썝 ?앸퀎

? 諛곗젙? ?섏? 留덈씪. 遺꾩꽍留??섑뻾?섎씪.`;

const callAnalyze = async ({ requests, participants, env }) => {
  const userPrompt = [
    '# REQUESTS (1?④퀎?먯꽌 遺꾪빐???붿껌)',
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   3?④퀎: ?щ’ 諛곗젙 (callAssign)
   ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/

const buildSlotTemplate = (sizes) =>
  sizes.map((s, i) => `Team ${i + 1} (${s}紐?: [${Array(s).fill('_').join(', ')}]`).join('\n');

const buildSlotReminder = (sizes) =>
  sizes.map((s, i) => `team_${i + 1}: ?뺥솗??${s}紐?).join('\n');

const buildOutputSchema = (sizes) => {
  const schema = {};
  sizes.forEach((s, i) => {
    schema[`team_${i + 1}`] = { members: Array(s).fill('participant_id') };
  });
  schema.checklist = [
    {
      item: '?붿껌 ?먮Ц',
      status: 'full|partial|unmet',
      detail: '?붿껌 諛섏쁺 寃곌낵瑜?1~2臾몄옣?쇰줈 ?ㅻ챸',
    }
  ];
  return schema;
};

const ASSIGN_SYSTEM = `?덈뒗 遺꾩꽍 寃곌낵瑜?諛뷀깢?쇰줈 ? ?щ’??李멸??먮? 諛곗튂?섎뒗 諛곗젙?먮떎.
JSON object留?諛섑솚?섎씪.
?ъ슜???꾨＼?꾪듃? 媛숈? ?몄뼱濡??묒꽦?섎씪.

## 諛곗튂 ?꾨왂
1. priority媛 must???붿껌??癒쇱? 諛섏쁺?섎씪.
2. ANALYSIS??cross_analysis.member_tags?먯꽌 ?듭떖 ?몄썝???뺤씤?섍퀬, ?대떦 ?몄썝遺??癒쇱? 諛곗튂?섎씪.
   ANALYSIS??cross_analysis.conflicts瑜??뺤씤?섍퀬 諛섎뱶??怨좊젮?섎씪.
   ANALYSIS瑜?臾댁떆?섍퀬 ?먯껜 ?먮떒?쇰줈 諛곗튂?섏? 留덈씪.
3. individual_analysis??groups瑜?湲곗??쇰줈 ?섎㉧吏 ?몄썝??梨꾩슦??

## ?щ’ 遺덉씪移?泥섎━
- ?좎궗 洹몃９ > ?щ’ ?ш린: ?щ’ ?ш린留뚰겮留?諛곗튂. ?섎㉧吏???좎궗 洹몃９??媛??留롮? ?ㅻⅨ ???諛곗튂.
- ?좎궗 洹몃９ < ?щ’ ?ш린: ?대떦 洹몃９ ?꾩썝 諛곗튂 ?? 鍮덉옄由щ뒗 媛???좎궗??洹몃９??硫ㅻ쾭濡?梨꾩?.
- 蹂듭닔 ?붿껌 ?곸땐 ?? must ?곗꽑 諛섏쁺.

## 異쒕젰 ?뺤떇
1. checklist: REQUESTS??紐⑤뱺 ??ぉ(is_relevant: false ?ы븿)??????꾨옒 ?꾨뱶瑜??묒꽦.
   - item: ?붿껌 ?먮Ц
   - status: full / partial / unmet
   - detail: ?붿껌 諛섏쁺 寃곌낵瑜?1~2臾몄옣?쇰줈 ?ㅻ챸

## 異쒕젰 ???먭린 寃利?- 媛?team_N.members 諛곗뿴 湲몄씠媛 ?щ’ ?ш린? ?쇱튂?섎뒗吏 ?뺤씤.
- 紐⑤뱺 李멸???id媛 ?뺥솗??1???ъ슜?섏뿀?붿? ?뺤씤.`;

const callAssign = async ({
  customPrompt = '',
  requests, analysis, participants, targetTeamSizes, teamSize, env
}) => {
  const slotTemplate = buildSlotTemplate(targetTeamSizes);
  const slotReminder = buildSlotReminder(targetTeamSizes);
  const schema = buildOutputSchema(targetTeamSizes);
  const allRequests = requests || [];

  const userPrompt = [
    '# [1] TEAM SLOTS (??? ?덉뿉??諛곗튂?섎씪)',
    slotTemplate,
    `珥?李멸??? ${participants.length}紐?/ 珥??: ${targetTeamSizes.length}媛?/ ???湲곗? ?몄썝: ${teamSize}紐?,
    '',
    '# [2] USER_PROMPT (?먮Ц)',
    String(customPrompt || '').trim(),
    '',
    '# [3] REQUESTS (遺꾪빐???붿껌 ??is_relevant: false ?ы븿)',
    JSON.stringify(allRequests),
    '',
    '# [4] ANALYSIS (2?④퀎 遺꾩꽍 寃곌낵)',
    JSON.stringify(analysis),
    '',
    '# [5] PARTICIPANTS',
    JSON.stringify(participants),
    '',
    '# [6] RULES + SLOT REMINDER',
    '- 媛????members 諛곗뿴 ?먯냼 ?섎뒗 ?대떦 ?щ’ ?ш린? ?뺥솗???쇱튂?댁빞 ?쒕떎.',
    '- 紐⑤뱺 李멸???id瑜??뺥솗??1???ъ슜??寃? 以묐났/?꾨씫 遺덇?.',
    '- ???異붽??섍굅????젣?섍굅???ш린瑜?蹂寃쏀븯吏 留?寃?',
    '',
    '## SLOT REMINDER (?ㅼ떆 ?쒕쾲 ?뺤씤)',
    slotReminder,
    '',
    '# [7] OUTPUT_SCHEMA',
    JSON.stringify(schema)
  ].join('\n');

  return callOpenAI(ASSIGN_SYSTEM, userPrompt, env);
};

export { callExtract, callAnalyze, callAssign };

