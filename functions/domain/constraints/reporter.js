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
  const rawAi = aiOutput || null;

  return {
    summary: cleanText(rawAi?.reason || reason || ''),
    originalPrompt: cleanText(customPrompt || ''),
    promptChecklist: toArray(rawAi?.prompt_checklist),
    finalStrategy: cleanText(rawAi?.final_strategy || ''),
    integrity: integrityReport || null,
    requestReview: toArray(rawAi?.request_reflection?.intent_results),
    remainderDecision: remainderDecision
      ? {
          mode: remainderDecision.mode || 'existing_teams',
          allowedTeamCountChange: Boolean(remainderDecision.allowedTeamCountChange),
          reason: cleanText(remainderDecision.reason || '')
        }
      : null,
    warnings: (warnings || []).map((w) => cleanText(w)).filter(Boolean),
    rawAi
  };
};

export { buildAssignmentReport };
