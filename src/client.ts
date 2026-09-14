import { setupTestMode } from "./setup.js";
import type { SetupTestModeOptions } from "./setup.js";

export type NextTestModeClientOptions = Omit<
  SetupTestModeOptions,
  "ssr" | "refresh"
> &
  Readonly<{
    draftEndpoint?: string;
    refresh?: () => void | Promise<void>;
    onError?: (error: Error) => void;
  }>;

/** One browser entry connects Console, fetch, JSON handoff and Next Draft Mode. */
export const setupNextTestModeClient = ({
  draftEndpoint = "/api/next-test-mode",
  refresh = () => location.reload(),
  onError = (error) => {
    console.error("[next-test-mode]", error.message);
    window.dispatchEvent(
      new CustomEvent("next-test-mode:error", { detail: error.message }),
    );
  },
  ...options
}: NextTestModeClientOptions = {}) => {
  let stopped = false;
  let pending: Promise<void> | undefined;
  let dirty = false;
  let lastSynced: string | undefined;
  const abort = new AbortController();
  const transport = globalThis.fetch.bind(globalThis);
  const installation = setupTestMode({
    ...options,
    ssr: true,
    refresh: () => {
      if (snapshot() !== lastSynced) {
        dirty = true;
        void sync().catch(report);
      }
    },
  });
  const { runtime } = installation;
  const report = (error: unknown) => {
    if (!stopped)
      onError(error instanceof Error ? error : new Error(String(error)));
  };
  const snapshot = () =>
    JSON.stringify({
      entries: runtime.active(),
      overrides: runtime.overrides(),
    });
  const sync = (): Promise<void> => {
    if (stopped || !runtime.isAvailable()) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => {
      const endpoint = new URL(draftEndpoint, location.href);
      if (endpoint.origin !== location.origin)
        throw new TypeError("Draft endpoint must be on the same origin.");
      while (!stopped) {
        const state = snapshot();
        const enabled =
          runtime.active().length > 0 || runtime.overrides().length > 0;
        const response = await transport(endpoint, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          signal: abort.signal,
          headers: {
            "Content-Type": "application/json",
            "X-Next-Test-Mode": "1",
          },
          body: JSON.stringify({ enabled }),
        });
        if (!response.ok)
          throw new Error(
            `Draft Mode connection failed (HTTP ${response.status}). Check the generated route and the app's test-mode environment setting.`,
          );
        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== "object" ||
          typeof (result as { changed?: unknown }).changed !== "boolean" ||
          typeof (result as { enabled?: unknown }).enabled !== "boolean"
        )
          throw new Error("Draft endpoint returned an invalid response.");
        if (enabled && !(result as { enabled: boolean }).enabled)
          throw new Error("Draft endpoint did not enable the preview session.");
        if (state !== snapshot()) {
          dirty = true;
          continue;
        }
        lastSynced = state;
        if (!stopped && (dirty || (result as { changed: boolean }).changed)) {
          dirty = false;
          await refresh();
        }
        return;
      }
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  };
  const ready = sync();
  void ready.catch(report);
  const stop = () => {
    if (!stopped) {
      stopped = true;
      abort.abort();
      installation.stop();
    }
  };
  return { runtime, ready, sync, stop };
};
