const countMatches = (text, regex) => (text.match(regex) || []).length;

const scoreDecodedText = (text) => {
  if (!text) return -9999;
  const replacement = countMatches(text, /\uFFFD/g);
  const badPattern = countMatches(text, /[\u00C3\u00C2\u00D0\u00D8]/g);
  const hangul = countMatches(text, /[\uAC00-\uD7A3]/g);
  return hangul * 2 - replacement * 8 - badPattern * 3;
};

export const decodeCsvTextWithFallback = async (file) => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(buffer), encoding: 'utf-8-bom', fallbackUsed: false };
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(buffer), encoding: 'utf-16le', fallbackUsed: false };
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(buffer), encoding: 'utf-16be', fallbackUsed: false };
  }

  const utf8Text = new TextDecoder('utf-8').decode(buffer);
  let eucKrText = '';

  try {
    eucKrText = new TextDecoder('euc-kr').decode(buffer);
  } catch {
    eucKrText = '';
  }

  const utf8Score = scoreDecodedText(utf8Text);
  const eucKrScore = scoreDecodedText(eucKrText);

  if (eucKrText && eucKrScore > utf8Score + 3) {
    return { text: eucKrText, encoding: 'euc-kr', fallbackUsed: true };
  }

  return { text: utf8Text, encoding: 'utf-8', fallbackUsed: false };
};
