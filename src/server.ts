import { createTestMode } from "./core.js";
import { createMockFetch } from "./fetch.js";
import type { TestModeOptions } from "./types.js";
import { readSSRState, ssrCookieKey } from "./internal/ssr-state.js";

export type ServerTestModeOptions = TestModeOptions &
  Readonly<{
    /** The incoming page/request cookie header. Pass null when absent. */
    cookieHeader: string | null;
    /** The server/framework fetch to wrap; its request arguments are preserved. */
    originalFetch?: typeof fetch;
    /** Accept JSON synchronized by setupTestMode({ ssr: true }). Disabled by default. */
    ssr?: boolean;
  }>;

/**
 * Create once per incoming SSR/loader request, never at module scope.
 * Only registered feature selections cross from the browser cookie. Counters,
 * selections and server-side overrides belong to this new runtime instance.
 * Does not install a global fetch or forward incoming cookies to an upstream API.
 */
export const createServerTestMode = ({
  cookieHeader,
  originalFetch = globalThis.fetch.bind(globalThis),
  ssr = false,
  ...options
}: ServerTestModeOptions) => {
  if (typeof window !== "undefined") {
    throw new TypeError(
      "createServerTestMode must run on the server, once per incoming request. Use createTestMode in the browser.",
    );
  }
  const runtime = createTestMode(options);
  // An absent incoming cookie must not fall back to any other selection source.
  runtime.set(runtime.active(cookieHeader ?? ""));
  if (ssr && runtime.isAvailable()) {
    const state = readSSRState(cookieHeader ?? "", ssrCookieKey(runtime.cookieKey));
    if (state) {
      runtime.set(state.entries);
      for (const item of state.overrides) {
        if (item.mode === "mock") runtime.setMock(item.path, item.data, item);
        else runtime.setPatch(item.path, item.data as Record<string, unknown>, item);
      }
    }
  }
  return {
    runtime,
    // Selection is already captured above. An upstream authentication Cookie
    // header must neither change that selection nor suppress local overrides.
    fetch: createMockFetch(runtime, { originalFetch, cookieHeader: false }),
  };
};
