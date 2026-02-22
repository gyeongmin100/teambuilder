import { norm, trimText } from '../../shared/text.js';
import { inferGender, matchConstraintValue, toSafeNumber } from './common.js';

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


export {
  evaluateFeasibility,
  enforceMinPerTeamConstraints,
  enforceMaxPerTeamConstraints,
  softObjectivePenalty,
  localSearchImprove,
  analyzeConstraintConsistency,
  summarizeConstraintStatus,
  matchConstraintValue
};

