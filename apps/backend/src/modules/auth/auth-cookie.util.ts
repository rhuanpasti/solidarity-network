import type { CookieOptions, Request, Response } from 'express';

const AUTH_COOKIE_NAME = 'solidarity_network_session';
const AUTH_COOKIE_PATH = '/api/v1';
const AUTH_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 8;

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProtocol)
    ? forwardedProtocol[0]
    : forwardedProtocol;

  return request.secure || protocol === 'https';
}

function resolveAuthCookieOptions(request: Request): CookieOptions {
  const secure = isSecureRequest(request) || process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: AUTH_COOKIE_PATH,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

function readCookieValue(cookieHeader: string, name: string) {
  const encodedName = `${name}=`;

  for (const part of cookieHeader.split(';')) {
    const trimmedPart = part.trim();

    if (!trimmedPart.startsWith(encodedName)) {
      continue;
    }

    return decodeURIComponent(trimmedPart.slice(encodedName.length));
  }

  return null;
}

export function attachAuthCookie(
  response: Response,
  request: Request,
  token: string,
) {
  response.cookie(AUTH_COOKIE_NAME, token, resolveAuthCookieOptions(request));
}

export function clearAuthCookie(response: Response, request: Request) {
  const options = resolveAuthCookieOptions(request);

  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: options.secure,
    sameSite: options.sameSite,
    path: AUTH_COOKIE_PATH,
  });
}

export function extractAuthToken(request: Request) {
  const authorization = request.headers.authorization;

  if (authorization?.startsWith('Bearer ')) {
    return {
      token: authorization.slice('Bearer '.length),
      source: 'header' as const,
    };
  }

  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const token = readCookieValue(cookieHeader, AUTH_COOKIE_NAME);

  if (!token) {
    return null;
  }

  return {
    token,
    source: 'cookie' as const,
  };
}
