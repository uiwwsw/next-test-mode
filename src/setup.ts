import { createTestMode } from "./core.js";
import { installMockFetch } from "./fetch.js";
import { installTestModeOverlay } from "./browser.js";
import { readSSRState, ssrCookieKey, writeSSRState } from "./internal/ssr-state.js";
import { createCleanup } from "./internal/lifecycle.js";
import type { TestModeOptions, TestModeOverlayOptions } from "./types.js";

export type SetupTestModeOptions = TestModeOptions & Readonly<{
  /** Opt in to sharing JSON with the server and restoring it after navigation. */
  ssr?: boolean;
  /** SSR defaults to reloading the page after a change. Override for router refresh/refetch. */
  refresh?: () => void;
  overlay?: TestModeOverlayOptions;
}>;

/** Install once in the browser entry. Existing fetch calls and Console commands stay the same. */
export const setupTestMode = ({
  ssr = false,
  refresh,
  overlay,
  beforeChange,
  ...options
}: SetupTestModeOptions = {}) => {
  let syncing = false;
  let stopped = false;
  let cookieKey = "";
  const runtime = createTestMode({
    ...options,
    beforeChange: state => {
      beforeChange?.(state);
      if (syncing) writeSSRState(cookieKey, state);
    },
  });
  const cleanups: (() => void)[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    syncing = false;
    clearTimeout(timer);
    createCleanup(cleanups)();
  };
  if (!runtime.isAvailable()) return { runtime, stop };
  if (typeof window === "undefined") throw new TypeError("setupTestMode runs in the browser. Use withTestMode on the server.");
  cookieKey = ssrCookieKey(runtime.cookieKey);
  if (ssr) {
    const state = readSSRState(document.cookie, cookieKey);
    if (state) {
      runtime.set(state.entries);
      for (const item of state.overrides) {
        if (item.mode === "mock") runtime.setMock(item.path, item.data, item);
        else runtime.setPatch(item.path, item.data as Record<string, unknown>, item);
      }
    }
    // Test cookie availability during setup, before installing globals.
    writeSSRState(cookieKey, { entries: runtime.active(), overrides: runtime.overrides() });
    syncing = true;
  }
  try {
    cleanups.push(installMockFetch(runtime));
    cleanups.push(installTestModeOverlay(runtime, { datasetName: false, ...overlay }));
    const update = refresh ?? (ssr ? () => location.reload() : undefined);
    if (update) cleanups.push(runtime.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (!stopped) update(); }, 50);
    }));
  } catch (error) { stop(); throw error; }
  return { runtime, stop };
};
