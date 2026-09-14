type CookieOptions = {
  path: string;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  maxAge?: number;
};
export type DraftContext = {
  draft: { isEnabled: boolean; enable: () => void; disable: () => void };
  cookies: {
    get: (name: string) => { value: string } | undefined;
    set: (name: string, value: string, options: CookieOptions) => unknown;
  };
};
export type DraftHandlerOptions = Readonly<{
  enabled?: boolean | (() => boolean);
  /** Optional app authorization, in addition to the same-origin POST checks. */
  authorize?: (request: Request) => boolean | Promise<boolean>;
  /** Match the cookieKey used by the browser/server runtime. */
  cookieKey?: string;
}>;

const result = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });

export const createDraftControl =
  (
    getContext: () => Promise<DraftContext>,
    {
      enabled = () => process.env.NODE_ENV === "development",
      authorize,
      cookieKey = "test-mode.entries",
    }: DraftHandlerOptions = {},
  ) =>
  async (request: Request): Promise<Response> => {
    if (!(typeof enabled === "function" ? enabled() : enabled))
      return result({ error: "Not found" }, 404);
    if (request.method !== "POST") return result({ error: "Use POST" }, 405);
    const url = new URL(request.url);
    if (
      request.headers.get("origin") !==
        `${url.protocol}//${request.headers.get("host") ?? url.host}` ||
      request.headers.get("x-next-test-mode") !== "1" ||
      (request.headers.has("sec-fetch-site") &&
        request.headers.get("sec-fetch-site") !== "same-origin")
    )
      return result({ error: "A same-origin request is required" }, 403);
    if (authorize && !(await authorize(request)))
      return result({ error: "Not authorized" }, 403);
    if (
      request.headers.get("content-type")?.split(";")[0]?.trim() !==
      "application/json"
    )
      return result({ error: "Use application/json" }, 415);
    let input: unknown;
    try {
      const reader = request.body?.getReader();
      if (!reader) return result({ error: "Missing body" }, 400);
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 1024) {
          await reader.cancel();
          return result({ error: "Request too large" }, 413);
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return result({ error: "Invalid JSON" }, 400);
    }
    if (
      !input ||
      typeof input !== "object" ||
      typeof (input as { enabled?: unknown }).enabled !== "boolean"
    )
      return result({ error: "enabled must be a boolean" }, 400);
    const desired = (input as { enabled: boolean }).enabled;
    const { draft, cookies } = await getContext();
    const marker = `${cookieKey}.draft-owner`;
    const owned = cookies.get(marker)?.value === "1";
    const before = draft.isEnabled;
    const attributes: CookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
    };
    if (desired && !before) {
      draft.enable();
      cookies.set(marker, "1", attributes);
    } else if (!desired && owned) {
      draft.disable();
      cookies.set(marker, "", { ...attributes, maxAge: 0 });
    }
    // Do not disable a CMS preview session that this package did not create.
    return result({
      enabled: draft.isEnabled,
      changed: before !== draft.isEnabled,
    });
  };
