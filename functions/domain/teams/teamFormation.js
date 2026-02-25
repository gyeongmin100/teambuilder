import { trimText } from '../../shared/text.js';

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

export const createSeededRandom = (seedText) => {
  const seedFn = xmur3(String(seedText || 'seed-default'));
  return mulberry32(seedFn());
};

export const pickRandomIndex = (length, rand) => {
  const safeLength = Math.max(1, length);
  const n = typeof rand === 'function' ? rand() : Math.random();
  return Math.floor(n * safeLength);
};

export const createSpreadTeams = (total, teamSize) => {
  const fullTeamCount = Math.floor(total / teamSize);
  return Math.max(1, fullTeamCount);
};

export const buildSpreadTargetSizes = (total, teamSize) => {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeTeamSize = Math.max(1, Number(teamSize) || 1);
  if (safeTotal === 0) return [];

  const teamCount = createSpreadTeams(safeTotal, safeTeamSize);
  const remainder = safeTotal - teamCount * safeTeamSize;
  const sizes = Array.from({ length: teamCount }, () => safeTeamSize);
  // Distribute remainder cyclically so cases like 50 people / size 30 become [50], not [31, NaN...].
  for (let i = 0; i < remainder; i += 1) sizes[i % teamCount] += 1;
  return sizes;
};

export const buildBaseTeams = (participants, teamSize, remainderMode, rand) => {
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

  const targetSizes = buildSpreadTargetSizes(participants.length, teamSize);
  const teams = Array.from({ length: targetSizes.length }, (_, i) => ({
    id: i + 1,
    members: [],
    analysis: ''
  }));

  let cursor = 0;
  for (let teamIdx = 0; teamIdx < teams.length; teamIdx += 1) {
    for (let n = 0; n < targetSizes[teamIdx] && cursor < participants.length; n += 1) {
      teams[teamIdx].members.push(participants[cursor]);
      cursor += 1;
    }
  }

  return teams;
};

export const annotateTeams = (teams, reason = '') =>
  teams.map((team, index) => ({
    ...team,
    id: Number(team.id) > 0 ? Number(team.id) : index + 1,
    analysis: trimText(team.analysis || '', 220) || `${team.members.length}명 구성${reason ? ` / ${reason}` : ''}`
  }));
