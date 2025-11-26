export const AUTH_TOKEN_KEY = "auth_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const TOKEN_REFRESH_EVENT = "auth:token-refreshed";

interface JwtPayload {
  exp?: number;
}

export function getTokenExpiration(token: string): number | null {
  try {
    const payloadPart = token.split(".")[1];
    const decoded = JSON.parse(atob(payloadPart)) as JwtPayload;
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpiringWithin(token: string, windowMs: number): boolean {
  const exp = getTokenExpiration(token);
  if (!exp) return true;

  const now = Date.now();
  return exp - now <= windowMs;
}

export function broadcastTokenRefresh(accessToken: string | null) {
  window.dispatchEvent(
    new CustomEvent(TOKEN_REFRESH_EVENT, {
      detail: { accessToken },
    })
  );
}

