import { trimText } from '../../shared/text.js';
import { compactParticipant, ensureUniqueIds } from '../participants/participantSanitizer.js';
import {
  buildSpreadTargetSizes,
  annotateTeams
} from '../teams/teamFormation.js';
import {
  buildAssignmentReport,
  callOpenAIOnce
} from '../constraints/constraintEngine.js';

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

const buildTeamsFromAiOutput = ({ ai, memberById }) => {
  if (!Array.isArray(ai?.teams) || ai.teams.length === 0) return null;
  const teams = [];
  for (let idx = 0; idx < ai.teams.length; idx += 1) {
    const team = ai.teams[idx];
    const memberIds = Array.isArray(team?.members)
      ? team.members.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const members = memberIds.map((id) => memberById.get(id)).filter(Boolean);
    teams.push({
      id: Number(team?.id) > 0 ? Number(team.id) : idx + 1,
      members,
      analysis: trimText(team?.analysis || '', 220)
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

  const memberById = normalizeMembersById(compactParticipants);

  const ai = await callOpenAIOnce({
    participants: compactParticipants,
    teamSize,
    remainderPolicy,
    targetTeamCount,
    targetTeamSizes,
    customRemainderPlan,
    customPrompt,
    feedback: '',
    env
  });

  const teams = buildTeamsFromAiOutput({ ai, memberById });
  if (!teams) {
    throw new Error('AI 팀 배정 응답이 비어 있습니다.');
  }

  const remainderDecision = normalizeRemainderDecision(ai);
  const allowTeamCountChange =
    remainderPolicy === 'custom' &&
    hasExplicitTeamCountChangeIntent(customPrompt) &&
    remainderDecision.allowedTeamCountChange &&
    remainderDecision.mode === 'new_team';
  const reason = trimText(ai?.reason || '', 180);
  const annotatedTeams = annotateTeams(teams, reason);
  const requestReview = extractRequestReview(ai || {}, customPrompt);
  const warnings = [
    ...(Array.isArray(ai?.warnings) ? ai.warnings : [])
  ];

  const report = buildAssignmentReport({
    teams: annotatedTeams,
    reason,
    usedFallback: false,
    customPrompt,
    integrityReport: {
      ok: null,
      totalParticipants: compactParticipants.length,
      expectedTeamCount: targetTeamCount,
      allowTeamCountChange,
      actualTeamCount: annotatedTeams.length,
      expectedTeamSizes: targetTeamSizes,
      actualTeamSizes: annotatedTeams.map((team) => team.members.length),
      duplicateCount: null,
      missingCount: null,
      invalidCount: null,
      teamCountMatch: null,
      teamSizeRuleMatch: null
    },
    requestReview,
    warnings,
    remainderDecision
  });

  return { teams: annotatedTeams, report };
};
