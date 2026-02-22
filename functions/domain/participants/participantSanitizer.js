import { trimText } from '../../shared/text.js';

const MAX_INTRO = 260;
const MAX_FEATURES = 12;
const MAX_FEATURE_VALUE = 120;

const compactFeatures = (features) => {
  const entries = Object.entries(features || {}).slice(0, MAX_FEATURES);
  return Object.fromEntries(entries.map(([k, v]) => [trimText(k, 80), trimText(v, MAX_FEATURE_VALUE)]));
};

export const compactParticipant = (participant, index) => {
  const id = String(participant.internalId || participant.id || `participant-${index + 1}`).trim();
  return {
    id,
    displayName: trimText(participant.originalName || participant.name || id, 120),
    intro: trimText(participant.intro || '', MAX_INTRO),
    features: compactFeatures(participant.features || {}),
    identifierKey: trimText(participant.identifierKey || '', 80)
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
