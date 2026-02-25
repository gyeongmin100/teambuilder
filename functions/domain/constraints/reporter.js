import { trimText } from '../../shared/text.js';

const toArray = (value) => (Array.isArray(value) ? value : []);

const buildAssignmentReport = ({
  reason,
  customPrompt,
  integrityReport,
  aiOutput,
  warnings = [],
  remainderDecision = null
}) => {
  const summaryCandidates = [
    aiOutput?.global_report,
    aiOutput?.full_report,
    aiOutput?.report,
    aiOutput?.summary,
    aiOutput?.reason,
    reason
  ];

  const summary = String(
    summaryCandidates.find((value) => String(value || '').trim()) || '배정 보고서가 생성되었습니다.'
  ).trim();

  return {
    summary: trimText(summary, 12000),
    originalPrompt: trimText(customPrompt || '', 2000),
    promptChecklist: toArray(aiOutput?.prompt_checklist),
    integrity: integrityReport || null,
    requestReview: toArray(aiOutput?.request_reflection?.intent_results),
    remainderDecision: remainderDecision
      ? {
          mode: remainderDecision.mode || 'existing_teams',
          allowedTeamCountChange: Boolean(remainderDecision.allowedTeamCountChange),
          reason: trimText(remainderDecision.reason || '', 220)
        }
      : null,
    warnings: (warnings || []).map((w) => trimText(w, 260)).filter(Boolean)
  };
};

export { buildAssignmentReport };
