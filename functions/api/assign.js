const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_INTRO = 260;
const MAX_FEATURES = 12;
const MAX_FEATURE_VALUE = 120;
const GENDER_KEY_ALIASES = ['성별', 'gender', 'sex', 'male/female', '남녀'];
const MALE_ALIASES = ['남', '남자', '남성', 'male', 'm'];
const FEMALE_ALIASES = ['여', '여자', '여성', 'female', 'f'];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });

const parseJsonSafe = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const trimText = (v, max = 120) => String(v || '').trim().slice(0, max);
const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, '');

const compactFeatures = (features) => {
  const entries = Object.entries(features || {}).slice(0, MAX_FEATURES);
  return Object.fromEntries(entries.map(([k, v]) => [trimText(k, 80), trimText(v, MAX_FEATURE_VALUE)]));
};

const compactParticipant = (p, index) => {
  const id = String(p.internalId || p.id || `participant-${index + 1}`).trim();
  return {
    id,
    displayName: trimText(p.originalName || p.name || id, 120),
    intro: trimText(p.intro || '', MAX_INTRO),
    features: compactFeatures(p.features || {}),
    identifierKey: trimText(p.identifierKey || '', 80)
  };
};

const getPolarBaseUrl = (env) => {
  const mode = String(env.POLAR_ENV || 'production').toLowerCase();
  return mode === 'sandbox' ? 'https://sandbox-api.polar.sh/v1' : 'https://api.polar.sh/v1';
};

const getPolarToken = (env) => env.POLAR_ACCESS_TOKEN || env.POLAR_API_KEY;

const isPaidStatus = (status) => {
  const s = String(status || '').toLowerCase();
  return s === 'succeeded' || s === 'paid';
};

const normalizeCheckout = (data) => {
  if (!data || typeof data !== 'object') return null;
  if (data.id || data.status) return data;
  if (data.data && (data.data.id || data.data.status)) return data.data;
  return data;
};

const verifyPaidCheckout = async ({ checkoutId, env }) => {
  const token = getPolarToken(env);
  if (!token) throw new Error('POLAR_ACCESS_TOKEN이 없습니다.');
  if (!checkoutId) throw new Error('checkout_id가 필요합니다.');

  const res = await fetch(`${getPolarBaseUrl(env)}/checkouts/${encodeURIComponent(checkoutId)}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || data?.error || '결제 상태 조회 실패');
  const checkout = normalizeCheckout(data);
  if (!isPaidStatus(checkout?.status)) throw new Error('결제가 완료되지 않았습니다.');
  return checkout;
};

const ensureUniqueIds = (participants) => {
  const seen = new Map();
  return participants.map((p) => {
    const base = String(p.id || '').trim() || `participant-${seen.size + 1}`;
    const next = (seen.get(base) || 0) + 1;
    seen.set(base, next);
    if (next === 1) return { ...p, id: base };
    return { ...p, id: `${base}__${next}` };
  });
};

const xmur3 = (str) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
};

const mulberry32 = (a) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const createSeededRandom = (seedText) => {
  const seedFn = xmur3(String(seedText || 'seed-default'));
  return mulberry32(seedFn());
};

const pickRandomIndex = (length, rand) => {
  const safeLength = Math.max(1, length);
  const n = typeof rand === 'function' ? rand() : Math.random();
  return Math.floor(n * safeLength);
};

const createSpreadTeams = (total, teamSize) => {
  const fullTeamCount = Math.floor(total / teamSize);
  return Math.max(1, fullTeamCount);
};

const buildBaseTeams = (participants, teamSize, remainderMode, rand) => {
  if (participants.length === 0) return [];

  if (remainderMode === 'keep_partial') {
    const total = participants.length;
    const fullTeamCount = Math.floor(total / teamSize);
    const remainder = total % teamSize;
    const numTeams = fullTeamCount + (remainder > 0 ? 1 : 0);

    const teams = Array.from({ length: Math.max(1, numTeams) }, (_, i) => ({
      id: i + 1,
      members: [],
      analysis: ''
    }));

    if (fullTeamCount === 0) {
      teams[0].members = participants;
      return teams;
    }

    const fullCapacity = fullTeamCount * teamSize;
    for (let i = 0; i < fullCapacity; i += 1) {
      teams[i % fullTeamCount].members.push(participants[i]);
    }

    for (let i = fullCapacity; i < total; i += 1) {
      teams[teams.length - 1].members.push(participants[i]);
    }

    return teams;
  }

  const total = participants.length;
  const fullTeamCount = createSpreadTeams(total, teamSize);
  const teams = Array.from({ length: fullTeamCount }, (_, i) => ({
    id: i + 1,
    members: [],
    analysis: ''
  }));

  const fullCapacity = fullTeamCount * teamSize;
  for (let i = 0; i < fullCapacity && i < total; i += 1) {
    teams[i % fullTeamCount].members.push(participants[i]);
  }

  for (let i = fullCapacity; i < total; i += 1) {
    const randomTeam = teams[pickRandomIndex(teams.length, rand)];
    randomTeam.members.push(participants[i]);
  }

  return teams;
};

const annotateTeams = (teams, reason = '') =>
  teams.map((team, index) => ({
    ...team,
    id: Number(team.id) > 0 ? Number(team.id) : index + 1,
    analysis: trimText(team.analysis || '', 220) || `${team.members.length}명 구성${reason ? ` / ${reason}` : ''}`
  }));

const inferPriority = (rawText, explicit) => {
  const e = norm(explicit);
  if (e === 'hard' || e === 'soft') return e;
  if (/반드시|꼭|무조건|must|required/.test(String(rawText || ''))) return 'hard';
  return 'soft';
};

const resolvePriority = (raw) => {
  const explicit = norm(raw?.priority);
  const source = norm(raw?.source || raw?.__source);
  if (explicit === 'hard' || explicit === 'soft') return explicit;
  // AI 100% 신뢰모드: AI가 우선순위를 주지 않으면 soft로 간주하고 서버 재판단을 하지 않는다.
  if (source === 'ai') return 'soft';
  return inferPriority(raw?.rawText, raw?.priority);
};

const toSafeNumber = (value, fallback = 1) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const parseCountToken = (token) => {
  const raw = String(token || '').trim().toLowerCase();
  if (!raw) return NaN;
  if (/^\d+$/.test(raw)) return Number(raw);
  const map = new Map([
    ['한', 1], ['하나', 1], ['한명', 1], ['1명', 1],
    ['두', 2], ['둘', 2], ['두명', 2], ['둘명', 2], ['2명', 2],
    ['세', 3], ['셋', 3], ['세명', 3], ['셋명', 3], ['3명', 3],
    ['네', 4], ['넷', 4], ['네명', 4], ['넷명', 4], ['4명', 4],
    ['다섯', 5], ['5명', 5],
    ['여섯', 6], ['6명', 6],
    ['일곱', 7], ['7명', 7],
    ['여덟', 8], ['8명', 8],
    ['아홉', 9], ['9명', 9],
    ['열', 10], ['10명', 10]
  ]);
  return map.has(raw) ? map.get(raw) : NaN;
};

const splitEntityList = (text) => {
  const cleaned = String(text || '')
    .replace(/\s*(?:는|은|이|가)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  const chunks = cleaned
    .split(/\s*(?:,|，|\/|·|및|그리고|와|과|랑|하고)\s*/g)
    .map((x) => trimText(x, 40).replace(/[()"'`]/g, '').trim())
    .filter(Boolean);
  return Array.from(new Set(chunks));
};

