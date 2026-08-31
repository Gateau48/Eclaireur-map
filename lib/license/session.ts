import { SignJWT, jwtVerify } from 'jose';
import type { SessionPayload } from './types';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'fallback-secret-change-in-production'
);

const COOKIE_PREFIX = 'leclaireur_session__';
const DEVICE_COOKIE = 'leclaireur_device';
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // 400 days in seconds
const JWT_EXPIRY = '3y'; // 3 years

/**
 * Create a JWT session token for an edition.
 */
export async function createSessionJWT(
  edition: string,
  licenseKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    edition,
    licenseKey,
    iat: now,
    exp: now + 3 * 365 * 24 * 60 * 60, // 3 years
  };

  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(JWT_EXPIRY)
    .sign(SESSION_SECRET);
}

/**
 * Verify and decode a JWT session token.
 */
export async function verifySessionJWT(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Get the cookie name for a specific edition.
 */
export function getSessionCookieName(edition: string): string {
  return `${COOKIE_PREFIX}${edition}`;
}

/**
 * Get the device cookie name.
 */
export function getDeviceCookieName(): string {
  return DEVICE_COOKIE;
}

/**
 * Create a Set-Cookie header string for the session.
 */
export function setSessionCookie(edition: string, token: string): string {
  const cookieName = getSessionCookieName(edition);
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    `${cookieName}=${token}`,
    'Path=/' + edition,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'SameSite=Lax',
  ];
  if (isProduction) {
    parts.push('Secure');
  }
  parts.push('HttpOnly');
  return parts.join('; ');
}

/**
 * Create a Set-Cookie header string for the device identifier.
 */
export function setDeviceCookie(deviceId: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    `${DEVICE_COOKIE}=${encodeURIComponent(deviceId)}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE}`,
    'SameSite=Lax',
  ];
  if (isProduction) {
    parts.push('Secure');
  }
  parts.push('HttpOnly');
  return parts.join('; ');
}

/**
 * Parse cookies from a Cookie header string.
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...valueParts] = cookie.split('=');
    if (name) {
      cookies[name.trim()] = valueParts.join('=').trim();
    }
  });
  return cookies;
}

/**
 * Get the session token from cookies for a specific edition.
 */
export function getSessionFromCookies(
  cookieHeader: string,
  edition: string
): string | null {
  const cookies = parseCookies(cookieHeader);
  const cookieName = getSessionCookieName(edition);
  return cookies[cookieName] || null;
}

/**
 * Get the device identifier from cookies.
 */
export function getDeviceFromCookies(cookieHeader: string): string | null {
  const cookies = parseCookies(cookieHeader);
  return cookies[DEVICE_COOKIE] ? decodeURIComponent(cookies[DEVICE_COOKIE]) : null;
}

/**
 * Create a clear cookie header for logging out (invalidating session).
 */
export function clearSessionCookie(edition: string): string {
  const cookieName = getSessionCookieName(edition);
  return `${cookieName}=; Path=/${edition}; Max-Age=0; HttpOnly`;
}

/**
 * Check if a JWT needs renewal (less than 30 days until expiry).
 */
export function needsRenewal(payload: SessionPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDays = 30 * 24 * 60 * 60;
  return payload.exp - now < thirtyDays;
}
