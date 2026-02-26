import { trimText } from '../../shared/text.js';
import { compactParticipant, ensureUniqueIds } from '../participants/participantSanitizer.js';
import { buildSpreadTargetSizes, annotateTeams } from '../teams/teamFormation.js';
import { buildAssignmentReport, callOpenAIOnce } from '../constraints/constraintEngine.js';

const hasExplicitTeamCountChangeIntent = (customPrompt = '') => {
  const text = String(customPrompt || '').toLowerCase();
  if (!text) return false;
  return (
    /새\s*팀|신규\s*팀|팀\s*추가|팀\s*늘|팀\s*하나\s*더|new\s*team|add\s*team/.test(text) ||
    /마지막\s*팀\s*만들|남은\s*인원\s*팀/.test(text)
  );
};

const normalizeRemainderDecision = (ai = {}) => {
  const raw = ai?.remainder_decision || {};
  const mode = raw?.mode === 'new_team' ? 'new_team' : 'existing_teams';
  const allowedTeamCountChange = Boolean(raw?.allowed_team_count_change);
  return {
    mode,
    allowedTeamCountChange,
    reason: trimText(raw?.reason || '', 220)
  };
};

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

const flattenAiMemberOrder = (aiTeams = [], allIdSet) => {
  const used = new Set();
  const ordered = [];
  let duplicateInAi = 0;
  let unknownInAi = 0;

  for (const team of aiTeams) {
    const memberIds = Array.isArray(team?.members)
      ? team.members.map((raw) => String(raw || '').trim()).filter(Boolean)
      : [];

    for (const id of memberIds) {
      if (!allIdSet.has(id)) {
        unknownInAi += 1;
        continue;
      }
      if (used.has(id)) {
        duplicateInAi += 1;
        continue;
      }
      used.add(id);
      ordered.push(id);
    }
  }

  return { ordered, used, duplicateInAi, unknownInAi };
};

const buildSlottedTeams = ({ ai, memberById, allIds, targetTeamSizes }) => {
  if (!Array.isArray(ai?.teams) || ai.teams.length === 0) return null;

  const allIdSet = new Set(allIds);
  const { ordered, used, duplicateInAi, unknownInAi } = flattenAiMemberOrder(ai.teams, allIdSet);
  const missingFromAi = allIds.filter((id) => !used.has(id));
  const finalOrder = [...ordered, ...missingFromAi];

  const teams = [];
  let cursor = 0;

  for (let teamIdx = 0; teamIdx < targetTeamSizes.length; teamIdx += 1) {
    const size = Number(targetTeamSizes[teamIdx]) || 0;
    const members = [];
    for (let n = 0; n < size && cursor < finalOrder.length; n += 1) {
      const member = memberById.get(finalOrder[cursor]);
      if (member) members.push(member);
      cursor += 1;
    }

    teams.push({
      id: teamIdx + 1,
      members,
      analysis: trimText(ai?.teams?.[teamIdx]?.analysis || '', 220)
    });
  }

  const warnings = [];
  if (duplicateInAi > 0) warnings.push(`AI 응답의 중복 인원 ${duplicateInAi}건을 자동 보정했습니다.`);
  if (unknownInAi > 0) warnings.push(`AI 응답의 미등록 인원 ${unknownInAi}건을 제외했습니다.`);
  if (missingFromAi.length > 0) warnings.push(`AI 응답 누락 인원 ${missingFromAi.length}명을 남은 슬롯에 자동 배치했습니다.`);

  return { teams, warnings };
};

const arraysEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const validateIntegrity = ({ teams, allIds, targetTeamSizes }) => {
  const usedIds = teams.flatMap((team) => (team.members || []).map((member) => member.id));

  const seen = new Set();
  const duplicateIds = [];
  for (const id of usedIds) {
    if (seen.has(id)) duplicateIds.push(id);
    else seen.add(id);
  }

  const allIdSet = new Set(allIds);
  const invalidIds = usedIds.filter((id) => !allIdSet.has(id));
  const missingIds = allIds.filter((id) => !seen.has(id));

  const actualTeamSizes = teams.map((team) => (team.members || []).length);
  const teamCountMatch = teams.length === targetTeamSizes.length;
  const teamSizeRuleMatch = arraysEqual(actualTeamSizes, targetTeamSizes);

  const ok =
    duplicateIds.length === 0 &&
    invalidIds.length === 0 &&
    missingIds.length === 0 &&
    teamCountMatch &&
    teamSizeRuleMatch;

  return {
    ok,
    totalParticipants: allIds.length,
    expectedTeamCount: targetTeamSizes.length,
    actualTeamCount: teams.length,
    expectedTeamSizes: targetTeamSizes,
    actualTeamSizes,
    duplicateCount: duplicateIds.length,
    missingCount: missingIds.length,
    invalidCount: invalidIds.length,
    teamCountMatch,
    teamSizeRuleMatch,
    duplicateIds: duplicateIds.slice(0, 8),
    missingIds: missingIds.slice(0, 8),
    invalidIds: invalidIds.slice(0, 8)
  };
};

const buildRetryFeedback = (integrity) => {
  if (!integrity) {
    return [
      '배정 결과가 비어 있습니다.',
      'targetTeamSizes를 정확히 만족하도록 다시 배정하세요.',
      '중요: 팀 틀 제약과 사용자 요청 프롬프트 조건을 동시에 만족하도록 전체 배치를 다시 최적화하세요.',
      '중요: 수정된 최종 팀 배치 기준으로 prompt_checklist, applied_detail, evidence를 다시 작성하세요.'
    ].join(' | ');
  }

  const messages = [];
  if (!integrity.teamCountMatch) {
    messages.push(`팀 수가 다릅니다. expected=${integrity.expectedTeamCount}, actual=${integrity.actualTeamCount}`);
  }
  if (!integrity.teamSizeRuleMatch) {
    messages.push(
      `팀별 인원수가 틀렸습니다. expected=${JSON.stringify(integrity.expectedTeamSizes)}, actual=${JSON.stringify(
        integrity.actualTeamSizes
      )}`
    );
  }
  if (integrity.duplicateCount > 0) messages.push(`중복 id: ${integrity.duplicateIds.join(', ')}`);
  if (integrity.missingCount > 0) messages.push(`누락 id: ${integrity.missingIds.join(', ')}`);
  if (integrity.invalidCount > 0) messages.push(`미등록 id: ${integrity.invalidIds.join(', ')}`);

  const retryInstructions = [
    '중요: 위 위반사항을 해결하면서 targetTeamSizes(팀 수/팀별 인원수) 제약을 정확히 만족하도록 다시 배정하세요.',
    '중요: 동시에 사용자 요청 프롬프트 조건을 최대한 반영하도록 전체 배치를 다시 최적화하세요.',
    '중요: 최종 수정된 팀 배치를 기준으로 prompt_checklist, applied_detail, evidence를 다시 작성하세요.'
  ];

  return [...messages, ...retryInstructions].join(' | ');
};

const shuffleIds = (ids = []) => {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const buildLocalRandomTeams = ({ memberById, allIds, targetTeamSizes, analysis = '' }) => {
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
      analysis: analysis || '맞춤 프롬프트 미사용: 내부 랜덤 로직으로 배정했습니다.'
    });
  }

  return teams;
};