const normalizeConstraintType = (type) => {
  const t = norm(type);
  if (['same_team', 'sameteam', '같은팀'].includes(t)) return 'same_team';
  if (['separate_team', 'separateteam', '분리', 'differentteam'].includes(t)) return 'separate_team';
  if (['min_per_team', 'minperteam', '팀당최소'].includes(t)) return 'min_per_team';
  if (['max_per_team', 'maxperteam', '팀당최대'].includes(t)) return 'max_per_team';
  if (['balance', '균형'].includes(t)) return 'balance';
  if (['soft_objective', 'softobjective', '정성목표', '소프트목표'].includes(t)) return 'soft_objective';
  if (['ambiguity_note', 'ambiguitynote', '모호성노트'].includes(t)) return 'ambiguity_note';
  if (['raw_request', 'rawrequest', '자유요청', '기타요청'].includes(t)) return 'raw_request';
  return '';
};

const inferGender = (value) => {
  const v = norm(value);
  if (MALE_ALIASES.includes(v) || (/남/.test(v) && !/여/.test(v))) return 'male';
  if (FEMALE_ALIASES.includes(v) || (/여/.test(v) && !/남/.test(v))) return 'female';
  return 'unknown';
};

const findGenderFeatureKey = (participants) => {
  const scores = new Map();
  for (const p of participants || []) {
    for (const key of Object.keys(p.features || {})) {
      const nk = norm(key);
      let score = 0;
      for (const alias of GENDER_KEY_ALIASES) {
        const na = norm(alias);
        if (nk === na) score += 5;
        else if (nk.includes(na)) score += 2;
      }
      if (score > 0) scores.set(key, (scores.get(key) || 0) + score);
    }
  }
  if (scores.size === 0) return '';
  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0][0];
};

const resolveAttributeKey = (participants, attribute) => {
  const target = norm(attribute);
  if (!target) return '';
  if (['성별', 'gender', 'sex', '남녀'].some((k) => norm(k) === target)) {
    return findGenderFeatureKey(participants);
  }

  const keySet = new Set();
  for (const p of participants || []) {
    for (const key of Object.keys(p.features || {})) keySet.add(key);
  }
  for (const key of keySet) {
    if (norm(key) === target) return key;
  }
  for (const key of keySet) {
    if (norm(key).includes(target) || target.includes(norm(key))) return key;
  }
  return '';
};

const resolveAttributeKeyByValue = (participants, value) => {
  const targetValue = norm(value);
  if (!targetValue) return '';
  const scores = new Map();
  for (const p of participants || []) {
    for (const [key, raw] of Object.entries(p.features || {})) {
      const nv = norm(raw);
      if (!nv) continue;
      if (nv === targetValue) scores.set(key, (scores.get(key) || 0) + 5);
      else if (nv.includes(targetValue) || targetValue.includes(nv)) scores.set(key, (scores.get(key) || 0) + 1);
      const gender = inferGender(raw);
      if ((targetValue === '남' || targetValue === '남자' || targetValue === '남성' || targetValue === 'male') && gender === 'male') {
        scores.set(key, (scores.get(key) || 0) + 3);
      }
      if ((targetValue === '여' || targetValue === '여자' || targetValue === '여성' || targetValue === 'female') && gender === 'female') {
        scores.set(key, (scores.get(key) || 0) + 3);
      }
    }
  }
  if (scores.size === 0) return '';
  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0][0];
};

