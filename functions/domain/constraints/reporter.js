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
  const promptChecklist = toArray(aiOutput?.prompt_checklist);
  const appliedRequests = promptChecklist
    .filter((item) => item?.is_relevant === true || /applied|반영/i.test(String(item?.status || item?.statusLabel || '')))
    .map((item) => ({
      item: trimText(String(item?.item || item?.text || item?.request || ''), 320),
      reason: trimText(String(item?.reason || ''), 500)
    }))
    .filter((item) => item.item);
  const ignoredRequests = promptChecklist
    .filter((item) => item?.is_relevant === false || /ignored|무시/i.test(String(item?.status || item?.statusLabel || '')))
    .map((item) => ({
      item: trimText(String(item?.item || item?.text || item?.request || ''), 320),
      reason: trimText(String(item?.ignore_reason || item?.reason || ''), 500)
    }))
    .filter((item) => item.item);

  return {
    summary: trimText(summary, 12000),
    originalPrompt: trimText(customPrompt || '', 2000),
    promptChecklist,
    finalStrategy: trimText(String(aiOutput?.final_strategy || ''), 120),
    appliedRequests,
    ignoredRequests,
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
