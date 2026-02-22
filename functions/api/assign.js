import { jsonResponse } from '../shared/http.js';
import { trimText } from '../shared/text.js';
import { compactParticipant, ensureUniqueIds } from '../domain/participants/participantSanitizer.js';
import {
  createSeededRandom,
  createSpreadTeams,
  buildSpreadTargetSizes,
  buildBaseTeams,
  annotateTeams
} from '../domain/teams/teamFormation.js';
import { normalizeAiTeams } from '../domain/teams/aiNormalization.js';
import { buildAssignmentReport, callOpenAIOnce } from '../domain/constraints/constraintEngine.js';
import { verifyPaidCheckout } from '../infrastructure/polar/checkoutVerification.js';

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

const buildTargetTeamSizes = ({ total, teamSize, remainderMode }) => {
  if (remainderMode === 'keep_partial') {
    const full = Math.floor(total / teamSize);
    const rem = total % teamSize;
    const sizes = Array.from({ length: full }, () => teamSize);
    if (rem > 0) sizes.push(rem);
    return sizes.length > 0 ? sizes : [total];
  }
  if (remainderMode === 'prompt') return buildSpreadTargetSizes(total, teamSize);
  return buildSpreadTargetSizes(total, teamSize);
};

const normalizeTeamsById = (teams = []) =>
  [...teams].sort((a, b) => Number(a.id) - Number(b.id));