const matchConstraintValue = (member, constraint) => {
  const key = constraint.attributeKey;
  if (!key) return false;
  const raw = member?.features?.[key] || '';
  if (!raw) return false;
  if (constraint.value === 'male' || constraint.value === 'female') {
    return inferGender(raw) === constraint.value;
  }
  return norm(raw) === norm(constraint.value);
};

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

const evaluateFeasibility = ({ constraints, participants, teamCount }) =>
  constraints.map((c) => {
    if (c.type === 'min_per_team') {
      if (!c.attributeKey) {
        return { constraintId: c.id, status: 'not_verifiable', detail: `${c.attribute || '속성'} 열을 찾지 못했습니다.` };
      }
      const available = participants.filter((p) => matchConstraintValue(p, c)).length;
      const required = teamCount * c.min;
      if (available >= required) {
        return {
          constraintId: c.id,
          status: 'satisfied',
          required,
          available,
          shortage: 0,
          maxSatisfiableTeams: teamCount,
          unsatisfiedTeams: 0,
          detail: `사전 가능성 통과 (필요 ${required}, 실제 ${available})`
        };
      }
      const shortage = required - available;
      const maxSatisfiableTeams = c.min > 0 ? Math.floor(available / c.min) : teamCount;
      return {
        constraintId: c.id,
        status: 'impossible',
        required,
        available,
        shortage,
        maxSatisfiableTeams,
        unsatisfiedTeams: Math.max(0, teamCount - maxSatisfiableTeams),
        detail: `요청 충족 불가: 필요 ${required}, 실제 ${available}, 부족 ${shortage}`
      };
    }

    if (c.type === 'max_per_team') {
      if (!c.attributeKey) {
        return { constraintId: c.id, status: 'not_verifiable', detail: `${c.attribute || '속성'} 열을 찾지 못했습니다.` };
      }
      const available = participants.filter((p) => matchConstraintValue(p, c)).length;
      const maxPossible = teamCount * c.max;
      if (available <= maxPossible) {
        return {
          constraintId: c.id,
          status: 'satisfied',
          required: maxPossible,
          available,
          shortage: 0,
          maxSatisfiableTeams: teamCount,
          unsatisfiedTeams: 0,
          detail: `사전 가능성 통과 (허용 최대 ${maxPossible}, 실제 ${available})`
        };
      }
      return {
        constraintId: c.id,
        status: 'impossible',
        required: maxPossible,
        available,
        shortage: available - maxPossible,
        maxSatisfiableTeams: teamCount,
        unsatisfiedTeams: 0,
        detail: `요청 충족 불가: 허용 최대 ${maxPossible}, 실제 ${available}`
      };
    }

    if (c.type === 'same_team' || c.type === 'separate_team') {
      if (c.resolved?.status !== 'resolved') {
        return { constraintId: c.id, status: 'not_verifiable', detail: `이름 매칭 실패: ${(c.entities || []).join(', ')}` };
      }
      return { constraintId: c.id, status: 'satisfied', detail: '사전 가능성 통과' };
    }

    if (c.type === 'balance') {
      return c.attributeKey
        ? { constraintId: c.id, status: 'satisfied', detail: '사전 가능성 통과' }
        : { constraintId: c.id, status: 'not_verifiable', detail: `${c.attribute || '속성'} 열을 찾지 못했습니다.` };
    }

    if (c.type === 'raw_request') {
      return { constraintId: c.id, status: 'not_verifiable', detail: '자유 요청은 자동 검증 대상이 아니며 AI/리포트 참고 항목으로 처리됩니다.' };
    }

    if (c.type === 'soft_objective') {
      return { constraintId: c.id, status: 'satisfied', detail: '정성 목표는 점수 최적화 대상으로 반영됩니다.' };
    }

    if (c.type === 'ambiguity_note') {
      return { constraintId: c.id, status: 'not_verifiable', detail: c.reason || '요청 해석이 모호합니다.' };
    }

    return { constraintId: c.id, status: 'not_verifiable', detail: '지원되지 않는 제약' };
  });

const enforceMinPerTeamConstraints = (teams, constraints) => {
  const minConstraints = constraints.filter((c) => c.type === 'min_per_team' && c.attributeKey && c.priority === 'hard');
  if (minConstraints.length === 0) return teams;

  for (const c of minConstraints) {
    for (const team of teams) {
      const current = (team.members || []).filter((m) => matchConstraintValue(m, c)).length;
      let deficit = Math.max(0, c.min - current);
      while (deficit > 0) {
        const donor = teams.find((t) => (t.members || []).filter((m) => matchConstraintValue(m, c)).length > c.min);
        if (!donor) break;
        const donorMemberIndex = donor.members.findIndex((m) => matchConstraintValue(m, c));
        if (donorMemberIndex < 0) break;
        const [moved] = donor.members.splice(donorMemberIndex, 1);
        team.members.push(moved);
        deficit -= 1;
      }
    }
  }

  return teams;
};

const enforceMaxPerTeamConstraints = (teams, constraints) => {
  const maxConstraints = constraints.filter((c) => c.type === 'max_per_team' && c.attributeKey && c.priority === 'hard');
  if (maxConstraints.length === 0) return teams;

  for (const c of maxConstraints) {
    for (const team of teams) {
      let overflowMembers = (team.members || []).filter((m) => matchConstraintValue(m, c));
      while (overflowMembers.length > c.max) {
        const moving = overflowMembers.pop();
        const receiver = teams.find((t) => {
          if (t.id === team.id) return false;
          const current = (t.members || []).filter((m) => matchConstraintValue(m, c)).length;
          return current < c.max;
        });
        if (!receiver) break;
        const idx = team.members.findIndex((m) => m.id === moving.id);
        if (idx < 0) break;
        const [moved] = team.members.splice(idx, 1);
        receiver.members.push(moved);
        overflowMembers = (team.members || []).filter((m) => matchConstraintValue(m, c));
      }
    }
  }
  return teams;
};

