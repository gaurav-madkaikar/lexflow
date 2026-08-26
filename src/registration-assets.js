const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MIN_LOGO_DIMENSION = 64;
const MAX_LOGO_DIMENSION = 2048;

function invalidLogo(message) {
  const error = new TypeError(message);
  error.code = 'VALIDATION_FAILED';
  error.field = 'logoDataUrl';
  error.status = 400;
  return error;
}

function parsePng(bytes) {
  const signature = Buffer.from('89504e470d0a1a0a', 'hex');
  if (bytes.length < 29 || !bytes.subarray(0, 8).equals(signature)) return null;
  if (bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    throw invalidLogo('The PNG logo has an invalid header.');
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  const compression = bytes[26];
  const filter = bytes[27];
  const interlace = bytes[28];
  const bitDepthsByColorType = new Map([
    [0, new Set([1, 2, 4, 8, 16])],
    [2, new Set([8, 16])],
    [3, new Set([1, 2, 4, 8])],
    [4, new Set([8, 16])],
    [6, new Set([8, 16])],
  ]);
  if (
    !bitDepthsByColorType.get(colorType)?.has(bitDepth)
    || compression !== 0
    || filter !== 0
    || interlace > 1
  ) {
    throw invalidLogo('The PNG logo has unsupported image metadata.');
  }
  let offset = 8;
  let sawEnd = false;
  while (offset + 12 <= bytes.length) {
    const chunkLength = bytes.readUInt32BE(offset);
    const chunkEnd = offset + 12 + chunkLength;
    if (chunkEnd > bytes.length) throw invalidLogo('The PNG logo is truncated.');
    const chunkType = bytes.toString('ascii', offset + 4, offset + 8);
    if (chunkType === 'IEND') {
      if (chunkLength !== 0 || chunkEnd !== bytes.length) {
        throw invalidLogo('The PNG logo has an invalid ending.');
      }
      sawEnd = true;
      break;
    }
    offset = chunkEnd;
  }
  if (!sawEnd) throw invalidLogo('The PNG logo is truncated.');
  return { mimeType: 'image/png', width, height };
}

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function parseJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  if (bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
    throw invalidLogo('The JPEG logo is truncated.');
  }
  let offset = 2;
  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) throw invalidLogo('The JPEG logo is truncated.');
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw invalidLogo('The JPEG logo is truncated.');
    }
    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) throw invalidLogo('The JPEG logo has an invalid frame.');
      return {
        mimeType: 'image/jpeg',
        width: bytes.readUInt16BE(offset + 5),
        height: bytes.readUInt16BE(offset + 3),
      };
    }
    offset += segmentLength;
  }
  throw invalidLogo('The JPEG logo does not contain readable dimensions.');
}

function webpChunk(bytes) {
  if (
    bytes.length < 20
    || bytes.toString('ascii', 0, 4) !== 'RIFF'
    || bytes.toString('ascii', 8, 12) !== 'WEBP'
  ) return null;
  const declaredFileSize = bytes.readUInt32LE(4) + 8;
  if (declaredFileSize !== bytes.length || declaredFileSize < 20) {
    throw invalidLogo('The WebP logo is truncated.');
  }
  const chunkType = bytes.toString('ascii', 12, 16);
  const chunkSize = bytes.readUInt32LE(16);
  if (20 + chunkSize > bytes.length) throw invalidLogo('The WebP logo is truncated.');
  return { chunkType, chunkSize };
}

function parseWebp(bytes) {
  const chunk = webpChunk(bytes);
  if (!chunk) return null;
  if (chunk.chunkType === 'VP8X') {
    if (chunk.chunkSize < 10 || bytes.length < 30) throw invalidLogo('The WebP logo has an invalid VP8X header.');
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return { mimeType: 'image/webp', width, height };
  }
  if (chunk.chunkType === 'VP8 ') {
    if (
      chunk.chunkSize < 10
      || bytes.length < 30
      || bytes[23] !== 0x9d
      || bytes[24] !== 0x01
      || bytes[25] !== 0x2a
    ) throw invalidLogo('The WebP logo has an invalid VP8 header.');
    return {
      mimeType: 'image/webp',
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk.chunkType === 'VP8L') {
    if (chunk.chunkSize < 5 || bytes.length < 25 || bytes[20] !== 0x2f) {
      throw invalidLogo('The WebP logo has an invalid VP8L header.');
    }
    return {
      mimeType: 'image/webp',
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
    };
  }
  throw invalidLogo('The WebP logo uses an unsupported image format.');
}

function parseImageHeader(bytes) {
  return parsePng(bytes) ?? parseJpeg(bytes) ?? parseWebp(bytes);
}

function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') throw invalidLogo('Choose a PNG, JPEG, or WebP logo.');
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
  if (!match || match[2].length === 0 || match[2].length % 4 !== 0) {
    throw invalidLogo('Choose a base64-encoded PNG, JPEG, or WebP logo.');
  }
  const maximumEncodedLength = Math.ceil(MAX_LOGO_BYTES / 3) * 4;
  if (match[2].length > maximumEncodedLength) {
    throw invalidLogo('The organization logo must be no larger than 2 MiB.');
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.toString('base64') !== match[2]) {
    throw invalidLogo('The organization logo is not valid base64 data.');
  }
  if (bytes.length > MAX_LOGO_BYTES) {
    throw invalidLogo('The organization logo must be no larger than 2 MiB.');
  }
  return { declaredMimeType: match[1], bytes };
}

export function parseOrganizationLogo(dataUrl) {
  const { declaredMimeType, bytes } = decodeDataUrl(dataUrl);
  const parsed = parseImageHeader(bytes);
  if (!parsed) throw invalidLogo('The organization logo signature is not PNG, JPEG, or WebP.');
  if (parsed.mimeType !== declaredMimeType) {
    throw invalidLogo('The declared logo type does not match its file signature.');
  }
  if (
    !Number.isInteger(parsed.width)
    || !Number.isInteger(parsed.height)
    || parsed.width < MIN_LOGO_DIMENSION
    || parsed.width > MAX_LOGO_DIMENSION
    || parsed.height < MIN_LOGO_DIMENSION
    || parsed.height > MAX_LOGO_DIMENSION
  ) {
    throw invalidLogo('Logo width and height must each be between 64 and 2,048 pixels.');
  }
  return { mimeType: parsed.mimeType, bytes, width: parsed.width, height: parsed.height };
}

export function getOrganizationLogo({ db, assetId }) {
  if (!Number.isSafeInteger(Number(assetId)) || Number(assetId) < 1) return null;
  const row = db.prepare(`
    SELECT id, mime_type, content, width, height
    FROM organization_assets
    WHERE id = ?
  `).get(Number(assetId));
  if (!row) return null;
  return {
    id: Number(row.id),
    mimeType: row.mime_type,
    bytes: Buffer.from(row.content),
    width: Number(row.width),
    height: Number(row.height),
  };
}

export const ORGANIZATION_LOGO_LIMITS = Object.freeze({
  maxBytes: MAX_LOGO_BYTES,
  minDimension: MIN_LOGO_DIMENSION,
  maxDimension: MAX_LOGO_DIMENSION,
});
