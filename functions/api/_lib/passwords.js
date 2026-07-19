// Password hashing via Web Crypto's PBKDF2 - available natively in the
// Cloudflare Workers runtime, unlike bcrypt/scrypt which need native
// bindings this runtime doesn't provide.

const ITERATIONS = 210000;
const HASH_BITS = 256;

function toBase64(bytes) {
  let binary = '';
  bytes.forEach(function (b) { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password, saltBytes) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS
  );
  return toBase64(new Uint8Array(bits));
}

export async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, saltBytes);
  return { hash: hash, salt: toBase64(saltBytes) };
}

export async function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const computed = await derive(password, fromBase64(salt));
  if (computed.length !== hash.length) return false;
  // Constant-time-ish comparison - avoids leaking match length via early exit.
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}
