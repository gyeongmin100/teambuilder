import { norm } from '../shared/normalize';
import { createInternalId } from './internalId';

const guessNameFromRow = (row) => {
  const aliases = ['\uC774\uB984', '\uC131\uBA85', 'name', 'fullname', 'studentname'];
  const keys = Object.keys(row || {});
  const targetKey = keys.find((key) => aliases.includes(norm(key)));
  return targetKey ? String(row[targetKey] || '').trim() : '';
};

const guessIntroFromRow = (row) => {
  const aliases = ['\uC790\uAE30\uC18C\uAC1C', '\uC18C\uAC1C', 'intro', 'introduction'];
  const keys = Object.keys(row || {});
  const targetKey = keys.find((key) => aliases.includes(norm(key)));
  return targetKey ? String(row[targetKey] || '').trim() : '';
};

export const mapRowsToParticipants = (rows, source) => {
  const list = Array.isArray(rows) ? rows : [];
  let skipped = 0;

  const participants = list
    .map((row, index) => {
      const raw = row && typeof row === 'object' ? row : {};
      const features = {};

      for (const [key, value] of Object.entries(raw)) {
        const normalizedKey = String(key || '').trim();
        const normalizedValue = String(value ?? '').trim();
        if (!normalizedKey || !normalizedValue) continue;
        features[normalizedKey] = normalizedValue;
      }

      if (Object.keys(features).length === 0) {
        skipped += 1;
        return null;
      }

      const guessedName = guessNameFromRow(raw);
      const intro = guessIntroFromRow(raw);
      const fallbackName = guessedName || `\uCC38\uAC00\uC790-${index + 1}`;

      return {
        id: Date.now() + index,
        internalId: createInternalId(),
        name: fallbackName,
        originalName: fallbackName,
        intro,
        source,
        features
      };
    })
    .filter(Boolean);

  return { participants, mapped: participants.length, skipped };
};
