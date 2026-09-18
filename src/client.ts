import { setupTestMode } from "./setup.js";
import type { SetupTestModeOptions } from "./setup.js";
import type { TestModeExtension } from "./types.js";
import { createPreviewSession } from "./internal/preview-session.js";
import type { PreviewStatus } from "./internal/preview-session.js";
import { createDraftTransport } from "./internal/draft-transport.js";
import { readCookieValue } from "./internal/storage.js";

export type NextCacheStatus = Readonly<
  Omit<PreviewStatus, "phase"> & {
    phase: PreviewStatus["phase"] | "disabled";
    scope: "next-draft-session";
    manualBypass: boolean;
    cache: "unknown" | "bypass" | "default";
  }
>;

export type NextTestModeClientOptions = Omit<
  SetupTestModeOptions,
  "ssr" | "refresh"
> &
  Readonly<{
    draftEndpoint?: string;
    refresh?: () => void | Promise<void>;
    onError?: (error: Error) => void;
    /** Bound the Draft handshake, including its response body. Default 10 seconds. */
    timeoutMs?: number;
  }>;

/** Browser composition only; transport and synchronization have independent lifecycles. */
export const setupNextTestModeClient = ({
  draftEndpoint = "/api/next-test-mode",
  refresh = () => location.reload(),
  timeoutMs = 10000,
  onError = (error) => {
    console.error("[next-test-mode]", error.message);
    window.dispatchEvent(
      new CustomEvent("next-test-mode:error", { detail: error.message }),
    );
  },
  overlay,
  ...options
}: NextTestModeClientOptions = {}) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647)
    throw new RangeError("timeoutMs must be between 1 and 2147483647.");
  if (overlay?.commands && Object.hasOwn(overlay.commands, "cache"))
    throw new TypeError("The Next Console cache namespace is reserved.");
  let stopped = false;
  let session: ReturnType<typeof createPreviewSession> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const transport = globalThis.fetch.bind(globalThis);
  const key = `${options.cookieKey ?? options.storageKey ?? "test-mode.entries"}.preview`;
  const manual = () =>
    typeof document !== "undefined" &&
    readCookieValue(document.cookie, key) === "1";
  const report = (cause: unknown) => {
    if (!stopped)
      onError(cause instanceof Error ? cause : new Error(String(cause)));
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!stopped && session?.status().pendingChanges)
        void session.sync().catch(report);
    }, 50);
  };
  const listeners = new Set<() => void>();
  const selectManual = (enabled: boolean) => {
    if (stopped || !installation.runtime.isAvailable())
      throw new Error("Next Test Mode is not available.");
    document.cookie = `${key}=${enabled ? "1" : ""}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}${enabled ? "" : "; Max-Age=0"}`;
    if (manual() !== enabled)
      throw new Error(
        "Could not save the cache preview preference. Enable cookies.",
      );
    for (const listener of listeners) listener();
    schedule();
  };
  const bypass: TestModeExtension = {
    key: "next-cache",
    label: "Next cache bypass",
    isActive: manual,
    enable: () => selectManual(true),
    disable: () => {
      if (manual()) selectManual(false);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  const cache = {
    status: (): NextCacheStatus => ({
      ...(session?.status() ?? {
        phase: "disabled" as const,
        draftEnabled: null,
        pendingChanges: false,
        error: null,
      }),
      scope: "next-draft-session" as const,
      manualBypass: manual(),
      cache:
        session?.status().draftEnabled === null || !session
          ? "unknown"
          : session.status().draftEnabled
            ? "bypass"
            : "default",
    }),
    bypass: () => {
      selectManual(true);
      return session!.sync(true);
    },
    refresh: () => {
      if (!session || stopped)
        return Promise.reject(new Error("Next Test Mode is not available."));
      return session.sync(true);
    },
    restore: () => {
      if (!session || stopped)
        return Promise.reject(new Error("Next Test Mode is not available."));
      installation.runtime.clear();
      for (const extension of [bypass, ...(overlay?.extensions ?? [])])
        extension.disable();
      return session.sync();
    },
  };
  const installation = setupTestMode({
    ...options,
    ssr: true,
    refresh: schedule,
    overlay: {
      ...overlay,
      extensions: [bypass, ...(overlay?.extensions ?? [])],
      commands: { ...overlay?.commands, cache },
      commandHelp: {
        ...overlay?.commandHelp,
        "test.cache.status()":
          "Inspect Draft connection, cache bypass, pending changes and errors.",
        "test.cache.bypass()":
          "Preview fresh real data in this Next Draft session without mocks.",
        "test.cache.refresh()":
          "Refresh the current preview, even when values have not changed.",
        "test.cache.restore()":
          "Clear all test values and return to the ordinary cache path (preserve pre-existing CMS Draft).",
      },
    },
  });
  const { runtime } = installation;
  try {
    if (runtime.isAvailable()) {
      const endpoint = new URL(draftEndpoint, location.href);
      if (endpoint.origin !== location.origin)
        throw new TypeError("Draft endpoint must be on the same origin.");
      session = createPreviewSession({
        read: () => {
          const entries = runtime.active();
          const overrides = runtime.overrides();
          const bypass = manual();
          return {
            key: JSON.stringify({ entries, overrides, bypass }),
            enabled: bypass || entries.length > 0 || overrides.length > 0,
          };
        },
        connect: createDraftTransport(transport, endpoint, timeoutMs),
        refresh,
      });
    }
  } catch (error) {
    installation.stop();
    throw error;
  }
  const sync = () => session?.sync() ?? Promise.resolve();
  const ready = sync();
  void ready.catch(report);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    session?.stop();
    installation.stop();
    listeners.clear();
  };
  return { runtime, ready, sync, cache, stop };
};
