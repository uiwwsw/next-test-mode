import { AsyncLocalStorage } from "node:async_hooks";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServerTestMode } from "./server.js";
import { createMockFetch } from "./fetch.js";
import type { TestModeOptions } from "./types.js";

type Handler = (request: IncomingMessage, response: ServerResponse) => unknown;
type Scope = { owner: object; active: boolean; fetch: typeof fetch };
const requests = new AsyncLocalStorage<Scope | undefined>();
const installations = new WeakMap<typeof fetch, { previous: typeof fetch; active: boolean }>();

export type ServerRequestContext = Readonly<{ key: object; cookieHeader: string | null }>;
export type InstallServerTestModeOptions = Omit<WithTestModeOptions, "enabled"> & Readonly<{
  /** Framework-owned request identity and incoming cookie; null outside a request. */
  getRequest: () => ServerRequestContext | null | Promise<ServerRequestContext | null>;
  enabled?: boolean | (() => boolean);
}>;

/** Install once for a framework that exposes its current request context. */
export const installServerTestMode = ({
  getRequest,
  enabled = () => ["development", "test"].includes(process.env.NODE_ENV ?? ""),
  ssr = true,
  allowedPaths,
  ...options
}: InstallServerTestModeOptions) => {
  if (enabled === false) return () => {};
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  if (!descriptor?.configurable || !("value" in descriptor))
    throw new TypeError("Automatic server test mode requires a configurable fetch value. Install it once before other fetch accessors.");
  const bypass = new AsyncLocalStorage<boolean>();
  const scopes = new WeakMap<object, ReturnType<typeof createServerTestMode>["runtime"]>();
  const proxies = new WeakMap<typeof fetch, typeof fetch>();
  let active = true;
  let transport = globalThis.fetch;
  const wrap = (original: typeof fetch): typeof fetch => {
    const existing = proxies.get(original);
    if (existing) return existing;
    const proxy = new Proxy(original, {
      apply(target, receiver, args: Parameters<typeof fetch>) {
        const forward = () => Reflect.apply(target, receiver, args) as ReturnType<typeof fetch>;
        if (!active || bypass.getStore() || !(typeof enabled === "function" ? enabled() : enabled)) return forward();
        return bypass.run(true, async () => {
          const request = await getRequest();
          if (!request) return forward();
          const [input, init] = args;
          if (allowedPaths && !allowedPaths.includes(new URL(input instanceof Request ? input.url : String(input)).pathname)) return forward();
          let runtime = scopes.get(request.key);
          if (!runtime) {
            runtime = createServerTestMode({ ...options, enabled: true, ssr, cookieHeader: request.cookieHeader, originalFetch: target.bind(receiver) }).runtime;
            scopes.set(request.key, runtime);
          }
          // The framework fetch may be replaced during startup/HMR. Wrap the
          // current target, keeping our response changes outside its data cache.
          return createMockFetch(runtime, { cookieHeader: false, originalFetch: target.bind(receiver) })(input, init);
        });
      },
    });
    proxies.set(original, proxy);
    proxies.set(proxy, proxy);
    return proxy;
  };
  const get = () => wrap(transport);
  const set = (next: typeof fetch) => {
    if (typeof next !== "function") throw new TypeError("fetch must be a function.");
    transport = next;
  };
  Object.defineProperty(globalThis, "fetch", { configurable: true, enumerable: descriptor.enumerable ?? false, get, set });
  return () => {
    active = false;
    if (Object.getOwnPropertyDescriptor(globalThis, "fetch")?.get === get)
      Object.defineProperty(globalThis, "fetch", { ...descriptor, value: transport });
  };
};

export type WithTestModeOptions = Omit<TestModeOptions, "enabled"> & Readonly<{
  enabled?: boolean | ((request: IncomingMessage) => boolean);
  /** Accept browser JSON synchronization. Defaults to true for this request wrapper. */
  ssr?: boolean;
  /** Optional exact pathname allowlist, useful for public demos. */
  allowedPaths?: readonly string[];
}>;

/** Wrap the server handler once. All ordinary global fetch calls in that request share its isolated state. */
export const withTestMode = <T extends Handler>(handler: T, {
  enabled = () => ["development", "test"].includes(process.env.NODE_ENV ?? ""),
  ssr = true,
  allowedPaths,
  ...options
}: WithTestModeOptions = {}): T & { dispose: () => void } => {
  const owner = {};
  const previous = globalThis.fetch;
  const installation = { previous, active: true };
  const replacement: typeof fetch = (input, init) => {
    const scope = requests.getStore();
    if (!installation.active || !scope?.active || scope.owner !== owner)
      return previous.call(globalThis, input, init);
    if (allowedPaths) {
      const url = input instanceof Request ? input.url : String(input);
      if (!allowedPaths.includes(new URL(url).pathname))
        return previous.call(globalThis, input, init);
    }
    // Handler-authored fetches and transport hooks must not re-enter the same mock.
    return requests.run(undefined, () => scope.fetch(input, init));
  };
  if (enabled !== false) {
    installations.set(replacement, installation);
    globalThis.fetch = replacement;
  }
  const dispose = () => {
    installation.active = false;
    if (globalThis.fetch === replacement) {
      let restore = previous;
      let state = installations.get(restore);
      while (state && !state.active) {
        restore = state.previous;
        state = installations.get(restore);
      }
      globalThis.fetch = restore;
    }
  };
  const wrapped = function (this: unknown, request: IncomingMessage, response: ServerResponse) {
    if (!installation.active || !(typeof enabled === "function" ? enabled(request) : enabled))
      return requests.run(undefined, () => handler.call(this, request, response));
    const { runtime, fetch } = createServerTestMode({
      ...options,
      enabled: true,
      ssr,
      cookieHeader: request.headers.cookie ?? null,
      originalFetch: previous.bind(globalThis),
    });
    const scope: Scope = { owner, active: true, fetch };
    const end = () => { scope.active = false; };
    response.once("finish", end);
    response.once("close", end);
    if (runtime.active().length || runtime.overrides().length)
      response.setHeader("Cache-Control", "private, no-store");
    return requests.run(scope, () => handler.call(this, request, response));
  };
  return Object.assign(wrapped, { dispose }) as T & { dispose: () => void };
};
