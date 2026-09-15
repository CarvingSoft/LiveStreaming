const TTL_MS = 5 * 60 * 1000;

interface JarEntry {
  cookie: string;
  expiresAt: number;
}

const jar = new Map<string, JarEntry>();
const playbackSessions = new Map<string, JarEntry>();

export function rememberPlaybackHlsSession(token: string, session: string): void {
  playbackSessions.set(token, { cookie: session, expiresAt: Date.now() + TTL_MS });
}

export function getPlaybackHlsSession(token: string): string | undefined {
  const entry = playbackSessions.get(token);
  if (!entry || entry.expiresAt <= Date.now()) {
    playbackSessions.delete(token);
    return undefined;
  }
  return entry.cookie;
}

function jarKey(token: string, session?: string): string {
  return session ? `${token}:${session}` : token;
}

export function getHlsCookie(token: string, session?: string): string | undefined {
  const now = Date.now();
  for (const key of [jarKey(token, session), jarKey(token)]) {
    const entry = jar.get(key);
    if (entry && entry.expiresAt > now) {
      return entry.cookie;
    }
    jar.delete(key);
  }
  return undefined;
}

export function setHlsCookie(token: string, session: string | undefined, cookie: string): void {
  const expiresAt = Date.now() + TTL_MS;
  jar.set(jarKey(token, session), { cookie, expiresAt });
  jar.set(jarKey(token), { cookie, expiresAt });
}

export function collectSetCookie(response: Response): string | undefined {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie.call(response.headers)
      : [];

  if (setCookies.length === 0) {
    const single = response.headers.get('set-cookie');
    if (single) {
      setCookies.push(single);
    }
  }

  if (setCookies.length === 0) {
    return undefined;
  }

  return setCookies
    .map((value) => value.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

export function mergeCookieHeader(existing: string | undefined, incoming: string | undefined): string | undefined {
  const values = new Map<string, string>();

  for (const part of `${existing ?? ''}; ${incoming ?? ''}`.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    values.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }

  if (values.size === 0) {
    return undefined;
  }

  return Array.from(values.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

export function withCookieHeader(init: RequestInit, cookie?: string): RequestInit {
  if (!cookie) {
    return init;
  }

  const headers = new Headers(init.headers ?? undefined);
  headers.set('Cookie', cookie);
  return { ...init, headers };
}
