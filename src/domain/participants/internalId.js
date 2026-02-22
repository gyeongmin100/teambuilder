export const createInternalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};
