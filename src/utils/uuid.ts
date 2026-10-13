/**
 * RFC 4122 v4 UUID Validator and Deterministic UUID Generator
 * Ensures all user IDs, session IDs, and database identifiers are valid PostgreSQL UUIDs.
 */

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(input?: string | null): boolean {
  if (!input || typeof input !== 'string') return false;
  return UUID_V4_REGEX.test(input.trim());
}

export function toDeterministicUuid(input?: string | null): string {
  if (!input || typeof input !== 'string') {
    return '00000000-0000-4000-8000-000000000000';
  }

  const trimmed = input.trim().toLowerCase();
  if (UUID_V4_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Fast 32-bit FNV-1a / Murmur hybrid expansion to 128-bit hex string
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  let h3 = 0x12345678;
  let h4 = 0x9abcdef0;

  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code * (i + 1)), 0x5bd1e995);
    h3 = Math.imul(h3 ^ ((code << 3) | (code >> 5)), 0x1b873593);
    h4 = Math.imul(h4 ^ (code * 31), 0x27d4eb2d);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hex3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const hex4 = (h4 >>> 0).toString(16).padStart(8, '0');
  const fullHex = hex1 + hex2 + hex3 + hex4;

  const p1 = fullHex.substring(0, 8);
  const p2 = fullHex.substring(8, 12);
  const p3 = '4' + fullHex.substring(13, 16);
  const vByte = ((parseInt(fullHex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  const p4 = vByte + fullHex.substring(18, 20);
  const p5 = fullHex.substring(20, 32);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}
