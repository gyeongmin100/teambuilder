import { jsonResponse } from '../shared/http.js';
import { trimText } from '../shared/text.js';
import { compactParticipant, ensureUniqueIds } from '../domain/participants/participantSanitizer.js';
import {
  createSeededRandom,
  createSpreadTeams,
  buildBaseTeams,
  annotateTeams
} from '../domain/teams/teamFormation.js';
import { normalizeAiTeams } from '../domain/teams/aiNormalization.js';
import {
  ruleBasedParseConstraints,
  normalizeConstraints,
  collectUnsupportedConstraints,
  evaluateFeasibility,
  enforceMinPerTeamConstraints,
  enforceMaxPerTeamConstraints,
  localSearchImprove,
  summarizeConstraintStatus,
  matchConstraintValue,
  softObjectivePenalty,
  analyzeConstraintConsistency,
  buildAssignmentReport,
  callOpenAIConstraintParser,
  callOpenAIOnce
} from '../domain/constraints/constraintEngine.js';
import { verifyPaidCheckout } from '../infrastructure/polar/checkoutVerification.js';

export const __test__ = {
  ruleBasedParseConstraints,
  normalizeConstraints,
  evaluateFeasibility,
  enforceMinPerTeamConstraints,
  enforceMaxPerTeamConstraints,
  localSearchImprove,
  summarizeConstraintStatus,
  matchConstraintValue,
  softObjectivePenalty,
  analyzeConstraintConsistency
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
    const remainderModeRaw =
      config.remainderMode === 'keep_partial'
        ? 'keep_partial'
        : config.remainderMode === 'prompt'
          ? 'prompt'
          : 'spread';
    const fallbackRemainderMode = remainderModeRaw === 'keep_partial' ? 'keep_partial' : 'spread';

    const compact = ensureUniqueIds(participants.map(compactParticipant).filter((p) => p.id));
    if (compact.length < 2) {
      return jsonResponse({ error: '배정 가능한 참가자가 2명 미만입니다.' }, 400);
    }

    const seedInput = `${checkoutId}|${teamSize}|${remainderModeRaw}|${compact.map((p) => p.id).join(',')}`;
    const rand = createSeededRandom(seedInput);

    const memberById = new Map(
      compact.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.displayName,
          style: '',
          intro: p.intro,
          features: p.features || {},
          identifierKey: p.identifierKey || ''
        }
      ])
    );

    const promptText = String(customPrompt || '').trim();
    const AI_TRUST_MODE = true;
    let aiConstraints = [];

    if (promptText) {
      try {
        aiConstraints = await callOpenAIConstraintParser({
          customPrompt: promptText,
          participants: compact,
          env
        });
      } catch (error) {
        console.error('Constraint parse failed:', error);
      }
    }

    aiConstraints = (aiConstraints || []).map((x) => ({ ...x, __source: 'ai' }));

    let rawConstraints = aiConstraints;
    if (promptText && aiConstraints.length === 0) {
      rawConstraints = [
        {
          type: 'ambiguity_note',
          reason: 'AI 제약 해석 결과가 비어 있어 자동 검증 가능한 제약을 생성하지 못했습니다.',
          rawText: 'AI 제약 해석 실패/빈 결과',
          priority: 'soft',
          __source: 'ai'
        },
        {
          type: 'raw_request',
          instruction: trimText(promptText, 220),
          rawText: trimText(promptText, 220),
          priority: 'soft',
          __source: 'ai'
        }
      ];
    }

    const constraints = normalizeConstraints({ rawConstraints, participants: compact });
    const unsupportedConstraints = collectUnsupportedConstraints(rawConstraints);
    const teamCount =
      remainderModeRaw === 'keep_partial'
        ? Math.max(1, Math.floor(compact.length / teamSize) + (compact.length % teamSize > 0 ? 1 : 0))
        : createSpreadTeams(compact.length, teamSize);

    const feasibility = evaluateFeasibility({
      constraints,
      participants: compact,
      teamCount
    });

    let ai = null;
    let reason = 'AI 팀배정 완료';

    try {
      ai = await callOpenAIOnce({
        participants: compact,
        teamSize,
        remainderMode: remainderModeRaw,
        customPrompt: promptText,
        constraints,
        env
      });
      reason = trimText(ai?.reason || 'AI 팀배정 완료', 120);
    } catch (e) {
      console.error('OpenAI single-call failed:', e);
    }

    let teams;
    if (ai?.teams && Array.isArray(ai.teams)) {
      const normalized = normalizeAiTeams({
        aiTeams: ai.teams,
        memberById,
        teamSize,
        remainderMode: remainderModeRaw,
        rand,
        constraints,
        trustAi: AI_TRUST_MODE
      });

      if (normalized.valid) {
        teams = normalized.teams.map((team, idx) => ({
          id: team.id || idx + 1,
          members: team.memberIds.map((id) => memberById.get(id)).filter(Boolean),
          analysis: team.analysis || `${team.memberIds.length}명 구성`
        }));
      }
    }

    if (!teams || teams.length === 0) {
      teams = buildBaseTeams(Array.from(memberById.values()), teamSize, fallbackRemainderMode, rand);
      reason = remainderModeRaw === 'prompt'
        ? '프롬프트 해석 결과가 불충분하여 안정적인 기본 규칙(spread)으로 배정'
        : '자동 배정 과정에서 일부 조건을 재조정해 안정적인 결과로 확정';
    }

    const annotatedTeams = annotateTeams(teams, reason);
    const report = buildAssignmentReport({
      teams: annotatedTeams,
      constraints,
      feasibility,
      reason,
      teamSize,
      remainderMode: remainderModeRaw,
      usedFallback: !ai?.teams || !Array.isArray(ai.teams),
      unsupportedConstraints,
      customPrompt: promptText
    });

    return jsonResponse({
      teams: annotatedTeams,
      report
    });
  } catch (error) {
    return jsonResponse({ error: error.message || '팀 배정 중 오류가 발생했습니다.' }, 500);
  }
}
