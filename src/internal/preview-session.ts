export type PreviewSnapshot = Readonly<{ key: string; enabled: boolean }>;
export type PreviewStatus = Readonly<{
  phase: "idle" | "syncing" | "refreshing" | "error" | "stopped";
  draftEnabled: boolean | null;
  pendingChanges: boolean;
  error: string | null;
}>;

/** Framework/DOM independent coordinator. Never drops edits made during an async refresh. */
export const createPreviewSession = ({
  read,
  connect,
  refresh,
}: {
  read: () => PreviewSnapshot;
  connect: (
    enabled: boolean,
    signal: AbortSignal,
  ) => Promise<{ enabled: boolean; changed: boolean }>;
  refresh: () => void | Promise<void>;
}) => {
  const abort = new AbortController();
  let phase: PreviewStatus["phase"] = "idle";
  let draftEnabled: boolean | null = null;
  let error: string | null = null;
  let rendered = read().key;
  let requestedRefresh = 0;
  let completedRefresh = 0;
  let pending: Promise<void> | undefined;
  const status = (): PreviewStatus => ({
    phase,
    draftEnabled,
    error,
    pendingChanges:
      read().key !== rendered || requestedRefresh !== completedRefresh,
  });
  const sync = (force = false): Promise<void> => {
    if (phase === "stopped") return Promise.resolve();
    if (force) requestedRefresh++;
    if (pending) return pending;
    pending = (async () => {
      try {
        while (!abort.signal.aborted) {
          const snapshot = read();
          const revision = requestedRefresh;
          phase = "syncing";
          error = null;
          const result = await connect(snapshot.enabled, abort.signal);
          if (abort.signal.aborted) return;
          draftEnabled = result.enabled;
          if (snapshot.key !== read().key) continue;
          if (
            result.changed ||
            snapshot.key !== rendered ||
            revision !== completedRefresh
          ) {
            phase = "refreshing";
            await refresh();
            if (abort.signal.aborted) return;
            rendered = snapshot.key;
            completedRefresh = revision;
          }
          if (snapshot.key !== read().key || revision !== requestedRefresh)
            continue;
          phase = "idle";
          return;
        }
      } catch (cause) {
        if (!abort.signal.aborted) {
          phase = "error";
          error = cause instanceof Error ? cause.message : String(cause);
        }
        throw cause;
      }
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  };
  return {
    sync,
    status,
    stop: () => {
      phase = "stopped";
      abort.abort();
    },
  };
};
