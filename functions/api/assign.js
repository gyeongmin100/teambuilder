const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const EXTRACTION_SYSTEM_PROMPT = [
  '너는 팀빌딩 데이터 구조화 엔진이다.',
  '목표는 자연어/설문 응답에서 팀 배정에 필요한 신호를 안정적으로 추출하는 것이다.',
  '',
  '절대 규칙:',
  '1. 반드시 JSON 객체만 출력한다. 마크다운/설명문 금지.',
  '2. 추측하지 말고, 근거 없는 정보는 "정보 부족"으로 처리한다.',
  '3. 입력 언어(한국어/영어/혼합)는 그대로 이해하되 출력 필드명은 고정 스키마를 따른다.',
  '4. role은 아래 5개 중 하나만 사용한다: leader, analyst, executor, presenter, supporter.',
  '5. style/strength는 30단어 이내로 짧고 명확하게 요약한다.',
  '6. traits는 2~5개의 짧은 키워드 배열로 만든다.',
  '',
  '출력 스키마:',
  '{',
  '  "role": "leader|analyst|executor|presenter|supporter",',
  '  "style": "문장",',
  '  "strength": "문장",',
  '  "traits": ["키워드1", "키워드2"]',
  '}'
].join('\n');

const ASSIGNMENT_SYSTEM_PROMPT = [
  '너는 제약조건 기반 팀 편성 엔진이다.',
  '목표는 사용자 요구사항과 팀 편성 규칙을 동시에 만족하는 팀 구성을 만드는 것이다.',
  '',
  '절대 규칙:',
  '1. 반드시 JSON 객체만 출력한다. 마크다운/설명문 금지.',
  '2. 참가자 id를 새로 만들거나 수정하지 말고, 입력에 있는 id만 사용한다.',
  '3. 모든 id는 정확히 한 번만 배정한다. 중복/누락 금지.',
  '4. 팀 수, 팀당 인원 규칙, remainderMode를 반드시 지킨다.',
  '5. 사용자 요구사항이 충돌하면 하드 제약(반드시 같은 팀/반드시 분리)을 소프트 제약보다 우선한다.',
  '6. 판단 근거를 reason에 한 줄로 요약한다.',
  '',
  '출력 스키마:',
  '{ "teams": [ { "id": 1, "members": ["id1","id2"] } ], "reason": "요약" }'
].join('\n');

