import { trimText } from '../../shared/text.js';
import { compactParticipant, ensureUniqueIds } from '../participants/participantSanitizer.js';
import { buildSpreadTargetSizes, annotateTeams } from '../teams/teamFormation.js';
import { buildAssignmentReport, callOpenAIOnce } from '../constraints/constraintEngine.js';

const resolveRemainderPolicy = (config = {}) => {
  if (config.remainderPolicy === 'new_team' || config.remainderMode === 'keep_partial') return 'new_team';
  if (config.remainderPolicy === 'one_team' || config.remainderPolicy === 'custom') return 'one_team';
  return 'spread';
};

const buildTargetTeamSizes = ({ total, teamSize, remainderPolicy }) => {
  if (remainderPolicy === 'new_team') {
    const full = Math.floor(total / teamSize);
    const rem = total % teamSize;
    const sizes = Array.from({ length: full }, () => teamSize);
    if (rem > 0) sizes.push(rem);
    return sizes.length > 0 ? sizes : [total];
  }

  if (remainderPolicy === 'one_team') {
    const baseTeamCount = Math.floor(total / teamSize);
    const remainder = total % teamSize;
    if (baseTeamCount <= 0) return [total];
    const sizes = Array.from({ length: baseTeamCount }, () => teamSize);
    sizes[0] += remainder;
    return sizes;
  }

  return buildSpreadTargetSizes(total, teamSize);
};

const normalizeMembersById = (participants = []) =>
  new Map(
    participants.map((participant) => [
      participant.id,
      {
        id: participant.id,
        name: participant.displayName,
        intro: participant.intro,
        features: participant.features || {},
        identifierKey: participant.identifierKey || ''
      }
    ])
  );

const parseSlotResponse = (aiOutput, targetTeamSizes, memberById) => {
  return targetTeamSizes.map((_, i) => {
    const key = `team_${i + 1}`;
    const team = aiOutput?.[key] || {};
    const rawMembers = Array.isArray(team.members) ? team.members : [];
    const members = rawMembers
      .map((raw) => {
        const id = String(raw || '').trim();
        return id ? memberById.get(id) : null;
      })
      .filter(Boolean);

    return {
      id: i + 1,
      members,
      analysis: trimText(team.analysis || '', 220)
    };
  });
};

const patchAiTeams = ({ aiTeams = [], memberById, allIds = [] }) => {
  const seen = new Set();
  const patched = aiTeams.map((team) => {
    const uniqueMembers = [];
    for (const m of team.members || []) {
      const id = String(m?.id || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      uniqueMembers.push(m);
    }
    return { ...team, members: uniqueMembers };
  });

  const missing = allIds.filter((id) => !seen.has(id)).map((id) => memberById.get(id)).filter(Boolean);
  for (const m of missing) {
    const smallest = patched.reduce((a, b) => (a.members.length <= b.members.length ? a : b), patched[0]);
    smallest.members.push(m);
  }

  return patched;
};

const shuffleIds = (ids = []) => {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const buildLocalRandomTeams = ({ memberById, allIds, targetTeamSizes }) => {
  const shuffled = shuffleIds(allIds);
  const teams = [];
  let cursor = 0;

  for (let teamIdx = 0; teamIdx < targetTeamSizes.length; teamIdx += 1) {
    const size = Number(targetTeamSizes[teamIdx]) || 0;
    const members = [];
    for (let n = 0; n < size && cursor < shuffled.length; n += 1) {
      const member = memberById.get(shuffled[cursor]);
      if (member) members.push(member);
      cursor += 1;
    }
    teams.push({
      id: teamIdx + 1,
      members,
      analysis: '맞춤 프롬프트 미사용: 내부 랜덤 로직으로 배정했습니다.'
    });
  }

  return teams;
};

export const assignTeamsWithValidation = async ({
  participants = [],
  config = {},
  customPrompt = '',
  checkoutId = '',
  env
}) => {
  const teamSize = Number(config.teamSize) > 0 ? Number(config.teamSize) : 4;
  const remainderPolicy = resolveRemainderPolicy(config);

  const compactParticipants = ensureUniqueIds(
    participants.map(compactParticipant).filter((participant) => participant.id)
  );
  if (compactParticipants.length < 2) {
    throw new Error('배정 가능한 참가자가 2명 미만입니다.');
  }

  const targetTeamSizes = buildTargetTeamSizes({
    total: compactParticipants.length,
    teamSize,
    remainderPolicy
  });

  const allIds = compactParticipants.map((participant) => participant.id);
  const memberById = normalizeMembersById(compactParticipants);
  const normalizedPrompt = String(customPrompt || '').trim();

  if (!normalizedPrompt) {
    const teams = buildLocalRandomTeams({ memberById, allIds, targetTeamSizes });
    const reason = '맞춤 프롬프트 미사용: 내부 랜덤 로직으로 배정했습니다.';
    const annotatedTeams = annotateTeams(teams, reason);
    const report = buildAssignmentReport({
      reason,
      customPrompt: '',
      integrityReport: null,
      aiOutput: {
        reason,
        final_strategy: 'local_random_no_prompt',
        prompt_checklist: []
      },
      warnings: [],
      remainderDecision: null
    });
    return { teams: annotatedTeams, report };
  }

  const ai = await callOpenAIOnce({
    participants: compactParticipants,
    teamSize,
    remainderPolicy,
    targetTeamCount: targetTeamSizes.length,
    targetTeamSizes,
    customPrompt: normalizedPrompt,
    env
  });

  const teams = patchAiTeams({
    aiTeams: parseSlotResponse(ai, targetTeamSizes, memberById),
    memberById,
    allIds
  });
  const reason = trimText(ai?.reason || '', 180);
  const annotatedTeams = annotateTeams(teams, reason);

  const remainderRaw = ai?.remainder_decision || {};
  const remainderDecision = {
    mode: remainderRaw?.mode === 'new_team' ? 'new_team' : 'existing_teams',
    allowedTeamCountChange: Boolean(remainderRaw?.allowed_team_count_change),
    reason: trimText(remainderRaw?.reason || '', 220)
  };

  const report = buildAssignmentReport({
    reason,
    customPrompt: normalizedPrompt,
    integrityReport: null,
    aiOutput: {
      ...(ai || {}),
      final_strategy: 'ai_single_call'
    },
    warnings: Array.isArray(ai?.warnings) ? ai.warnings : [],
    remainderDecision
  });

  return { teams: annotatedTeams, report };
};
