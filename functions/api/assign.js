const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_INTRO = 300;
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

const compactParticipant = (p) => ({
  id: String(p.name || '').trim(),
  originalName: trimText(p.originalName || p.name || '', 120),
  intro: trimText(p.intro || '', MAX_INTRO),
  features: compactFeatures(p.features || {}),
  identifierKey: trimText(p.identifierKey || '', 80)
});

const roleWeight = {
  leader: 10,
  presenter: 8,
  analyst: 6,
  executor: 4,
  supporter: 2
};

const normalizeRole = (role) => {
  const r = String(role || '').toLowerCase();
  if (r in roleWeight) return r;
  return 'supporter';
};

const buildBaseTeams = (sortedParticipants, teamSize, remainderMode) => {
  if (remainderMode === 'keep_partial') {
    const total = sortedParticipants.length;
    const fullTeamCount = Math.floor(total / teamSize);
    const remainder = total % teamSize;
    const numTeams = fullTeamCount + (remainder > 0 ? 1 : 0);

    const teams = Array.from({ length: numTeams }, (_, i) => ({ id: i + 1, members: [], analysis: '' }));

    if (fullTeamCount === 0) {
      teams[0].members = sortedParticipants;
      return teams;
    }

    const fullCapacity = fullTeamCount * teamSize;
    for (let i = 0; i < fullCapacity; i += 1) {
      teams[i % fullTeamCount].members.push(sortedParticipants[i]);
    }
    for (let i = fullCapacity; i < total; i += 1) {
      teams[numTeams - 1].members.push(sortedParticipants[i]);
    }
    return teams;
  }

  const numTeams = Math.ceil(sortedParticipants.length / teamSize);
  const teams = Array.from({ length: numTeams }, (_, i) => ({ id: i + 1, members: [], analysis: '' }));
  sortedParticipants.forEach((participant, index) => {
    teams[index % numTeams].members.push(participant);
  });
  return teams;
};

const annotateTeams = (teams, prefix = '') => {
  teams.forEach((team) => {
    const roles = team.members.map((m) => m.role).filter(Boolean);
    const roleSummary = [...new Set(roles)].join(', ') || '정보 없음';
    const base = `${team.members.length}명 구성 / 역할 분포: ${roleSummary}`;
    team.analysis = prefix ? `${prefix} | ${base}` : base;
  });
  return teams;
};

const fallbackResult = (participants, teamSize, remainderMode, reason = '기본 배정') => {
  const normalized = participants.map((p) => ({
    ...p,
    role: normalizeRole(p.role),
    style: p.style || '정보 기반 기본 배정',
    strength: p.strength || '정보 부족',
    traits: Array.isArray(p.traits) ? p.traits : []
  }));

  const sorted = [...normalized].sort((a, b) => (roleWeight[b.role] || 0) - (roleWeight[a.role] || 0));
  const teams = annotateTeams(buildBaseTeams(sorted, teamSize, remainderMode), reason);
  return { teams, reason };
};

const validateTeamIds = (teamIds, idSet, teamSize, remainderMode) => {
  if (!Array.isArray(teamIds) || teamIds.length === 0) return false;

  const used = new Set();
  for (let i = 0; i < teamIds.length; i += 1) {
    const arr = Array.isArray(teamIds[i]) ? teamIds[i] : [];
    if (arr.length === 0) return false;
    if (arr.length > teamSize) return false;
    if (remainderMode === 'keep_partial' && i < teamIds.length - 1 && arr.length < teamSize) return false;

    for (const id of arr) {
      if (!idSet.has(id) || used.has(id)) return false;
      used.add(id);
    }
  }

  return used.size === idSet.size;
};

