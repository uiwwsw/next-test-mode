import { cookies, draftMode } from "next/headers";
import { installServerTestMode } from "./node.js";
import type { InstallServerTestModeOptions } from "./node.js";
import { withoutTestMode } from "./internal/server-context.js";
import { requestFromDraft } from "./internal/next-request.js";
import { createDraftControl } from "./internal/draft-handler.js";
import type { DraftHandlerOptions } from "./internal/draft-handler.js";

export type { DraftHandlerOptions } from "./internal/draft-handler.js";

/** Export this as POST from app/api/next-test-mode/route.ts. */
export const createDraftModeHandler = (options: DraftHandlerOptions = {}) => {
  const handler = createDraftControl(
    async () => ({ draft: await draftMode(), cookies: await cookies() }),
    options,
  );
  return (request: Request) => withoutTestMode(() => handler(request));
};

export type NextTestModeOptions = Omit<
  InstallServerTestModeOptions,
  "getRequest"
>;

/** Call once from Next.js instrumentation.register in the Node runtime. */
export const setupNextTestMode = (options: NextTestModeOptions = {}) =>
  installServerTestMode({
    ...options,
    getRequest: async () => {
      try {
        const draft = await draftMode();
        if (!draft.isEnabled) return null;
        return requestFromDraft(
          draft,
          options.cookieKey ?? options.storageKey ?? "test-mode.entries",
        );
      } catch (error) {
        // Startup jobs have no request. Dynamic-rendering/control-flow errors
        // must still reach Next.js; do not silently turn them into cached data.
        if (
          error instanceof Error &&
          (/outside a request scope/.test(error.message) ||
            /draftMode.*inside `generateStaticParams`/.test(error.message))
        )
          return null;
        throw error;
      }
    },
  });