const extractTokenSet = (member) => {
  const bag = [];
  const intro = String(member?.intro || '').toLowerCase();
  const featureValues = Object.values(member?.features || {}).map((v) => String(v || '').toLowerCase());
  bag.push(intro, ...featureValues);
  return new Set(
    bag
      .join(' ')
      .split(/[^a-z0-9가-힣]+/g)
      .map((x) => x.trim())
      .filter((x) => x.length >= 2)
      .slice(0, 120)
  );
};

const jaccard = (a, b) => {
  if (!a || !b || a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const uni = a.size + b.size - inter;
  return uni > 0 ? inter / uni : 0;
};

const averagePairSimilarity = (members) => {
  if (!Array.isArray(members) || members.length < 2) return 0;
  const tokenSets = members.map((m) => extractTokenSet(m));
  let sum = 0;
  let count = 0;
  for (let i = 0; i < tokenSets.length; i += 1) {
    for (let j = i + 1; j < tokenSets.length; j += 1) {
      sum += jaccard(tokenSets[i], tokenSets[j]);
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
};

const softObjectivePenalty = (constraint, teams) => {
  const weight = Math.max(1, Math.min(5, toSafeNumber(constraint.weight, 2)));
  const mode = norm(constraint.mode || 'custom');

  if (mode === 'withinteamdiversity' || mode === 'within_team_diversity') {
    if (constraint.attributeKey) {
      let penalty = 0;
      for (const team of teams) {
        const values = (team.members || [])
          .map((m) => trimText(m?.features?.[constraint.attributeKey] || '', 80))
          .filter(Boolean);
        if (values.length === 0) continue;
        const unique = new Set(values.map((v) => norm(v))).size;
        penalty += Math.max(0, values.length - unique);
      }
      return penalty * (weight * 4);
    }
    const avg = teams.length > 0 ? teams.reduce((s, t) => s + averagePairSimilarity(t.members || []), 0) / teams.length : 0;
    return avg * weight * 20;
  }

  if (mode === 'withinteamsimilarity' || mode === 'within_team_similarity') {
    if (constraint.attributeKey) {
      let penalty = 0;
      for (const team of teams) {
        const values = (team.members || [])
          .map((m) => trimText(m?.features?.[constraint.attributeKey] || '', 80))
          .filter(Boolean);
        if (values.length === 0) continue;
        const unique = new Set(values.map((v) => norm(v))).size;
        penalty += Math.max(0, unique - 1);
      }
      return penalty * (weight * 4);
    }
    const avg = teams.length > 0 ? teams.reduce((s, t) => s + averagePairSimilarity(t.members || []), 0) / teams.length : 0;
    return Math.max(0, 1 - avg) * weight * 20;
  }

  if (mode === 'acrossteamspread' || mode === 'across_team_spread') {
    if (!constraint.value) return weight * 8;
    let matchCount = 0;
    const counts = teams.map((team) => {
      const c = (team.members || []).filter((m) => {
        if (constraint.attributeKey) {
          const raw = trimText(m?.features?.[constraint.attributeKey] || '', 80);
          return norm(raw) === norm(constraint.value);
        }
        const values = Object.values(m?.features || {});
        return values.some((v) => norm(v) === norm(constraint.value));
      }).length;
      matchCount += c;
      return c;
    });
    if (matchCount === 0) return weight * 8;
    const max = Math.max(...counts, 0);
    const min = Math.min(...counts, 0);
    return (max - min) * weight * 5;
  }

  return weight * 2;
};

const constraintPenalty = (constraint, teams) => {
  // AI 해석을 더 존중하기 위해 하드/소프트 간 격차를 축소한다.
  const weight = constraint.priority === 'hard' ? 180 : 60;
  if (constraint.type === 'same_team') {
    if (constraint.resolved?.status !== 'resolved') return 0;
    const [a] = constraint.resolved.idsA;
    const [b] = constraint.resolved.idsB;
    let ta = null;
    let tb = null;
    for (const team of teams) {
      if ((team.members || []).some((m) => m.id === a)) ta = team.id;
      if ((team.members || []).some((m) => m.id === b)) tb = team.id;
    }
    if (!ta || !tb) return 0;
    return ta === tb ? 0 : weight;
  }

  if (constraint.type === 'separate_team') {
    if (constraint.resolved?.status !== 'resolved') return 0;
    const [a] = constraint.resolved.idsA;
    const [b] = constraint.resolved.idsB;
    let ta = null;
    let tb = null;
    for (const team of teams) {
      if ((team.members || []).some((m) => m.id === a)) ta = team.id;
      if ((team.members || []).some((m) => m.id === b)) tb = team.id;
    }
    if (!ta || !tb) return 0;
    return ta !== tb ? 0 : weight;
  }

  if (constraint.type === 'min_per_team') {
    if (!constraint.attributeKey) return 0;
    let deficit = 0;
    for (const team of teams) {
      const count = (team.members || []).filter((m) => matchConstraintValue(m, constraint)).length;
      deficit += Math.max(0, constraint.min - count);
    }
    return deficit * weight;
  }

  if (constraint.type === 'max_per_team') {
    if (!constraint.attributeKey) return 0;
    let overflow = 0;
    for (const team of teams) {
      const count = (team.members || []).filter((m) => matchConstraintValue(m, constraint)).length;
      overflow += Math.max(0, count - constraint.max);
    }
    return overflow * weight;
  }

  if (constraint.type === 'balance') {
    if (!constraint.attributeKey) return 0;
    const counts = teams.map((team) => (team.members || []).filter((m) => Boolean(m?.features?.[constraint.attributeKey])).length);
    const diff = Math.max(...counts, 0) - Math.min(...counts, 0);
    return diff * 3;
  }

  if (constraint.type === 'soft_objective') {
    return softObjectivePenalty(constraint, teams);
  }

  return 0;
};

const totalPenalty = (teams, constraints) => {
  let sum = 0;
  for (const c of constraints) sum += constraintPenalty(c, teams);
  return sum;
};

const localSearchImprove = (teams, constraints, maxIterations = 200) => {
  if (!Array.isArray(teams) || teams.length < 2) return teams;
  let best = teams.map((t) => ({ ...t, members: [...(t.members || [])] }));
  let bestScore = totalPenalty(best, constraints);

  for (let iter = 0; iter < maxIterations; iter += 1) {
    let improved = false;
    for (let i = 0; i < best.length; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const teamA = best[i];
        const teamB = best[j];
        for (let ai = 0; ai < teamA.members.length; ai += 1) {
          for (let bi = 0; bi < teamB.members.length; bi += 1) {
            const next = best.map((t) => ({ ...t, members: [...(t.members || [])] }));
            const tmp = next[i].members[ai];
            next[i].members[ai] = next[j].members[bi];
            next[j].members[bi] = tmp;
            const score = totalPenalty(next, constraints);
            if (score < bestScore) {
              best = next;
              bestScore = score;
              improved = true;
            }
          }
        }
      }
    }
    if (!improved) break;
  }

  return best;
};

const analyzeConstraintConsistency = (constraints) => {
  const conflicts = [];
  const ambiguities = [];
  const decisionLog = [];
  const pairIndex = new Map();

  for (const c of constraints || []) {
    if (c.type === 'same_team' || c.type === 'separate_team') {
      if (c.resolved?.status !== 'resolved') {
        ambiguities.push(`이름 매칭 불가: ${(c.entities || []).join(', ')}`);
        decisionLog.push(`제약 ${c.id}: 이름 매칭 실패로 자동 강제 제외`);
        continue;
      }
      const [a] = c.resolved.idsA;
      const [b] = c.resolved.idsB;
      const key = [a, b].sort().join('::');
      if (!pairIndex.has(key)) pairIndex.set(key, new Set());
      pairIndex.get(key).add(c.type);
    }
    if (c.type === 'raw_request') {
      ambiguities.push(`자동판정 제외 요청: ${trimText(c.rawText || c.instruction || '', 100)}`);
      decisionLog.push(`제약 ${c.id}: raw_request로 보존, 자동판정 제외`);
    }
    if (c.type === 'ambiguity_note') {
      ambiguities.push(trimText(c.reason || c.rawText || '요청 해석 모호', 120));
      decisionLog.push(`제약 ${c.id}: ambiguity_note 기록`);
    }
  }

  for (const [key, types] of pairIndex.entries()) {
    if (types.has('same_team') && types.has('separate_team')) {
      conflicts.push(`동일 인원쌍 충돌: ${key} (same_team + separate_team)`);
      decisionLog.push(`충돌 처리: ${key}는 하드 충돌로 간주, 패널티 최소화 해 선택`);
    }
  }

  return { conflicts, ambiguities, decisionLog };
};

const summarizeConstraintStatus = ({ constraint, feasibilityItem, teams }) => {
  if (feasibilityItem?.status === 'impossible') {
    return {
      status: 'impossible',
      detail: `${feasibilityItem.detail}. 최대 ${feasibilityItem.maxSatisfiableTeams}팀 충족 / ${feasibilityItem.unsatisfiedTeams}팀 미충족`
    };
  }

  if (constraint.type === 'same_team' || constraint.type === 'separate_team') {
    if (constraint.resolved?.status !== 'resolved') return { status: 'not_verifiable', detail: feasibilityItem?.detail || '검증 불가' };
    const [a] = constraint.resolved.idsA;
    const [b] = constraint.resolved.idsB;
    let ta = null;
    let tb = null;
    for (const team of teams) {
      if ((team.members || []).some((m) => m.id === a)) ta = team.id;
      if ((team.members || []).some((m) => m.id === b)) tb = team.id;
    }
    if (!ta || !tb) return { status: 'partially_satisfied', detail: '배정 후 검증이 불완전합니다.' };
    if (constraint.type === 'same_team') {
      return ta === tb ? { status: 'satisfied', detail: `같은 팀 충족 (Team ${ta})` } : { status: 'violated', detail: `같은 팀 미충족 (Team ${ta} / Team ${tb})` };
    }
    return ta !== tb ? { status: 'satisfied', detail: `분리 충족 (Team ${ta} / Team ${tb})` } : { status: 'violated', detail: `분리 미충족 (Team ${ta})` };
  }

  if (constraint.type === 'min_per_team') {
    if (!constraint.attributeKey) return { status: 'not_verifiable', detail: feasibilityItem?.detail || '검증 불가' };
    let deficit = 0;
    for (const team of teams) {
      const count = (team.members || []).filter((m) => matchConstraintValue(m, constraint)).length;
      deficit += Math.max(0, constraint.min - count);
    }
    if (deficit === 0) return { status: 'satisfied', detail: '팀별 최소 인원 조건 충족' };
    return { status: 'partially_satisfied', detail: `팀별 최소 인원 조건 일부 미충족 (부족 ${deficit}명)` };
  }

  if (constraint.type === 'max_per_team') {
    if (!constraint.attributeKey) return { status: 'not_verifiable', detail: feasibilityItem?.detail || '검증 불가' };
    let overflow = 0;
    for (const team of teams) {
      const count = (team.members || []).filter((m) => matchConstraintValue(m, constraint)).length;
      overflow += Math.max(0, count - constraint.max);
    }
    if (overflow === 0) return { status: 'satisfied', detail: '팀별 최대 인원 조건 충족' };
    return { status: 'partially_satisfied', detail: `팀별 최대 인원 조건 일부 미충족 (초과 ${overflow}명)` };
  }

  if (constraint.type === 'balance') {
    if (!constraint.attributeKey) return { status: 'not_verifiable', detail: feasibilityItem?.detail || '검증 불가' };
    const counts = teams.map((team) => (team.members || []).filter((m) => {
      const g = inferGender(m?.features?.[constraint.attributeKey] || '');
      return g === 'male' || g === 'female';
    }).length);
    const diff = Math.max(...counts, 0) - Math.min(...counts, 0);
    return diff <= 1
      ? { status: 'satisfied', detail: `${constraint.attribute || '속성'} 균형 반영` }
      : { status: 'partially_satisfied', detail: `${constraint.attribute || '속성'} 균형 일부 미충족 (팀간 차이 ${diff})` };
  }

  if (constraint.type === 'raw_request') {
    return { status: 'not_verifiable', detail: '자유 요청: 자동 판정 제외(배정 사유/경고에서 안내)' };
  }

  if (constraint.type === 'soft_objective') {
    const p = softObjectivePenalty(constraint, teams);
    if (p <= 2) return { status: 'satisfied', detail: '정성 목표 반영 수준 양호' };
    if (p <= 12) return { status: 'partially_satisfied', detail: '정성 목표 일부 반영' };
    return { status: 'violated', detail: '정성 목표 반영도 낮음' };
  }

  if (constraint.type === 'ambiguity_note') {
    return { status: 'not_verifiable', detail: constraint.reason || '요청 해석이 모호합니다.' };
  }

  return { status: 'not_verifiable', detail: '지원되지 않는 제약' };
};

const buildAssignmentReport = ({ teams, constraints, feasibility, reason, teamSize, remainderMode, usedFallback, unsupportedConstraints = [] }) => {
  const consistency = analyzeConstraintConsistency(constraints);
  const feasibilityMap = new Map((feasibility || []).map((f) => [f.constraintId, f]));

  const constraintResults = constraints.map((constraint) => {
    const result = summarizeConstraintStatus({ constraint, feasibilityItem: feasibilityMap.get(constraint.id), teams });
    return {
      constraintId: constraint.id,
      type: constraint.type,
      priority: constraint.priority,
      rawText: constraint.rawText || '',
      status: result.status,
      detail: result.detail
    };
  });

  const checklist = constraintResults.map((c) => ({
    item: `${c.type}${c.rawText ? ` (${trimText(c.rawText, 30)})` : ''}`,
    requested: true,
    status: c.status
  }));

  const warnings = (feasibility || []).filter((f) => f.status === 'impossible').map((f) => f.detail);
  const unsupportedWarnings = unsupportedConstraints.map((u) => `미지원 제약(${u.type}): ${u.rawText}`);
  const conflictWarnings = consistency.conflicts.map((x) => `충돌: ${x}`);
  const ambiguityWarnings = consistency.ambiguities.map((x) => `모호/정성: ${x}`);

  return {
    summary: trimText([
      `총 ${teams.flatMap((t) => t.members || []).length}명을 ${teams.length}개 팀으로 배정했습니다.`,
      `팀 크기 기준: ${teamSize}명 / remainderMode: ${remainderMode}.`,
      `배정 메모: ${trimText(reason || '', 120) || '없음'}.`,
      usedFallback ? 'AI 실패 시 서버 안전규칙으로 폴백 배정했습니다.' : 'AI 판단을 우선 반영하고 서버는 안전 검증만 수행했습니다.',
      warnings.length > 0 ? `불가능 제약 ${warnings.length}건은 최선안으로 처리했습니다.` : '',
      unsupportedWarnings.length > 0 ? `미지원 제약 ${unsupportedWarnings.length}건은 자동 검증에서 제외했습니다.` : '',
      consistency.conflicts.length > 0 ? `요청 충돌 ${consistency.conflicts.length}건은 패널티 최소화 해를 선택했습니다.` : '',
      consistency.ambiguities.length > 0 ? `모호/정성 요청 ${consistency.ambiguities.length}건은 최선 추정으로 반영했습니다.` : ''
    ].filter(Boolean).join(' '), 900),
    interpretation: constraints.map((c) => ({
      constraintId: c.id,
      type: c.type,
      priority: c.priority,
      rawText: c.rawText || '',
      instruction: c.instruction || ''
    })),
    ambiguities: consistency.ambiguities,
    conflicts: consistency.conflicts,
    decisionLog: consistency.decisionLog,
    checklist,
    constraints: constraintResults,
    feasibility,
    warnings: [...warnings, ...unsupportedWarnings, ...conflictWarnings, ...ambiguityWarnings],
    actionHint: warnings.length > 0
      ? '요청사항 일부가 데이터상 불가능하여 AI가 최선안으로 조정했습니다. 상세 사유는 경고/판정 로그를 확인하세요.'
      : 'AI 판단 기반으로 배정이 완료되었습니다.',
    teamReports: teams.map((team) => ({
      teamId: team.id,
      reason: `${team.members.length}명으로 구성. 제약 반영 상태는 체크리스트를 확인하세요.`,
      evidence: [`인원: ${team.members.length}명`, team.analysis ? `AI 코멘트: ${trimText(team.analysis, 220)}` : 'AI 코멘트 없음']
    }))
  };
};
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


const chooseTargetTeamForUnassigned = ({ normalized, memberById, memberId, teamSize, remainderMode, rand, constraints, trustAi = false }) => {
  const member = memberById.get(memberId);
  if (trustAi) {
    if (remainderMode === 'spread') {
      const underCapacity = normalized.filter((t) => t.memberIds.length < teamSize);
      const targetPool = underCapacity.length > 0 ? underCapacity : normalized;
      return targetPool[pickRandomIndex(targetPool.length, rand)];
    }
    let target = normalized.reduce((min, t) => (t.memberIds.length < min.memberIds.length ? t : min), normalized[0]);
    if (target.memberIds.length >= teamSize) target = null;
    return target;
  }
  const minConstraints = (constraints || []).filter((c) => c.type === 'min_per_team' && c.attributeKey && c.priority === 'hard');
  const maxConstraints = (constraints || []).filter((c) => c.type === 'max_per_team' && c.attributeKey && c.priority === 'hard');
  const softObjectives = (constraints || []).filter((c) => c.type === 'soft_objective');

  if (minConstraints.length > 0 || maxConstraints.length > 0 || softObjectives.length > 0) {
    let bestTeam = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const team of normalized) {
      if (remainderMode === 'spread' && team.memberIds.length >= teamSize) {
        // spread는 가급적 기본 팀 크기 이하 우선
      }

      let score = 0;
      for (const c of minConstraints) {
        const current = team.memberIds
          .map((id) => memberById.get(id))
          .filter((m) => matchConstraintValue(m, c)).length;
        const matches = matchConstraintValue(member, c);
        if (current < c.min && matches) score -= 10;
        if (current < c.min && !matches) score += 10;
      }
      for (const c of maxConstraints) {
        const current = team.memberIds
          .map((id) => memberById.get(id))
          .filter((m) => matchConstraintValue(m, c)).length;
        const matches = matchConstraintValue(member, c);
        if (matches && current >= c.max) score += 20;
      }
      if (softObjectives.length > 0) {
        const simulated = normalized.map((t) => ({
          id: t.id,
          members: t.memberIds.map((id) => memberById.get(id)).filter(Boolean)
        }));
        const idx = simulated.findIndex((t) => t.id === team.id);
        if (idx >= 0) simulated[idx].members.push(member);
        for (const soft of softObjectives) score += softObjectivePenalty(soft, simulated) * 0.2;
      }
      score += team.memberIds.length * 0.1;
      if (score < bestScore) {
        bestScore = score;
        bestTeam = team;
      }
    }
    if (bestTeam) return bestTeam;
  }

  if (remainderMode === 'spread') {
    const underCapacity = normalized.filter((t) => t.memberIds.length < teamSize);
    const targetPool = underCapacity.length > 0 ? underCapacity : normalized;
    return targetPool[pickRandomIndex(targetPool.length, rand)];
  }

  let target = normalized.reduce((min, t) => (t.memberIds.length < min.memberIds.length ? t : min), normalized[0]);
  if (target.memberIds.length >= teamSize) target = null;
  return target;
};
const normalizeAiTeams = ({ aiTeams, memberById, teamSize, remainderMode, rand, constraints, trustAi = false }) => {
  const used = new Set();
  const normalized = [];

  for (const team of aiTeams || []) {
    const ids = Array.isArray(team?.members) ? team.members.map((x) => String(x || '').trim()).filter(Boolean) : [];
    const dedup = [];
    for (const id of ids) {
      if (!memberById.has(id) || used.has(id)) continue;
      used.add(id);
      dedup.push(id);
    }
    if (dedup.length > 0) {
      normalized.push({
        id: Number(team?.id) > 0 ? Number(team.id) : normalized.length + 1,
        memberIds: dedup,
        analysis: trimText(team?.analysis || '', 220)
      });
    }
  }

  const unassigned = Array.from(memberById.keys()).filter((id) => !used.has(id));

  if (normalized.length === 0) {
    return { valid: false, teams: [], unassigned: Array.from(memberById.keys()) };
  }

  if (remainderMode === 'spread') {
    const expectedTeams = createSpreadTeams(memberById.size, teamSize);

    while (normalized.length < expectedTeams) {
      normalized.push({
        id: normalized.length + 1,
        memberIds: [],
        analysis: ''
      });
    }

    if (normalized.length > expectedTeams) {
      const overflow = normalized.splice(expectedTeams);
      const overflowIds = overflow.flatMap((t) => t.memberIds);
      for (const id of overflowIds) {
        const randomTeam = normalized[pickRandomIndex(normalized.length, rand)];
        randomTeam.memberIds.push(id);
      }
    }
  }

  for (const id of unassigned) {
    const target = chooseTargetTeamForUnassigned({
      normalized,
      memberById,
      memberId: id,
      teamSize,
      remainderMode,
      rand,
      constraints,
      trustAi
    });
    if (target) {
      target.memberIds.push(id);
    } else {
      normalized.push({ id: normalized.length + 1, memberIds: [id], analysis: '' });
    }
  }

  return { valid: true, teams: normalized, unassigned: [] };
};

export const __test__ = {
  ruleBasedParseConstraints,
  normalizeConstraints,
  evaluateFeasibility,
  enforceMinPerTeamConstraints,
  enforceMaxPerTeamConstraints,
  localSearchImprove,
  summarizeConstraintStatus,
  matchConstraintValue,
  softObjectivePenalty,
  analyzeConstraintConsistency
};

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { participants = [], config = {}, customPrompt = '', checkout_id: checkoutId = '' } = body;

    if (!Array.isArray(participants) || participants.length < 2) {
      return json({ error: '최소 2명 이상의 참가자가 필요합니다.' }, 400);
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: 'OPENAI_API_KEY가 없습니다.' }, 500);
    }

    await verifyPaidCheckout({ checkoutId, env });

    const teamSize = Number(config.teamSize) > 0 ? Number(config.teamSize) : 4;
    const remainderMode = config.remainderMode === 'keep_partial' ? 'keep_partial' : 'spread';

    const compact = ensureUniqueIds(participants.map(compactParticipant).filter((p) => p.id));
    if (compact.length < 2) {
      return json({ error: '배정 가능한 참가자가 2명 미만입니다.' }, 400);
    }

    const seedInput = `${checkoutId}|${teamSize}|${remainderMode}|${compact.map((p) => p.id).join(',')}`;
    const rand = createSeededRandom(seedInput);

    const memberById = new Map(
      compact.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.displayName,
          style: '',
          intro: p.intro,
          features: p.features || {},
          identifierKey: p.identifierKey || ''
        }
      ])
    );

    const promptText = String(customPrompt || '').trim();
    const AI_TRUST_MODE = true;
    let constraintSource = 'ai_only';
    let aiConstraints = [];
    if (promptText) {
      try {
        aiConstraints = await callOpenAIConstraintParser({
          customPrompt: promptText,
          participants: compact,
          env
        });
        constraintSource = 'ai';
      } catch (error) {
        console.error('Constraint parse failed:', error);
      }
    }

    aiConstraints = (aiConstraints || []).map((x) => ({ ...x, __source: 'ai' }));
    // AI 100% 의존모드: 서버 룰 파서는 실행 경로에서 사용하지 않는다.
    let rawConstraints = aiConstraints;
    if (promptText && aiConstraints.length === 0) {
      rawConstraints = [
        {
          type: 'ambiguity_note',
          reason: 'AI 제약 해석 결과가 비어 있어 자동 검증 가능한 제약을 생성하지 못했습니다.',
          rawText: 'AI 제약 해석 실패/빈 결과',
          priority: 'soft',
          __source: 'ai'
        },
        {
          type: 'raw_request',
          instruction: trimText(promptText, 220),
          rawText: trimText(promptText, 220),
          priority: 'soft',
          __source: 'ai'
        }
      ];
      constraintSource = 'ai_only_empty_constraints';
    }
    const constraints = normalizeConstraints({ rawConstraints, participants: compact });
    const unsupportedConstraints = collectUnsupportedConstraints(rawConstraints);
    const teamCount =
      remainderMode === 'keep_partial'
        ? Math.max(1, Math.floor(compact.length / teamSize) + (compact.length % teamSize > 0 ? 1 : 0))
        : createSpreadTeams(compact.length, teamSize);
    const feasibility = evaluateFeasibility({
      constraints,
      participants: compact,
      teamCount
    });

    let ai = null;
    let reason = 'AI 팀배정 완료';
    // 단일 시도 정책: 재시도 프롬프트를 사용하지 않는다.

    try {
      ai = await callOpenAIOnce({
        participants: compact,
        teamSize,
        remainderMode,
        customPrompt: promptText,
        constraints,
        env
      });
      reason = trimText(ai?.reason || 'AI 팀배정 완료', 120);
    } catch (e) {
      console.error('OpenAI single-call failed:', e);
    }

    let teams;
    if (ai?.teams && Array.isArray(ai.teams)) {
      const normalized = normalizeAiTeams({
        aiTeams: ai.teams,
        memberById,
        teamSize,
        remainderMode,
        rand,
        constraints,
        trustAi: AI_TRUST_MODE
      });

      if (normalized.valid) {
        teams = normalized.teams.map((team, idx) => ({
          id: team.id || idx + 1,
          members: team.memberIds.map((id) => memberById.get(id)).filter(Boolean),
          analysis: team.analysis || `${team.memberIds.length}명 구성`
        }));
        // AI 100% 신뢰모드: AI 배정 성공 시 서버는 무결성 외 재배치를 하지 않는다.
      }
    }

    if (!teams || teams.length === 0) {
      const fallback = buildBaseTeams(Array.from(memberById.values()), teamSize, remainderMode, rand);
      // AI 100% 의존모드: AI 실패 시 서버는 최소 안전 폴백만 수행한다.
      teams = fallback;
      reason = 'AI 배정 실패로 최소 안전 폴백 배정';
    }

    const annotatedTeams = annotateTeams(teams, reason);
    const report = buildAssignmentReport({
      teams: annotatedTeams,
      constraints,
      feasibility,
      reason,
      teamSize,
      remainderMode,
      usedFallback: !ai?.teams || !Array.isArray(ai.teams),
      unsupportedConstraints
    });

    return json({
      teams: annotatedTeams,
      report: {
        ...report,
        meta: {
          constraintSource,
          parsedConstraintCount: constraints.length,
          unsupportedConstraintCount: unsupportedConstraints.length
        }
      }
    });
  } catch (error) {
    return json({ error: error.message || '팀 배정 중 오류가 발생했습니다.' }, 500);
  }
}




