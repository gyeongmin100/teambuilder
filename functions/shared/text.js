export const parseJsonSafe = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const trimText = (value, max = 120) => String(value || '').trim().slice(0, max);

export const norm = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '');
