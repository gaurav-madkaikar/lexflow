const VISIBLE_ENTITIES = Object.freeze({
  amp: '&',
  apos: "'",
  copy: '©',
  gt: '>',
  hellip: '…',
  lt: '<',
  mdash: '—',
  nbsp: '\u00a0',
  ndash: '–',
  quot: '"',
  reg: '®',
});

function decodedCodePoint(value) {
  const hexadecimal = /^#x/i.test(value);
  const digits = value.slice(hexadecimal ? 2 : 1);
  const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
  if (
    !Number.isInteger(codePoint)
    || codePoint < 1
    || codePoint > 0x10ffff
    || (codePoint >= 0xd800 && codePoint <= 0xdfff)
  ) {
    return '\ufffd';
  }
  return String.fromCodePoint(codePoint);
}

function decodeVisibleEntities(value) {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/giu, (entity, name) => {
    if (name.startsWith('#')) return decodedCodePoint(name);
    return VISIBLE_ENTITIES[name.toLocaleLowerCase('en-US')] ?? entity;
  });
}

export function normalizeMessagePreview(value, maxCharacters = 320) {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 1) {
    throw new RangeError('Preview character limit must be a positive integer.');
  }
  const normalized = decodeVisibleEntities(String(value ?? '').toWellFormed().normalize('NFKC'))
    .toWellFormed()
    .normalize('NFKC')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, '')
    .replace(/[\p{Z}\s]+/gu, ' ')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/ +/gu, ' ')
    .trim();
  const characters = [...normalized];
  if (characters.length <= maxCharacters) {
    return { preview: normalized, truncated: false };
  }

  if (maxCharacters === 1) return { preview: '…', truncated: true };
  const budget = maxCharacters - 1;
  const prefix = characters.slice(0, budget).join('');
  const boundary = prefix.replace(/\s+\S*$/u, '').trimEnd();
  return {
    preview: `${boundary || prefix}…`,
    truncated: true,
  };
}
