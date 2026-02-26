const toArray = (value) => (Array.isArray(value) ? value : []);
const cleanText = (value) => String(value || '').trim();

const buildAssignmentReport = ({
  reason,
  customPrompt,
  integrityReport,
  aiOutput,
  warnings = [],
  remainderDecision = null
}) => {
  const promptChecklist = toArray(aiOutput?.prompt_checklist);
  const summary = cleanText(aiOutput?.summary || aiOutput?.reason || reason || '');

  return {
    summary,
    originalPrompt: cleanText(customPrompt || ''),
    promptChecklist,
    finalStrategy: cleanText(aiOutput?.final_strategy || ''),
    integrity: integrityReport || null,
    requestReview: toArray(aiOutput?.request_reflection?.intent_results),
    remainderDecision: remainderDecision
      ? {
          mode: remainderDecision.mode || 'existing_teams',
          allowedTeamCountChange: Boolean(remainderDecision.allowedTeamCountChange),
          reason: cleanText(remainderDecision.reason || '')
        }
      : null,
    warnings: (warnings || []).map((w) => cleanText(w)).filter(Boolean),
    rawAi: aiOutput || null
  };
};

export { buildAssignmentReport };
