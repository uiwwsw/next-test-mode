import { ResponseOverrides } from "./overrides.js";
import { readCookieValue } from "./storage.js";
import type { TestModeState } from "../types.js";

// Leave room for the cookie name and attributes under common 4 KiB limits.
export const SSR_COOKIE_LIMIT = 3500;
export const ssrCookieKey = (cookieKey: string) => `${cookieKey}.ssr`;

const normalize = (input: unknown): TestModeState => {
  if (!input || typeof input !== "object") throw new TypeError("Invalid SSR state.");
  const state = input as Record<string, unknown>;
  if (state.v !== 1 || !Array.isArray(state.entries) || !Array.isArray(state.overrides) ||
      state.entries.some(item => typeof item !== "string"))
    throw new TypeError("Invalid SSR state.");
  const overrides = new ResponseOverrides();
  for (const item of state.overrides) {
    if (!item || typeof item !== "object" || (item.mode !== "mock" && item.mode !== "patch"))
      throw new TypeError("Invalid SSR override.");
    overrides.set(item.path, item.data, item.mode, item);
  }
  return { entries: [...state.entries], overrides: overrides.list() };
};

export const encodeSSRState = (state: TestModeState): string => {
  const value = encodeURIComponent(JSON.stringify({ v: 1, ...state }));
  if (value.length > SSR_COOKIE_LIMIT)
    throw new RangeError(`SSR response values exceed ${SSR_COOKIE_LIMIT} encoded bytes. Use smaller values or a registered scenario.`);
  return value;
};

/** Malformed or oversized client state never activates a partial server scenario. */
export const readSSRState = (cookie: string, key: string): TestModeState | null => {
  try {
    const value = readCookieValue(cookie, key);
    if (!value || encodeURIComponent(value).length > SSR_COOKIE_LIMIT) return null;
    return normalize(JSON.parse(value));
  } catch { return null; }
};

export const writeSSRState = (key: string, state: TestModeState): void => {
  if (!/^[!#$%&'*+\-.^_`|~0-9a-z]+$/i.test(key) || key.length > 128)
    throw new TypeError("Use a short, valid cookie key for SSR test mode.");
  const value = encodeSSRState(state);
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${key}=${value}; Path=/; SameSite=Lax${secure}`;
  if (readCookieValue(document.cookie, key) !== decodeURIComponent(value))
    throw new Error("SSR test mode could not save its cookie. Enable cookies or use browser-only mode.");
};