const buildPrompt = ({ participants, teamSize, remainderMode, customPrompt }) => {
  const hardRules = [
    '모든 참가자 id를 정확히 한 번씩만 사용한다.',
    '존재하지 않는 id를 만들지 않는다.',
    'JSON 객체만 반환한다.',
    `teamSize=${teamSize}, remainderMode=${remainderMode} 규칙을 지킨다.`
  ];

  const schema = {
    members: [
      {
        id: '식별 id',
        role: 'leader|analyst|executor|presenter|supporter',
        style: '30단어 이내 요약',
        strength: '30단어 이내 요약',
        traits: ['trait1', 'trait2']
      }
    ],
    teams: [{ id: 1, members: ['id1', 'id2'], analysis: '팀 설명' }],
    reason: '배정 요약'
  };

  return [
    '다음 참가자 전원에 대해 역할 추출과 팀 배정을 한 번에 수행해라.',
    '',
    `teamSize: ${teamSize}`,
    `remainderMode: ${remainderMode}`,
    `customRequirements: ${customPrompt || '(없음)'}`,
    '',
    '규칙:',
    ...hardRules.map((r) => `- ${r}`),
    '',
    '참가자 입력(JSON):',
    JSON.stringify(participants),
    '',
    '반환 JSON 스키마 예시:',
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
            '너는 팀빌딩 배정 엔진이다. 반드시 JSON 객체만 출력한다. 마크다운 금지. 참가자 id 누락/중복 금지.'
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

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { participants = [], config = {}, customPrompt = '' } = body;

    if (!Array.isArray(participants) || participants.length < 2) {
      return json({ error: '최소 2명 이상의 참가자가 필요합니다.' }, 400);
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: 'OPENAI_API_KEY가 없습니다.' }, 500);
    }

    const teamSize = Number(config.teamSize) > 0 ? Number(config.teamSize) : 4;
    const remainderMode = config.remainderMode === 'keep_partial' ? 'keep_partial' : 'spread';

    const compact = participants.map(compactParticipant).filter((p) => p.id);
    const idSet = new Set(compact.map((p) => p.id));

    if (compact.length < 2 || idSet.size !== compact.length) {
      return json({ error: '식별 id가 비어있거나 중복되어 배정할 수 없습니다.' }, 400);
    }

    let ai;
    try {
      ai = await callOpenAIOnce({
        participants: compact,
        teamSize,
        remainderMode,
        customPrompt: String(customPrompt || '').trim(),
        env
      });
    } catch (e) {
      console.error('OpenAI single-call failed:', e);
      const fallbackParticipants = compact.map((p) => ({
        ...p,
        role: 'supporter',
        style: 'AI 호출 실패로 기본값 적용',
        strength: '정보 부족',
        traits: []
      }));
      return json(fallbackResult(fallbackParticipants, teamSize, remainderMode, 'AI 실패, 기본 규칙 배정'));
    }

    const aiMembers = Array.isArray(ai?.members) ? ai.members : [];
    const memberById = new Map(compact.map((p) => [p.id, { ...p, role: 'supporter', style: '정보 부족', strength: '정보 부족', traits: [] }]));

    for (const m of aiMembers) {
      const id = String(m?.id || '').trim();
      if (!memberById.has(id)) continue;
      const base = memberById.get(id);
      memberById.set(id, {
        ...base,
        role: normalizeRole(m?.role),
        style: trimText(m?.style || '정보 부족', 120),
        strength: trimText(m?.strength || '정보 부족', 120),
        traits: Array.isArray(m?.traits) ? m.traits.slice(0, 5).map((t) => trimText(t, 40)).filter(Boolean) : []
      });
    }

    const teamsRaw = Array.isArray(ai?.teams) ? ai.teams : [];
    const teamIds = teamsRaw.map((t) => (Array.isArray(t?.members) ? t.members.map((x) => String(x)) : []));

    if (!validateTeamIds(teamIds, idSet, teamSize, remainderMode)) {
      const fallbackParticipants = Array.from(memberById.values());
      return json(fallbackResult(fallbackParticipants, teamSize, remainderMode, 'AI 팀구성 검증 실패, 기본 규칙 배정'));
    }

    const teams = teamsRaw.map((t, idx) => ({
      id: Number(t?.id) > 0 ? Number(t.id) : idx + 1,
      members: (t.members || []).map((id) => memberById.get(String(id))).filter(Boolean),
      analysis: trimText(t?.analysis || '', 220)
    }));

    return json(annotateTeams(teams, trimText(ai?.reason || 'AI 팀배정 완료', 120)));
  } catch (error) {
    return json({ error: error.message || '팀 배정 중 오류가 발생했습니다.' }, 500);
  }
}
