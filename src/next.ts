import { headers } from "next/headers";
import { installServerTestMode } from "./node.js";
import type { InstallServerTestModeOptions } from "./node.js";

export type NextTestModeOptions = Omit<InstallServerTestModeOptions, "getRequest">;

/** Call once from Next.js instrumentation.register in the Node runtime. */
export const setupNextTestMode = (options: NextTestModeOptions = {}) =>
  installServerTestMode({
    ...options,
    getRequest: async () => {
      try {
        const incoming = await headers();
        return { key: incoming, cookieHeader: incoming.get("cookie") };
      } catch (error) {
        // Startup jobs have no request. Dynamic-rendering/control-flow errors
        // must still reach Next.js; do not silently turn them into cached data.
        if (error instanceof Error && /outside a request scope/.test(error.message)) return null;
        throw error;
      }
    },
  });