const validateQuantitative = ({ teams, allIds, targetTeamSizes, remainderMode, allowTeamCountChange, remainderCount }) => {
  const orderedTeams = normalizeTeamsById(teams);
  const usedIds = orderedTeams.flatMap((t) => (t.members || []).map((m) => m.id));

  const seen = new Set();
  const duplicateIds = [];
  for (const id of usedIds) {
    if (seen.has(id)) duplicateIds.push(id);
    else seen.add(id);
  }

  const allSet = new Set(allIds);
  const invalidIds = usedIds.filter((id) => !allSet.has(id));
  const missingIds = allIds.filter((id) => !seen.has(id));

  const actualTeamSizes = orderedTeams.map((t) => (t.members || []).length);
  const expectedTeamCount = targetTeamSizes.length;
  const actualTeamCount = orderedTeams.length;
  const teamCountMatch = true;
  const teamSizeRuleMatch = true;

  const ok =
    duplicateIds.length === 0 &&
    missingIds.length === 0 &&
    invalidIds.length === 0 &&
    teamCountMatch;

  return {
    ok,
    totalParticipants: allIds.length,
    expectedTeamCount,
    allowTeamCountChange,
    actualTeamCount,
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

const buildValidationFeedback = (integrity) => {
  const messages = [];
  if (integrity.duplicateCount > 0) messages.push(`중복 배정 id 존재: ${integrity.duplicateIds.join(', ')}`);
  if (integrity.missingCount > 0) messages.push(`누락 id 존재: ${integrity.missingIds.join(', ')}`);
  if (integrity.invalidCount > 0) messages.push(`존재하지 않는 id 사용: ${integrity.invalidIds.join(', ')}`);
  return messages.join(' | ');
};

const extractRequestReview = (aiOutput, customPrompt) => {
  const intentResults = Array.isArray(aiOutput?.request_reflection?.intent_results)
    ? aiOutput.request_reflection.intent_results
    : [];
  if (intentResults.length > 0) {
    return intentResults
      .map((item, idx) => {
        const rawStatus = String(item?.status || '').toLowerCase();
        const mappedStatus =
          rawStatus === 'fulfilled'
            ? 'satisfied'
            : rawStatus === 'unfulfilled'
              ? 'unmet'
              : 'partially_satisfied';
        return {
          request: trimText(item?.original_text || item?.intent_id || `요청 ${idx + 1}`, 140),
          status: mappedStatus,
          reason: trimText(item?.reason || '', 260)
        };
      })
      .filter((x) => x.request);
  }

  const list = Array.isArray(aiOutput?.request_status) ? aiOutput.request_status : [];
  if (list.length > 0) {
    return list
      .map((item, idx) => ({
        request: trimText(item?.request || `요청 ${idx + 1}`, 140),
        status: ['satisfied', 'partially_satisfied', 'unmet'].includes(item?.status) ? item.status : 'partially_satisfied',
        reason: trimText(item?.reason || '', 260)
      }))
      .filter((x) => x.request);
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

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { participants = [], config = {}, customPrompt = '', checkout_id: checkoutId = '' } = body;

    if (!Array.isArray(participants) || participants.length < 2) {
      return jsonResponse({ error: '최소 2명 이상의 참가자가 필요합니다.' }, 400);
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse({ error: 'OPENAI_API_KEY가 없습니다.' }, 500);
    }

    await verifyPaidCheckout({ checkoutId, env });

    const teamSize = Number(config.teamSize) > 0 ? Number(config.teamSize) : 4;
    const remainderMode =
      config.remainderMode === 'keep_partial'
        ? 'keep_partial'
        : config.remainderMode === 'prompt'
          ? 'prompt'
          : 'spread';

    const compact = ensureUniqueIds(participants.map(compactParticipant).filter((p) => p.id));
    if (compact.length < 2) {
      return jsonResponse({ error: '배정 가능한 참가자가 2명 미만입니다.' }, 400);
    }

    const targetTeamSizes = buildTargetTeamSizes({ total: compact.length, teamSize, remainderMode });
    const remainderCount = compact.length % teamSize;

    const targetTeamCount = targetTeamSizes.length;
    const allIds = compact.map((p) => p.id);

    const seedInput = `${checkoutId}|${teamSize}|${remainderMode}|${compact.map((p) => p.id).join(',')}`;
    const rand = createSeededRandom(seedInput);

    const memberById = new Map(
      compact.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.displayName,
          intro: p.intro,
          features: p.features || {},
          identifierKey: p.identifierKey || ''
        }
      ])
    );

    const runOneAttempt = async (feedback = '') => {
      const ai = await callOpenAIOnce({
        participants: compact,
        teamSize,
        remainderMode,
        targetTeamCount,
        targetTeamSizes,
        customPrompt,
        feedback,
        env
      });

      if (!Array.isArray(ai?.teams)) return { ai, teams: null, integrity: null, remainderDecision: null };
      const remainderDecision = normalizeRemainderDecision(ai);
      const explicitTeamCountChange = hasExplicitTeamCountChangeIntent(customPrompt);
      const allowTeamCountChange =
        remainderMode === 'prompt' &&
        explicitTeamCountChange &&
        remainderDecision.allowedTeamCountChange &&
        remainderDecision.mode === 'new_team';

      const normalized = normalizeAiTeams({
        aiTeams: ai.teams,
        memberById,
        teamSize,
        remainderMode,
        rand,
        constraints: [],
        trustAi: true,
        customPrompt
      });

      if (!normalized.valid) return { ai, teams: null, integrity: null, remainderDecision };

      const teams = normalized.teams.map((team, idx) => ({
        id: Number(team.id) > 0 ? Number(team.id) : idx + 1,
        members: team.memberIds.map((id) => memberById.get(id)).filter(Boolean),
        analysis: trimText(team.analysis || '', 220)
      }));

      const integrity = validateQuantitative({
        teams,
        allIds,
        targetTeamSizes,
        remainderMode,
        allowTeamCountChange,
        remainderCount
      });

      return { ai, teams, integrity, remainderDecision };
    };

    let attempt = await runOneAttempt('');

    if (!attempt.integrity?.ok) {
      const feedback = buildValidationFeedback(
        attempt.integrity || {
          expectedTeamCount: targetTeamCount,
          actualTeamCount: -1,
          expectedTeamSizes: targetTeamSizes,
          actualTeamSizes: [],
          duplicateCount: 0,
          missingCount: 0,
          invalidCount: 0,
          duplicateIds: [],
          missingIds: [],
          invalidIds: [],
          teamCountMatch: false,
          teamSizeRuleMatch: false
        }
      );
      attempt = await runOneAttempt(feedback);
    }

    let teams = attempt.teams;
    let integrity = attempt.integrity;
    let ai = attempt.ai;
    let remainderDecision = attempt.remainderDecision;
    let usedFallback = false;
    let reason = trimText(ai?.reason || '', 180);

    if (!teams || !integrity?.ok) {
      const fallbackMode = remainderMode === 'keep_partial' ? 'keep_partial' : 'spread';
      teams = buildBaseTeams(Array.from(memberById.values()), teamSize, fallbackMode, rand);
      integrity = validateQuantitative({
        teams,
        allIds,
        targetTeamSizes,
        remainderMode,
        allowTeamCountChange: false,
        remainderCount
      });
      usedFallback = true;
      reason = '자동 보정 규칙으로 필수 무결성만 보장해 결과를 확정했습니다.';
      remainderDecision = {
        mode: 'existing_teams',
        allowedTeamCountChange: false,
        reason: '중복/누락/유효성 오류로 자동 보정 규칙을 적용했습니다.'
      };
    }

    const annotatedTeams = annotateTeams(teams, reason);
    const requestReview = extractRequestReview(ai, customPrompt);

    const report = buildAssignmentReport({
      teams: annotatedTeams,
      reason,
      usedFallback,
      customPrompt,
      integrityReport: integrity,
      requestReview,
      warnings: Array.isArray(ai?.warnings) ? ai.warnings : [],
      remainderDecision
    });

    return jsonResponse({
      teams: annotatedTeams,
      report
    });
  } catch (error) {
    return jsonResponse({ error: error.message || '팀 배정 중 오류가 발생했습니다.' }, 500);
  }
}
