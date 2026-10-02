import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_COOKIE_NAMES, AUTH_STORAGE_KEYS, NetworkError, SessionChangedError } from "@/lib/auth";
import { fetchCurrentAdminUser } from "./auth-api";
import { shouldKeepLocalSession } from "./auth-errors";
import { authenticatedFetch } from "./authenticated-fetch";
import { persistSession, readAccessToken, readRefreshToken } from "./session-storage";

const jar = vi.hoisted(() => new Map<string, unknown>());
vi.mock("react-cookie", () => ({ Cookies: class {
  get(name: string) { return jar.get(name); }
  set(name: string, value: unknown) { jar.set(name, value); }
  remove(name: string) { jar.delete(name); }
} }));

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function token(subject: string) {
  return `fixture.${Buffer.from(JSON.stringify({ sub: subject, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
}

function session(subject = "A") {
  persistSession({
    accessToken: token(subject), refreshToken: `refresh-${subject}`,
    user: { id: subject, first_name: "Test", last_name: "Admin", email: "admin@example.test", phone: "", role: "admin" },
  }, true);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function request() {
  const clearSession = vi.fn();
  return { clearSession, promise: authenticatedFetch({ path: "orders/", init: {}, clearSession, scheduleRefresh: vi.fn() }) };
}

beforeEach(() => {
  jar.clear();
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.stubGlobal("sessionStorage", new MemoryStorage());
  vi.stubGlobal("navigator", {});
  session();
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("authentication across transient failures and account changes", () => {
  it("keeps the saved startup session when the browser loses the network", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const error = await fetchCurrentAdminUser(token("A")).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(NetworkError);
    expect(shouldKeepLocalSession(error)).toBe(true);
    expect(readRefreshToken()).toBe("refresh-A");
  });

  it("keeps startup credentials on server failures and rejects a revoked login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })));
    const unavailable = await fetchCurrentAdminUser(token("A")).catch((reason: unknown) => reason);
    expect(shouldKeepLocalSession(unavailable)).toBe(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const revoked = await fetchCurrentAdminUser(token("A")).catch((reason: unknown) => reason);
    expect(shouldKeepLocalSession(revoked)).toBe(false);
  });

  it("keeps credentials if a successful response is interrupted before the user body finishes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"id":', { status: 200 })));
    const interrupted = await fetchCurrentAdminUser(token("A")).catch((reason: unknown) => reason);
    expect(shouldKeepLocalSession(interrupted)).toBe(true);
    expect(readRefreshToken()).toBe("refresh-A");
  });

  it("does not clear credentials after a network failure during refresh", async () => {
    jar.delete(AUTH_COOKIE_NAMES.accessToken);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const attempt = request();
    await expect(attempt.promise).rejects.toBeInstanceOf(NetworkError);
    expect(attempt.clearSession).not.toHaveBeenCalled();
    expect(readRefreshToken()).toBe("refresh-A");
  });

  it("never replays an old account request using a newly signed-in account", async () => {
    const response = deferred<Response>();
    const fetch = vi.fn().mockReturnValue(response.promise);
    vi.stubGlobal("fetch", fetch);
    const attempt = request();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    session("B");
    response.resolve(new Response("{}", { status: 401 }));
    await expect(attempt.promise).rejects.toBeInstanceOf(SessionChangedError);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(attempt.clearSession).not.toHaveBeenCalled();
    expect(readRefreshToken()).toBe("refresh-B");
  });

  it("does not restore tokens after logout while a refresh response is pending", async () => {
    jar.delete(AUTH_COOKIE_NAMES.accessToken);
    const response = deferred<Response>();
    const fetch = vi.fn().mockReturnValue(response.promise);
    vi.stubGlobal("fetch", fetch);
    const attempt = request();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    jar.clear();
    localStorage.removeItem(AUTH_STORAGE_KEYS.sessionIdentity);
    localStorage.removeItem(AUTH_STORAGE_KEYS.sessionExpiresAt);
    response.resolve(Response.json({ accessToken: token("A"), refreshToken: "rotated-A" }));
    await expect(attempt.promise).rejects.toBeInstanceOf(SessionChangedError);
    expect(readRefreshToken()).toBeUndefined();
    expect(attempt.clearSession).not.toHaveBeenCalled();
  });

  it.each([200, 401])("cannot overwrite or clear account B after account A's refresh returns %s", async (status) => {
    jar.delete(AUTH_COOKIE_NAMES.accessToken);
    const response = deferred<Response>();
    const fetch = vi.fn().mockReturnValue(response.promise);
    vi.stubGlobal("fetch", fetch);
    const attempt = request();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    session("B");
    response.resolve(Response.json({ accessToken: token("A"), refreshToken: "rotated-A" }, { status }));
    await expect(attempt.promise).rejects.toBeInstanceOf(SessionChangedError);
    expect(readAccessToken()).toBe(token("B"));
    expect(readRefreshToken()).toBe("refresh-B");
    expect(attempt.clearSession).not.toHaveBeenCalled();
  });

  it("serializes refresh from two separate tabs and consumes one rotating token once", async () => {
    let lock = Promise.resolve();
    vi.stubGlobal("navigator", { locks: { request: (_name: string, callback: () => Promise<unknown>) => {
      const next = lock.then(callback);
      lock = next.then(() => undefined, () => undefined);
      return next;
    } } });
    const response = deferred<Response>();
    const fetch = vi.fn().mockReturnValue(response.promise);
    vi.stubGlobal("fetch", fetch);
    vi.resetModules();
    const tabOne = await import("./token-refresh");
    vi.resetModules();
    const tabTwo = await import("./token-refresh");
    const first = tabOne.refreshTokens();
    const second = tabTwo.refreshTokens();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    response.resolve(Response.json({ accessToken: token("A"), refreshToken: "rotated-A" }));
    const tokens = await Promise.all([first, second]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(tokens[0]).toEqual(tokens[1]);
    expect(readRefreshToken()).toBe("rotated-A");
  });

  it("preserves the session if a browser without Web Locks loses a race to a slow tab", async () => {
    vi.useFakeTimers();
    const response = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(response.promise)
      .mockResolvedValueOnce(new Response("{}", { status: 401 })));
    vi.resetModules();
    const firstTab = await import("./token-refresh");
    vi.resetModules();
    const secondTab = await import("./token-refresh");
    const first = firstTab.refreshTokens();
    const second = secondTab.refreshTokens().catch((reason: Error) => reason);
    await vi.advanceTimersByTimeAsync(1600);
    const error = await second;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe("AuthServerError");
    expect(readRefreshToken()).toBe("refresh-A");
    response.resolve(Response.json({ accessToken: token("A"), refreshToken: "slow-rotated-A" }));
    await first;
    expect(readRefreshToken()).toBe("slow-rotated-A");
  });
});
