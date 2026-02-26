import { jsonResponse } from '../shared/http.js';
import { assignTeamsWithValidation } from '../domain/assignment/engine.js';
import { verifyPaidCheckout } from '../infrastructure/polar/checkoutVerification.js';
import {
  ruleBasedParseConstraints,
  normalizeConstraints,
  evaluateFeasibility,
  softObjectivePenalty,
  analyzeConstraintConsistency,
  localSearchImprove
} from '../domain/constraints/constraintEngine.js';

export const __test__ = {
  ruleBasedParseConstraints,
  normalizeConstraints,
  evaluateFeasibility,
  softObjectivePenalty,
  analyzeConstraintConsistency,
  localSearchImprove
};

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const {
      participants = [],
      config = {},
      customPrompt = '',
      checkout_id: checkoutId = ''
    } = body;
    const normalizedPrompt = String(customPrompt || '').trim();
    const needsPaidFlow = normalizedPrompt.length > 0;

    if (!Array.isArray(participants) || participants.length < 2) {
      return jsonResponse({ error: '최소 2명 이상의 참가자가 필요합니다.' }, 400);
    }

    if (needsPaidFlow && !env.OPENAI_API_KEY) {
      return jsonResponse({ error: 'OPENAI_API_KEY가 없습니다.' }, 500);
    }

    if (needsPaidFlow) {
      await verifyPaidCheckout({ checkoutId, env });
    }

    const result = await assignTeamsWithValidation({
      participants,
      config,
      customPrompt: normalizedPrompt,
      checkoutId,
      env
    });

    return jsonResponse(result);
  } catch (error) {
    const message = error?.message || '팀 배정 중 오류가 발생했습니다.';
    const statusCode = message.includes('2명 미만') ? 400 : 500;
    return jsonResponse({ error: message }, statusCode);
  }
}
