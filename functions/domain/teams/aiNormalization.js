import { trimText } from '../../shared/text.js';
import { pickRandomIndex, createSpreadTeams } from './teamFormation.js';
import { matchConstraintValue, softObjectivePenalty } from '../constraints/constraintEngine.js';

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

export { normalizeAiTeams };