const parseJsonSafe = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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
      const teamIndex = i % fullTeamCount;
      teams[teamIndex].members.push(sortedParticipants[i]);
    }

    for (let i = fullCapacity; i < total; i += 1) {
      teams[numTeams - 1].members.push(sortedParticipants[i]);
    }

    return teams;
  }

  const numTeams = Math.ceil(sortedParticipants.length / teamSize);
  const teams = Array.from({ length: numTeams }, (_, i) => ({ id: i + 1, members: [], analysis: '' }));
  sortedParticipants.forEach((participant, index) => {
    const teamIndex = index % numTeams;
    teams[teamIndex].members.push(participant);
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

const fallbackEnrichedParticipant = (participant, reason = '정보 부족') => ({
  ...participant,
  role: 'supporter',
  style: reason,
  strength: reason,
  traits: []
});

const enrichParticipants = async (participants, env) => {
  const results = [];

  for (const p of participants) {
    try {
      const featuresText = Object.entries(p.features || {})
        .map(([k, v]) => `- ${k}: ${String(v)}`)
        .join('\n');

      const prompt = [
        '다음 참가자 정보를 분석해서 JSON으로만 반환해라.',
        '',
        `Identifier: ${p.name || ''}`,
        `Original Name: ${p.originalName || ''}`,
        `Intro: ${p.intro || ''}`,
        'Features:',
        featuresText || '- (none)',
        '',
        '출력 스키마:',
        '{',
        '  "role": "leader|analyst|executor|presenter|supporter",',
        '  "style": "문장",',
        '  "strength": "문장",',
        '  "traits": ["키워드1", "키워드2"]',
        '}'
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
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!res.ok) {
        const failText = await res.text();
        results.push(fallbackEnrichedParticipant(p, `추출 실패(${res.status})`));
        console.error('OpenAI enrichment failed:', failText);
        continue;
      }

      const data = await res.json();
      const extractedRaw = data?.choices?.[0]?.message?.content;
      if (!extractedRaw) {
        results.push(fallbackEnrichedParticipant(p, '추출 실패(응답 비어있음)'));
        continue;
      }

      const extracted = parseJsonSafe(extractedRaw, {
        role: 'supporter',
        style: '정보 부족',
        strength: '정보 부족',
        traits: []
      });

      results.push({
        ...p,
        role: extracted.role || 'supporter',
        style: extracted.style || '정보 부족',
        strength: extracted.strength || '정보 부족',
        traits: Array.isArray(extracted.traits) ? extracted.traits : []
      });
    } catch (error) {
      console.error('OpenAI enrichment exception:', error);
      results.push(fallbackEnrichedParticipant(p, '추출 예외 발생'));
    }
  }

  return results;
};

const tryCustomPromptAssignment = async ({ participants, teamSize, remainderMode, customPrompt, env }) => {
  const trimmed = String(customPrompt || '').trim();
  if (!trimmed) return null;

  const participantMap = new Map(participants.map((p) => [p.name, p]));
  const identifiers = participants.map((p) => p.name);

  if (new Set(identifiers).size !== identifiers.length) {
    return null;
  }

  const fullTeamCount = Math.floor(participants.length / teamSize);
  const remainder = participants.length % teamSize;
  const targetTeamCount = remainderMode === 'keep_partial'
    ? fullTeamCount + (remainder > 0 ? 1 : 0)
    : Math.ceil(participants.length / teamSize);

  const participantLines = participants.map((p) => {
    const featureSummary = Object.entries(p.features || {})
      .slice(0, 8)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' | ');
    return `- id: ${p.name} / role: ${p.role || 'unknown'} / features: ${featureSummary || 'none'}`;
  });

  const assignPrompt = [
    '다음 조건으로 팀을 편성해라.',
    `teamSize: ${teamSize}`,
    `remainderMode: ${remainderMode}`,
    `targetTeamCount: ${targetTeamCount}`,
    `identifierKey: ${participants[0]?.identifierKey || 'identifier'}`,
    '사용자 맞춤 요구사항:',
    trimmed,
    '',
    '참가자 목록:',
    ...participantLines,
    '',
    '반드시 지켜라:',
    '- 모든 id를 정확히 한 번만 사용',
    '- 존재하지 않는 id 사용 금지',
    '- 팀 수와 인원 규칙 준수',
    '- JSON만 출력',
    '',
    '출력 스키마:',
    '{ "teams": [ { "id": 1, "members": ["id1","id2"] } ], "reason": "요약" }'
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
        { role: 'system', content: ASSIGNMENT_SYSTEM_PROMPT },
        { role: 'user', content: assignPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  });

  if (!res.ok) return null;

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return null;

  const parsed = parseJsonSafe(raw, null);
  const teamsRaw = Array.isArray(parsed?.teams) ? parsed.teams : null;
  if (!teamsRaw || teamsRaw.length !== targetTeamCount) return null;

  const seen = new Set();
  const resultTeams = [];

  for (let i = 0; i < teamsRaw.length; i += 1) {
    const team = teamsRaw[i];
    const members = Array.isArray(team?.members) ? team.members : [];
    if (!members.length) return null;

    if (members.length > teamSize) return null;

    if (remainderMode === 'keep_partial' && targetTeamCount > 1 && i < targetTeamCount - 1 && members.length < teamSize) {
      return null;
    }

    const mappedMembers = [];
    for (const id of members) {
      if (!participantMap.has(id) || seen.has(id)) return null;
      seen.add(id);
      mappedMembers.push(participantMap.get(id));
    }

    resultTeams.push({
      id: Number(team?.id) > 0 ? Number(team.id) : i + 1,
      members: mappedMembers,
      analysis: ''
    });
  }

  if (seen.size !== participants.length) return null;

  const reason = typeof parsed?.reason === 'string' ? parsed.reason.trim() : '사용자 맞춤 조건 반영';
  return annotateTeams(resultTeams, reason || '사용자 맞춤 조건 반영');
};

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { participants = [], config = {}, customPrompt = '' } = body;

    if (!Array.isArray(participants) || participants.length < 2) {
      return new Response(JSON.stringify({ error: '최소 2명 이상의 참가자가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY가 없습니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const teamSize = Number(config.teamSize) > 0 ? Number(config.teamSize) : 4;
    const remainderMode = config.remainderMode === 'keep_partial' ? 'keep_partial' : 'spread';

    const normalizedParticipants = await enrichParticipants(participants, env);

    const customTeams = await tryCustomPromptAssignment({
      participants: normalizedParticipants,
      teamSize,
      remainderMode,
      customPrompt,
      env
    });

    if (customTeams) {
      return new Response(JSON.stringify({ teams: customTeams }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const roleWeight = {
      leader: 10,
      presenter: 8,
      analyst: 6,
      executor: 4,
      supporter: 2
    };

    const sorted = [...normalizedParticipants].sort(
      (a, b) => (roleWeight[b.role] || 0) - (roleWeight[a.role] || 0)
    );

    const teams = annotateTeams(buildBaseTeams(sorted, teamSize, remainderMode));

    return new Response(JSON.stringify({ teams }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
