/**
 * Clipping JWT utilities
 * Shared token creation/verification for clipping auth.
 */

const CLIPPING_SECRET = process.env.CLIPPING_SECRET || process.env.NEXTAUTH_SECRET || 'clipping-fallback-secret';
const TOKEN_EXPIRY_DAYS = 7;

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

export function createClippingToken(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', CLIPPING_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyClippingToken(token: string): { valid: boolean; payload?: Record<string, unknown> } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    const [header, body, signature] = parts;
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', CLIPPING_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expected) return { valid: false };

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return { valid: false };

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export { TOKEN_EXPIRY_DAYS };
