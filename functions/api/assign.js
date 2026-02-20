const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_INTRO = 260;
const MAX_FEATURES = 12;
const MAX_FEATURE_VALUE = 120;

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

const buildPrompt = ({ participants, teamSize, remainderMode, customPrompt }) => {
  const schema = {
    teams: [
      {
        id: 1,
        members: ['id1', 'id2', 'id3'],
        analysis: '왜 이 조합인지 간단히 설명'
      }
    ],
    reason: '전체 배정 요약'
  };

  return [
    '다음 참가자 전원을 팀으로 배정해라.',
    '중요: 반드시 JSON 객체만 반환한다. Markdown 금지.',
    `teamSize: ${teamSize}`,
    `remainderMode: ${remainderMode}`,
    `customRequirements: ${customPrompt || '(없음)'}`,
    '',
    '규칙:',
    '- 모든 id를 정확히 한 번씩만 사용',
    '- 존재하지 않는 id 사용 금지',
    '- 사용자 요청사항을 최대한 반영',
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

const callOpenAIOnce = async ({ participants, teamSize, remainderMode, customPrompt, env }) => {
  const prompt = buildPrompt({ participants, teamSize, remainderMode, customPrompt });

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
            '너는 팀빌딩 배정 엔진이다. 반드시 JSON 객체만 출력한다. 참가자 id 누락/중복 금지. 사용자 조건 우선.'
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

const normalizeAiTeams = ({ aiTeams, memberById, teamSize, remainderMode, rand }) => {
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
    if (remainderMode === 'spread') {
      const underCapacity = normalized.filter((t) => t.memberIds.length < teamSize);
      const targetPool = underCapacity.length > 0 ? underCapacity : normalized;
      const target = targetPool[pickRandomIndex(targetPool.length, rand)];
      target.memberIds.push(id);
    } else {
      let target = normalized.reduce((min, t) => (t.memberIds.length < min.memberIds.length ? t : min), normalized[0]);
      if (target.memberIds.length >= teamSize) target = null;
      if (target) {
        target.memberIds.push(id);
      } else {
        normalized.push({ id: normalized.length + 1, memberIds: [id], analysis: '' });
      }
    }
  }

  return { valid: true, teams: normalized, unassigned: [] };
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
          intro: p.intro
        }
      ])
    );

    let ai = null;
    let reason = 'AI 팀배정 완료';

    try {
      ai = await callOpenAIOnce({
        participants: compact,
        teamSize,
        remainderMode,
        customPrompt: String(customPrompt || '').trim(),
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
        rand
      });

      if (normalized.valid) {
        teams = normalized.teams.map((team, idx) => ({
          id: team.id || idx + 1,
          members: team.memberIds.map((id) => memberById.get(id)).filter(Boolean),
          analysis: team.analysis || `${team.memberIds.length}명 구성`
        }));
      }
    }

    if (!teams || teams.length === 0) {
      const fallback = buildBaseTeams(Array.from(memberById.values()), teamSize, remainderMode, rand);
      teams = fallback;
      reason = 'AI 배정 실패로 기본 규칙 배정';
    }

    return json({ teams: annotateTeams(teams, reason) });
  } catch (error) {
    return json({ error: error.message || '팀 배정 중 오류가 발생했습니다.' }, 500);
  }
}
