const MAX_FEATURES = 20;
const MAX_FEATURE_KEY = 40;
const MAX_FEATURE_VALUE = 160;

const compactFeatures = (features) => {
  const entries = Object.entries(features || {}).slice(0, MAX_FEATURES);
  const cleaned = entries
    .map(([key, value]) => [
      String(key || '').trim().slice(0, MAX_FEATURE_KEY),
      String(value ?? '').trim().slice(0, MAX_FEATURE_VALUE)
    ])
    .filter(([key, value]) => key.length > 0 && value.length > 0);
  return Object.fromEntries(cleaned);
};

export const compactParticipant = (participant, index) => {
  const id = String(participant.internalId || participant.id || `participant-${index + 1}`).trim();
  return {
    id,
    displayName: String(participant.originalName || participant.name || id).trim(),
    intro: String(participant.intro || '').trim(),
    features: compactFeatures(participant.features || {}),
    identifierKey: String(participant.identifierKey || '').trim()
  };
};

export const ensureUniqueIds = (participants) => {
  const seen = new Map();
  return participants.map((participant) => {
    const base = String(participant.id || '').trim() || `participant-${seen.size + 1}`;
    const next = (seen.get(base) || 0) + 1;
    seen.set(base, next);
    if (next === 1) return { ...participant, id: base };
    return { ...participant, id: `${base}__${next}` };
  });
};
