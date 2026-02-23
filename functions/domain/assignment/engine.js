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
  if (config.remainderPolicy === 'custom') return 'custom';
  return 'spread';
};

const normalizeCustomRemainderPlan = (raw, baseTeamCount) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (let teamId = 1; teamId <= baseTeamCount; teamId += 1) {
    const n = Number(source[teamId]);
    out[teamId] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
};

const buildTargetTeamSizes = ({ total, teamSize, remainderPolicy, customRemainderPlan }) => {
  if (remainderPolicy === 'new_team') {
    const full = Math.floor(total / teamSize);
    const rem = total % teamSize;
    const sizes = Array.from({ length: full }, () => teamSize);
    if (rem > 0) sizes.push(rem);
    return sizes.length > 0 ? sizes : [total];
  }

  if (remainderPolicy === 'custom') {
    const baseTeamCount = Math.floor(total / teamSize);
    const remainder = total % teamSize;
    if (baseTeamCount <= 0 || remainder === 0) return buildSpreadTargetSizes(total, teamSize);

    const plan = normalizeCustomRemainderPlan(customRemainderPlan, baseTeamCount);
    const planned = Object.values(plan).reduce((acc, value) => acc + value, 0);
    if (planned !== remainder) {
      throw new Error(`커스텀 나머지 배분 합계(${planned})가 나머지 인원(${remainder})과 일치해야 합니다.`);
    }

    return Array.from({ length: baseTeamCount }, (_, idx) => teamSize + (plan[idx + 1] || 0));
  }

  return buildSpreadTargetSizes(total, teamSize);
};

const extractRequestReview = (aiOutput, customPrompt) => {
  const intentResults = Array.isArray(aiOutput?.request_reflection?.intent_results)
    ? aiOutput.request_reflection.intent_results
    : [];

  if (intentResults.length > 0) {
    return intentResults
      .map((item, idx) => {
        const rawStatus = String(item?.status || '').toLowerCase();
        const status =
          rawStatus === 'fulfilled'
            ? 'satisfied'
            : rawStatus === 'unfulfilled'
              ? 'unmet'
              : 'partially_satisfied';

        return {
          request: trimText(item?.original_text || item?.intent_id || `요청 ${idx + 1}`, 140),
          status,
          reason: trimText(item?.reason || '', 260)
        };
      })
      .filter((item) => item.request);
  }

  const legacy = Array.isArray(aiOutput?.request_status) ? aiOutput.request_status : [];
  if (legacy.length > 0) {
    return legacy
      .map((item, idx) => ({
        request: trimText(item?.request || `요청 ${idx + 1}`, 140),
        status: ['satisfied', 'partially_satisfied', 'unmet'].includes(item?.status)
          ? item.status
          : 'partially_satisfied',
        reason: trimText(item?.reason || '', 260)
      }))
      .filter((item) => item.request);
  }

  if (String(customPrompt || '').trim()) {
    return [
      {
        request: trimText(customPrompt, 140),
        status: 'partially_satisfied',
        reason: '자유 요청을 기준으로 최대한 반영되도록 배정했습니다. 세부 판단은 팀별 설명을 확인하세요.'
      }
    ];
  }

  return [];
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
  if (!integrity) return '배정 결과가 비어 있습니다. targetTeamSizes를 정확히 만족하도록 다시 배정하세요.';

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

  return messages.join(' | ');
};

const runOneAttempt = async ({
  compactParticipants,
  memberById,
  allIds,
  teamSize,
  remainderPolicy,
  targetTeamCount,
  targetTeamSizes,
  customRemainderPlan,
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
    customRemainderPlan,
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
  const customRemainderPlan =
    config?.customRemainderPlan && typeof config.customRemainderPlan === 'object'
      ? config.customRemainderPlan
      : {};

  const compactParticipants = ensureUniqueIds(
    participants.map(compactParticipant).filter((participant) => participant.id)
  );
  if (compactParticipants.length < 2) {
    throw new Error('배정 가능한 참가자가 2명 미만입니다.');
  }

  const targetTeamSizes = buildTargetTeamSizes({
    total: compactParticipants.length,
    teamSize,
    remainderPolicy,
    customRemainderPlan
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
    customRemainderPlan,
    customPrompt,
    env
  };

  let attempt = await runOneAttempt({
    ...attemptContext,
    feedback: ''
  });

  let retryUsed = false;
  if (!attempt.integrity?.ok) {
    retryUsed = true;
    const feedback = buildRetryFeedback(attempt.integrity);
    const retried = await runOneAttempt({
      ...attemptContext,
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
    remainderPolicy === 'custom' &&
    hasExplicitTeamCountChangeIntent(customPrompt) &&
    remainderDecision.allowedTeamCountChange &&
    remainderDecision.mode === 'new_team';

  const reason = trimText(attempt.ai?.reason || '', 180);
  const annotatedTeams = annotateTeams(attempt.teams, reason);
  const requestReview = extractRequestReview(attempt.ai || {}, customPrompt);

  const warnings = [
    ...(Array.isArray(attempt.ai?.warnings) ? attempt.ai.warnings : []),
    ...(Array.isArray(attempt.warnings) ? attempt.warnings : []),
    ...(retryUsed ? ['정합성 실패로 1회 자동 재시도를 수행했습니다.'] : [])
  ];

  const report = buildAssignmentReport({
    teams: annotatedTeams,
    reason,
    usedFallback: retryUsed,
    customPrompt,
    integrityReport: {
      ...attempt.integrity,
      allowTeamCountChange
    },
    requestReview,
    warnings,
    remainderDecision
  });

  return { teams: annotatedTeams, report };
};
