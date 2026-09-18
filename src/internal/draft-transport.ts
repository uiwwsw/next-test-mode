/** Captured transport keeps preview controls outside the app's mockable fetch. */
export const createDraftTransport =
  (transport: typeof fetch, endpoint: URL, timeoutMs: number) =>
  async (enabled: boolean, parent: AbortSignal) => {
    const abort = new AbortController();
    const stop = () => abort.abort(parent.reason);
    parent.addEventListener("abort", stop, { once: true });
    if (parent.aborted) stop();
    const timer = setTimeout(
      () =>
        abort.abort(
          new Error(`Draft Mode connection timed out after ${timeoutMs}ms.`),
        ),
      timeoutMs,
    );
    try {
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
        typeof (result as { enabled?: unknown }).enabled !== "boolean" ||
        typeof (result as { changed?: unknown }).changed !== "boolean"
      )
        throw new Error("Draft endpoint returned an invalid response.");
      const state = result as { enabled: boolean; changed: boolean };
      if (enabled && !state.enabled)
        throw new Error("Draft endpoint did not enable the preview session.");
      return state;
    } catch (error) {
      if (abort.signal.aborted && !parent.aborted) throw abort.signal.reason;
      throw error;
    } finally {
      clearTimeout(timer);
      parent.removeEventListener("abort", stop);
    }
  };
