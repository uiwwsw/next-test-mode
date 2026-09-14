/**
 * Next 16 keeps the request's Draft Mode provider across `use cache` boundaries.
 * Reading public headers() inside those boundaries throws, and reading it during
 * prerender would change a static route into a dynamic one. Keep this version-
 * sensitive bridge small, read-only, guarded, and covered by production fixtures.
 */
export const requestFromDraft = (draft: unknown, cookieKey: string) => {
  const provider = (draft as { _provider?: object })._provider;
  const jar = (
    provider as
      | {
          _mutableCookies?: {
            get: (key: string) => { value: string } | undefined;
          };
        }
      | undefined
  )?._mutableCookies;
  if (!provider || !jar || typeof jar.get !== "function")
    throw new Error(
      "Unsupported Next.js Draft Mode internals. Use a tested Next.js version with @uiwwsw/next-test-mode.",
    );
  const cookieHeader = [cookieKey, `${cookieKey}.ssr`]
    .flatMap((name) => {
      const value = jar.get(name)?.value;
      return value === undefined
        ? []
        : [`${name}=${encodeURIComponent(value)}`];
    })
    .join("; ");
  return { key: provider, cookieHeader };
};
