import { parseJsonSafe, trimText, norm } from '../../shared/text.js';
import {
  inferPriority,
  resolvePriority,
  toSafeNumber,
  parseCountToken,
  splitEntityList,
  normalizeConstraintType,
  inferGender,
  findGenderFeatureKey,
  resolveAttributeKey,
  resolveAttributeKeyByValue
} from './common.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const callOpenAIConstraintParser = async ({ customPrompt, participants, env }) => {
  const prompt = [
    '역할: 너는 팀빌딩 제약 해석기다.',
    '목표: 사용자 요청을 최대한 보존하고 구조화한다.',
    '원칙: 모호/충돌/검증불가 요청을 버리지 말고 반드시 별도 항목으로 남긴다.',
    '사용자 프롬프트를 제약 JSON으로 변환하라.',
    '지원 타입: min_per_team, max_per_team, same_team, separate_team, balance, soft_objective, ambiguity_note, raw_request',
    'soft_objective 예시: {"type":"soft_objective","mode":"within_team_diversity|within_team_similarity|across_team_spread|custom","attribute":"성향","value":"리더","weight":3,"rawText":"..."}',
    'ambiguity_note 예시: {"type":"ambiguity_note","reason":"이름 중복으로 특정 불가","rawText":"..."}',
    '중요: 해석이 애매하거나 서버가 강제 검증하기 어려운 요청은 반드시 raw_request로 보존하라.',
    '반환: {"constraints":[...]} JSON만 출력',
    `프롬프트: ${customPrompt || ''}`,
    `참가자 이름 목록(JSON): ${JSON.stringify((participants || []).map((p) => p.displayName).slice(0, 200))}`
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
        { role: 'system', content: '너는 제약 파서다. 반드시 JSON 객체만 출력한다.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0
    })
  });

  if (!res.ok) {
    const failText = await res.text();
    throw new Error(`Constraint parse API 오류: ${failText}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  const parsed = parseJsonSafe(raw, {});
  return Array.isArray(parsed?.constraints) ? parsed.constraints : [];
};

const ruleBasedParseConstraints = (customPrompt) => {
  const text = String(customPrompt || '').trim();
  if (!text) return [];

  const constraints = [];
  const samePattern = /([^\s,，.]{1,30})\s*(?:와|과|랑|하고)\s*([^\s,，.]{1,30})\s*(?:는|은)?\s*(?:같(?:은)?\s*팀|한\s*팀|같이\s*배정)/gi;
  const separatePattern = /([^\s,，.]{1,30})\s*(?:와|과|랑|하고)\s*([^\s,，.]{1,30})\s*(?:는|은)?\s*(?:서로\s*)?(?:다른\s*팀|분리|떼어|같은\s*팀\s*금지|같이\s*두지\s*말아)/gi;

  let m = samePattern.exec(text);
  while (m) {
    constraints.push({ type: 'same_team', entities: [m[1], m[2]], rawText: m[0], priority: inferPriority(m[0], '') });
    m = samePattern.exec(text);
  }

  m = separatePattern.exec(text);
  while (m) {
    constraints.push({ type: 'separate_team', entities: [m[1], m[2]], rawText: m[0], priority: inferPriority(m[0], '') });
    m = separatePattern.exec(text);
  }

  const sameGroupPattern = /([^.\n]{3,160})\s*(?:는|은)?\s*(?:같(?:은)?\s*팀|한\s*팀|같이\s*배정)/gi;
  m = sameGroupPattern.exec(text);
  while (m) {
    const entities = splitEntityList(m[1]).slice(0, 6);
    if (entities.length >= 3) {
      for (let i = 0; i < entities.length - 1; i += 1) {
        constraints.push({ type: 'same_team', entities: [entities[i], entities[i + 1]], rawText: m[0], priority: inferPriority(m[0], '') });
      }
    }
    m = sameGroupPattern.exec(text);
  }

  const separateGroupPattern = /([^.\n]{3,160})\s*(?:는|은)?\s*(?:서로\s*)?(?:다른\s*팀|분리|떼어|같은\s*팀\s*금지)/gi;
  m = separateGroupPattern.exec(text);
  while (m) {
    const entities = splitEntityList(m[1]).slice(0, 6);
    if (entities.length >= 2) {
      for (let i = 0; i < entities.length - 1; i += 1) {
        constraints.push({ type: 'separate_team', entities: [entities[i], entities[i + 1]], rawText: m[0], priority: inferPriority(m[0], '') });
      }
    }
    m = separateGroupPattern.exec(text);
  }

  const countToken = '(\\d+|한|하나|두|둘|세|셋|네|넷|다섯|여섯|일곱|여덟|아홉|열)';
  const teamToken = '(각\\s*팀|팀마다|팀당|한\\s*팀)';
  const valueToken = '([^,，.\\n]{1,40}?)';

  const sanitizeValue = (v) =>
    trimText(String(v || '').replace(/\s*(인원|사람|을|를|은|는|이|가)\s*$/g, '').trim(), 40);

  const minPattern = new RegExp(`${teamToken}\\s*(?:에|은)?\\s*${valueToken}\\s*${countToken}\\s*명\\s*(?:은|는)?\\s*(?:이상|최소|적어도|꼭|반드시|있어야)`, 'gi');
  m = minPattern.exec(text);
  while (m) {
    const n = parseCountToken(m[3]);
    if (!Number.isFinite(n)) {
      m = minPattern.exec(text);
      continue;
    }
    const valueText = sanitizeValue(m[2]);
    constraints.push({
      type: 'min_per_team',
      attribute: /^(남자|남성|여자|여성|male|female)$/i.test(valueText) ? '성별' : 'auto',
      value: /여|female/i.test(valueText) ? 'female' : /남|male/i.test(valueText) ? 'male' : valueText,
      min: n,
      rawText: m[0],
      priority: inferPriority(m[0], '')
    });
    m = minPattern.exec(text);
  }

  const minPatternAlt = new RegExp(`${teamToken}\\s*(?:에|은)?\\s*${valueToken}\\s*(?:최소|적어도)\\s*${countToken}\\s*명`, 'gi');
  m = minPatternAlt.exec(text);
  while (m) {
    const n = parseCountToken(m[3]);
    if (!Number.isFinite(n)) {
      m = minPatternAlt.exec(text);
      continue;
    }
    const valueText = sanitizeValue(m[2]);
    constraints.push({
      type: 'min_per_team',
      attribute: /^(남자|남성|여자|여성|male|female)$/i.test(valueText) ? '성별' : 'auto',
      value: /여|female/i.test(valueText) ? 'female' : /남|male/i.test(valueText) ? 'male' : valueText,
      min: n,
      rawText: m[0],
      priority: inferPriority(m[0], '')
    });
    m = minPatternAlt.exec(text);
  }

  const minPatternReverse = new RegExp(`${valueToken}\\s*${countToken}\\s*명\\s*(?:씩\\s*)?(?:각\\s*팀|팀마다|팀당|한\\s*팀)\\s*(?:에|은)?\\s*(?:이상|최소|적어도|꼭|반드시)`, 'gi');
  m = minPatternReverse.exec(text);
  while (m) {
    const n = parseCountToken(m[2]);
    if (!Number.isFinite(n)) {
      m = minPatternReverse.exec(text);
      continue;
    }
    const valueText = sanitizeValue(m[1]);
    constraints.push({
      type: 'min_per_team',
      attribute: /^(남자|남성|여자|여성|male|female)$/i.test(valueText) ? '성별' : 'auto',
      value: /여|female/i.test(valueText) ? 'female' : /남|male/i.test(valueText) ? 'male' : valueText,
      min: n,
      rawText: m[0],
      priority: inferPriority(m[0], '')
    });
    m = minPatternReverse.exec(text);
  }

  const minPatternReverseEach = new RegExp(`${valueToken}\\s*${countToken}\\s*명\\s*씩\\s*(?:각\\s*팀|팀마다|팀당|한\\s*팀)`, 'gi');
  m = minPatternReverseEach.exec(text);
  while (m) {
    const n = parseCountToken(m[2]);
    if (!Number.isFinite(n)) {
      m = minPatternReverseEach.exec(text);
      continue;
    }
    const valueText = sanitizeValue(m[1]);
    constraints.push({
      type: 'min_per_team',
      attribute: /^(남자|남성|여자|여성|male|female)$/i.test(valueText) ? '성별' : 'auto',
      value: /여|female/i.test(valueText) ? 'female' : /남|male/i.test(valueText) ? 'male' : valueText,
      min: n,
      rawText: m[0],
      priority: inferPriority(m[0], '')
    });
    m = minPatternReverseEach.exec(text);
  }

  const maxPattern = new RegExp(`${teamToken}\\s*(?:에|은)?\\s*${valueToken}\\s*${countToken}\\s*명\\s*(?:이하|최대|넘지\\s*않게)`, 'gi');
  m = maxPattern.exec(text);
  while (m) {
    const n = parseCountToken(m[3]);
    if (!Number.isFinite(n)) {
      m = maxPattern.exec(text);
      continue;
    }
    const valueText = sanitizeValue(m[2]);
    constraints.push({
      type: 'max_per_team',
      attribute: /^(남자|남성|여자|여성|male|female)$/i.test(valueText) ? '성별' : 'auto',
      value: /여|female/i.test(valueText) ? 'female' : /남|male/i.test(valueText) ? 'male' : valueText,
      max: n,
      rawText: m[0],
      priority: inferPriority(m[0], '')
    });
    m = maxPattern.exec(text);
  }

  const maxPatternAlt = new RegExp(`${teamToken}\\s*(?:에|은)?\\s*${valueToken}\\s*(?:최대)\\s*${countToken}\\s*명`, 'gi');
  m = maxPatternAlt.exec(text);
  while (m) {
    const n = parseCountToken(m[3]);
    if (!Number.isFinite(n)) {
      m = maxPatternAlt.exec(text);
      continue;
    }
    const valueText = sanitizeValue(m[2]);
    constraints.push({
      type: 'max_per_team',
      attribute: /^(남자|남성|여자|여성|male|female)$/i.test(valueText) ? '성별' : 'auto',
      value: /여|female/i.test(valueText) ? 'female' : /남|male/i.test(valueText) ? 'male' : valueText,
      max: n,
      rawText: m[0],
      priority: inferPriority(m[0], '')
    });
    m = maxPatternAlt.exec(text);
  }

  const maxPatternReverse = new RegExp(`${valueToken}\\s*${countToken}\\s*명\\s*(?:씩\\s*)?(?:각\\s*팀|팀마다|팀당|한\\s*팀)\\s*(?:에|은)?\\s*(?:이하|최대|넘지\\s*않게)`, 'gi');
  m = maxPatternReverse.exec(text);
  while (m) {
    const n = parseCountToken(m[2]);
    if (!Number.isFinite(n)) {
      m = maxPatternReverse.exec(text);
      continue;
    }
    const valueText = sanitizeValue(m[1]);
    constraints.push({
      type: 'max_per_team',
      attribute: /^(남자|남성|여자|여성|male|female)$/i.test(valueText) ? '성별' : 'auto',
      value: /여|female/i.test(valueText) ? 'female' : /남|male/i.test(valueText) ? 'male' : valueText,
      max: n,
      rawText: m[0],
      priority: 'hard'
    });
    m = maxPatternReverse.exec(text);
  }

  const maxByNegation = new RegExp(`${teamToken}\\s*(?:에|은)?\\s*${valueToken}\\s*${countToken}\\s*명\\s*이상\\s*넣지\\s*말`, 'gi');
  m = maxByNegation.exec(text);
  while (m) {
    const n = parseCountToken(m[3]);
    if (!Number.isFinite(n)) {
      m = maxByNegation.exec(text);
      continue;
    }
    const valueText = sanitizeValue(m[2]);
    constraints.push({
      type: 'max_per_team',
      attribute: /^(남자|남성|여자|여성|male|female)$/i.test(valueText) ? '성별' : 'auto',
      value: /여|female/i.test(valueText) ? 'female' : /남|male/i.test(valueText) ? 'male' : valueText,
      max: Math.max(0, n - 1),
      rawText: m[0],
      priority: inferPriority(m[0], '')
    });
    m = maxByNegation.exec(text);
  }

  const eachPattern = new RegExp(`${valueToken}\\s*(?:가|은|는|을|를)?\\s*(?:각\\s*팀|팀마다|팀당)\\s*(?:에|은)?\\s*(하나|한|1)\\s*씩`, 'gi');
  m = eachPattern.exec(text);
  while (m) {
    const valueText = sanitizeValue(m[1]);
    constraints.push({
      type: 'min_per_team',
      attribute: /^(남자|남성|여자|여성|male|female)$/i.test(valueText) ? '성별' : 'auto',
      value: /여|female/i.test(valueText) ? 'female' : /남|male/i.test(valueText) ? 'male' : valueText,
      min: 1,
      rawText: m[0],
      priority: inferPriority(m[0], '')
    });
    m = eachPattern.exec(text);
  }

  if (/성비|성별.*균형|gender.*balance|최대한.*균형|남녀\s*비율|남녀.*맞춰/.test(text)) {
    constraints.push({ type: 'balance', attribute: '성별', rawText: '성비 균형', priority: inferPriority(text, 'soft') });
  }

  const diversityAttrMatch = text.match(/(성향|mbti|전공|학과|직무|역할|경력|학년).{0,10}(다양|골고루|섞|편중되지\s*않게)/i);
  if (diversityAttrMatch) {
    constraints.push({
      type: 'soft_objective',
      mode: 'within_team_diversity',
      attribute: diversityAttrMatch[1],
      weight: 3,
      priority: 'soft',
      rawText: diversityAttrMatch[0]
    });
  } else if (/(다양|골고루|섞|편중되지\s*않게)/i.test(text)) {
    constraints.push({
      type: 'soft_objective',
      mode: 'within_team_diversity',
      attribute: 'auto',
      weight: 2,
      priority: 'soft',
      rawText: '다양성/혼합 최대화'
    });
  }

  if (/(비슷한|유사한).{0,14}(같은\s*팀|한\s*팀|묶)/i.test(text)) {
    constraints.push({
      type: 'soft_objective',
      mode: 'within_team_similarity',
      attribute: 'auto',
      weight: 2,
      priority: 'soft',
      rawText: '유사한 사람끼리 묶기'
    });
  }

  const spreadValueMatch = text.match(/([^\s,，.]{1,20})\s*(?:는|은|을|를)?\s*(분산|골고루|퍼뜨려|쏠리지\s*않게)/i);
  if (spreadValueMatch) {
    constraints.push({
      type: 'soft_objective',
      mode: 'across_team_spread',
      attribute: 'auto',
      value: spreadValueMatch[1],
      weight: 3,
      priority: 'soft',
      rawText: spreadValueMatch[0]
    });
  }

  const lines = text
    .split(/[\n.;]+/g)
    .map((x) => x.trim())
    .filter((x) => x.length >= 6)
    .slice(0, 10);
  for (const line of lines) {
    if (constraints.some((c) => line.includes(c.rawText || ''))) continue;
    if (/해줘|해주세요|바람|원해|원합니다|고려|반영|우선|가능하면|되도록|최대한|좋겠어/.test(line)) {
      constraints.push({ type: 'raw_request', rawText: line, priority: inferPriority(line, '') });
    }
  }

  return constraints;
};

const normalizeConstraints = ({ rawConstraints, participants }) => {
  const nameIndex = new Map();
  for (const p of participants || []) {
    const key = norm(p.displayName || p.id);
    if (!nameIndex.has(key)) nameIndex.set(key, []);
    nameIndex.get(key).push(p.id);
  }

  const genderKey = findGenderFeatureKey(participants);
  const list = [];
  let seq = 1;

  for (const raw of rawConstraints || []) {
    const type = normalizeConstraintType(raw?.type);
    if (!type) continue;

    const c = {
      id: `c${seq++}`,
      type,
      priority: resolvePriority(raw),
      rawText: trimText(raw?.rawText || '', 120)
    };

    if (type === 'same_team' || type === 'separate_team') {
      const entities = Array.isArray(raw?.entities) ? raw.entities.slice(0, 2).map((x) => trimText(x, 80)) : [];
      if (entities.length !== 2 || !entities[0] || !entities[1]) continue;
      const idsA = nameIndex.get(norm(entities[0])) || [];
      const idsB = nameIndex.get(norm(entities[1])) || [];
      list.push({ ...c, entities, resolved: { idsA, idsB, status: idsA.length === 1 && idsB.length === 1 ? 'resolved' : 'not_verifiable' } });
      continue;
    }

    if (type === 'min_per_team' || type === 'max_per_team') {
      const attribute = trimText(raw?.attribute || '', 80) || '성별';
      const valueCandidate = raw?.value === 'female' ? 'female' : raw?.value === 'male' ? 'male' : trimText(raw?.value || '', 50);
      let attributeKey = resolveAttributeKey(participants, attribute);
      if (!attributeKey && valueCandidate) attributeKey = resolveAttributeKeyByValue(participants, valueCandidate);
      const isGenderAttribute = attributeKey && norm(attributeKey) === norm(genderKey);
      const genderValue = valueCandidate === 'female' || inferGender(valueCandidate) === 'female' ? 'female' : 'male';
      const normalizedValue = isGenderAttribute ? genderValue : trimText(valueCandidate || '', 50);
      const numeric = type === 'min_per_team' ? Number(raw?.min) : Number(raw?.max);
      if (!Number.isFinite(numeric) || numeric < 0) continue;

      list.push({
        ...c,
        attribute,
        attributeKey,
        value: normalizedValue,
        [type === 'min_per_team' ? 'min' : 'max']: Math.floor(numeric)
      });
      continue;
    }

    if (type === 'balance') {
      const attribute = trimText(raw?.attribute || '', 80) || '성별';
      const attributeKey = resolveAttributeKey(participants, attribute);
      list.push({ ...c, attribute, attributeKey: attributeKey || genderKey });
      continue;
    }

    if (type === 'soft_objective') {
      const mode = trimText(raw?.mode || 'custom', 40) || 'custom';
      const attribute = trimText(raw?.attribute || 'auto', 80) || 'auto';
      const value = trimText(raw?.value || '', 80);
      let attributeKey = '';
      if (attribute && norm(attribute) !== 'auto') attributeKey = resolveAttributeKey(participants, attribute);
      if (!attributeKey && value) attributeKey = resolveAttributeKeyByValue(participants, value);
      list.push({
        ...c,
        mode,
        attribute,
        attributeKey,
        value,
        weight: Math.max(1, Math.min(5, Math.floor(toSafeNumber(raw?.weight, 2)))),
        instruction: trimText(raw?.instruction || raw?.rawText || '', 220)
      });
      continue;
    }

    if (type === 'ambiguity_note') {
      const reason = trimText(raw?.reason || '', 180) || '요청 해석이 모호합니다.';
      list.push({ ...c, reason, rawText: trimText(raw?.rawText || reason, 140) });
      continue;
    }

    if (type === 'raw_request') {
      const instruction = trimText(raw?.instruction || raw?.rawText || '', 220);
      if (!instruction) continue;
      list.push({ ...c, instruction, rawText: instruction });
    }
  }

  return list;
};

const collectUnsupportedConstraints = (rawConstraints) =>
  (rawConstraints || [])
    .filter((raw) => !normalizeConstraintType(raw?.type))
    .map((raw, idx) => ({
      id: `u${idx + 1}`,
      type: trimText(raw?.type || 'unknown', 60),
      rawText: trimText(raw?.rawText || JSON.stringify(raw || {}), 140)
    }));


export {
  callOpenAIConstraintParser,
  ruleBasedParseConstraints,
  normalizeConstraints,
  collectUnsupportedConstraints
};