const runOneAttempt = async ({
  compactParticipants,
  memberById,
  allIds,
  teamSize,
  remainderPolicy,
  targetTeamCount,
  targetTeamSizes,
  customPrompt,
  feedback,
  env
}) => {
  const ai = await callOpenAIOnce({
    participants: compactParticipants,
    teamSize,
    remainderPolicy,
    targetTeamCount,
    targetTeamSizes,
    customPrompt,
    feedback,
    env
  });

  const slotted = buildSlottedTeams({
    ai,
    memberById,
    allIds,
    targetTeamSizes
  });

  if (!slotted?.teams) {
    return {
      ai,
      teams: null,
      integrity: {
        ok: false,
        totalParticipants: allIds.length,
        expectedTeamCount: targetTeamCount,
        actualTeamCount: 0,
        expectedTeamSizes: targetTeamSizes,
        actualTeamSizes: [],
        duplicateCount: 0,
        missingCount: allIds.length,
        invalidCount: 0,
        teamCountMatch: false,
        teamSizeRuleMatch: false,
        duplicateIds: [],
        missingIds: allIds.slice(0, 8),
        invalidIds: []
      },
      warnings: ['AI 응답에 유효한 팀 정보가 없어 재시도가 필요합니다.']
    };
  }

  const integrity = validateIntegrity({
    teams: slotted.teams,
    allIds,
    targetTeamSizes
  });

  return {
    ai,
    teams: slotted.teams,
    integrity,
    warnings: slotted.warnings || []
  };
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
  const targetTeamCount = targetTeamSizes.length;
  const allIds = compactParticipants.map((participant) => participant.id);
  const memberById = normalizeMembersById(compactParticipants);

  const attemptContext = {
    compactParticipants,
    memberById,
    allIds,
    teamSize,
    remainderPolicy,
    targetTeamCount,
    targetTeamSizes,
    env
  };
  const hasCustomPrompt = String(customPrompt || '').trim().length > 0;
  const useLocalRandomByNoPrompt = !hasCustomPrompt;
  let attempt = null;
  let retryUsed = false;
  let filteredPrompt = String(customPrompt || '').trim();
  const finalStrategy = hasCustomPrompt ? 'ai_single_call' : 'local_random_no_prompt';
  const useLocalRandom = useLocalRandomByNoPrompt;

  if (useLocalRandom) {
    const randomAnalysis = '맞춤 프롬프트 미사용: 내부 랜덤 로직으로 배정했습니다.';
    const localTeams = buildLocalRandomTeams({
      memberById,
      allIds,
      targetTeamSizes,
      analysis: randomAnalysis
    });
    attempt = {
      ai: {
        reason: randomAnalysis,
        final_strategy: finalStrategy,
        prompt_checklist: [],
        warnings: []
      },
      teams: localTeams,
      integrity: validateIntegrity({
        teams: localTeams,
        allIds,
        targetTeamSizes
      }),
      warnings: []
    };
  } else {
    attempt = await runOneAttempt({
      ...attemptContext,
      customPrompt: filteredPrompt,
      feedback: ''
    });
  }
  if (!useLocalRandom && !attempt.integrity?.ok) {
    retryUsed = true;
    const feedback = buildRetryFeedback(attempt.integrity);
    const retried = await runOneAttempt({
      ...attemptContext,
      customPrompt: filteredPrompt,
      feedback
    });

    if (retried.integrity?.ok) {
      attempt = retried;
    } else {
      throw new Error(`자동 재시도 후에도 배정 정합성을 만족하지 못했습니다. ${buildRetryFeedback(retried.integrity)}`);
    }
  }

  const remainderDecision = normalizeRemainderDecision(attempt.ai);
  const allowTeamCountChange =
    remainderPolicy === 'one_team' &&
    hasExplicitTeamCountChangeIntent(filteredPrompt) &&
    remainderDecision.allowedTeamCountChange &&
    remainderDecision.mode === 'new_team';
  attempt.ai = {
    ...(attempt.ai || {}),
    final_strategy: finalStrategy
  };

  const reason = trimText(attempt.ai?.reason || '', 180);
  const annotatedTeams = annotateTeams(attempt.teams, reason);

  const warnings = [
    ...(Array.isArray(attempt.ai?.warnings) ? attempt.ai.warnings : []),
    ...(Array.isArray(attempt.warnings) ? attempt.warnings : []),
    ...(retryUsed ? ['정합성 실패로 1회 자동 재시도를 수행했습니다.'] : [])
  ];

  const report = buildAssignmentReport({
    teams: annotatedTeams,
    reason,
    customPrompt,
    integrityReport: {
      ...attempt.integrity,
      allowTeamCountChange
    },
    aiOutput: attempt.ai || {},
    warnings,
    remainderDecision
  });

  return { teams: annotatedTeams, report };
};

