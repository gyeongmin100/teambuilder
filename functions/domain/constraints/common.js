import { trimText, norm } from '../../shared/text.js';

const GENDER_KEY_ALIASES = ['성별', 'gender', 'sex', 'male/female', '남녀'];
const MALE_ALIASES = ['남', '남자', '남성', 'male', 'm'];
const FEMALE_ALIASES = ['여', '여자', '여성', 'female', 'f'];

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


export {
  inferPriority,
  resolvePriority,
  toSafeNumber,
  parseCountToken,
  splitEntityList,
  normalizeConstraintType,
  inferGender,
  findGenderFeatureKey,
  resolveAttributeKey,
  resolveAttributeKeyByValue,
  matchConstraintValue
};
