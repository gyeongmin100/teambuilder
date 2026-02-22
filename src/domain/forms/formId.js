export const parseFormId = (urlOrId) => {
  const raw = String(urlOrId || '').trim();
  if (!raw) return null;

  const direct = raw.match(/^[a-zA-Z0-9-_]{20,}$/);
  if (direct) return raw;

  const fromPublicUrl = raw.match(/\/forms\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (fromPublicUrl) return fromPublicUrl[1];

  const fromEditorUrl = raw.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
  if (fromEditorUrl) return fromEditorUrl[1];

  return null;
};
