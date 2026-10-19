**English** · [한국어](./README.ko.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/next-test-mode/v1.0.2/docs/assets/hero.png" width="100%" alt="Next Test Mode — One console. Server data, too." />
</p>
<p align="center"><strong>Test Next.js API data and page states from the console.</strong><br />Keep your fetch calls. Try the data you need. Check the real page.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/next-test-mode"><img src="https://img.shields.io/npm/v/@uiwwsw/next-test-mode?style=flat-square&amp;color=173c36" alt="npm version" /></a>
  <a href="https://github.com/uiwwsw/next-test-mode/actions/workflows/ci.yml"><img src="https://github.com/uiwwsw/next-test-mode/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Next.js-App_Router-173c36?style=flat-square" alt="Next.js App Router" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-62796f?style=flat-square" alt="MIT license" /></a>
</p>
<p align="center"><a href="https://next-test-mode.vercel.app/en">Live demo ↗</a> · <a href="#quick-start">Quick start</a> · <a href="#rendering-support">Compatibility</a> · <a href="./docs/guide.md">API guide</a></p>

**Reproduce the data and page states you need during development with one console command.** Next Test Mode is a development and QA tool for mocking and patching Next.js fetch responses: empty lists, different prices, server errors, and reusable scenarios, without editing individual API calls.

The browser console alone cannot easily change HTML already rendered on the server or data fixed at build time. **Next Test Mode carries your console values to the server and opens a session-scoped preview path.** Just as you reproduce different page states in dev mode, you can use the same commands across browser, server, and static page examples.

CSR, SSR, ISR and SSG demonstrate the reach of this workflow. Server previews use Next Draft Mode to bypass static and revalidation caches for your test session. They do not regenerate public static files or change other visitors' pages. Supported fetch-based data can be mocked or patched; direct database calls and other transports need separate integration.

> `@uiwwsw/test-mode` is now **`@uiwwsw/next-test-mode`**. See the [migration guide](./docs/migration.md).

## Why Next Test Mode

| Keep your calls | Test from the console | Save reusable scenarios |
| :--- | :--- | :--- |
| Connect once and keep existing `fetch()` calls. No per-call test branches. | Change values, reload automatically, and check the actual page, including server HTML. | Keep repeated tests in a dedicated folder shared by the browser and server. |

```ts
// Your application code stays the same.
const response = await fetch('https://api.example.com/api/cart');
const cart = await response.json();
```

```js
// DevTools → Console: use your own API pathname.
test.patch('/api/cart', { total: 9.99 });
// Draft Mode connects automatically and the page refreshes.
test.clear();
```

## Quick start

From a **Next.js 16 App Router / Node.js 20.9+** project:

```bash
npm install @uiwwsw/next-test-mode
npx @uiwwsw/next-test-mode init
npm run dev
```

The installer detects `app/` or `src/app/` and JavaScript or TypeScript. It generates three thin integration files and a dedicated test folder:

| File | Purpose |
| :--- | :--- |
| `instrumentation.ts` or `.js` | Connect request-scoped test data to existing server fetch calls |
| `instrumentation-client.ts` or `.js` | Connect the console, browser fetch, Draft Mode and automatic refresh |
| `app/api/next-test-mode/route.ts` or `.js` | POST route to enable or disable the Next.js Draft Mode cookie |

```text
src/                      # Project root when there is no src/
  app/                    # Real pages and APIs do not import the test folder
  test-mode/
    catalog.ts            # Edit mock, patch and story definitions here
    client.ts             # Console and browser integration
    server.ts             # Server fetch and Draft integration
```

Browser and server share one catalog. The generated conditional integration excludes the test catalog from ordinary production builds; CI checks the actual client and server bundles. QA builds intentionally include it.

The installer leaves pages, API functions and Next configuration untouched. If an integration file already exists, it prints the code to merge without overwriting the file. No worker or separate server is required.

Development is enabled by default. To use an intentional QA deployment, set **`NEXT_PUBLIC_NEXT_TEST_MODE=1` at build time and runtime**. Your application owns access control. See [generated setup and authorization](./docs/server-rendering.md).

## See it in action

Open the [English demo](https://next-test-mode.vercel.app/en) or [한국어 데모](https://next-test-mode.vercel.app/). Change a cart value in the console, check the updated page, then clear the test.

<p align="center"><img src="https://raw.githubusercontent.com/uiwwsw/next-test-mode/v1.0.2/docs/assets/scenarios.gif" width="960" alt="Console patch changes a static cart preview and server HTML; mock an HTTP error, then restore the original response." /></p>

Use DevTools Console or the demo's JSON editor:

```js
test.patch('/api/cart.json', { total: 9.99 });
test.mock('/api/cart.json', { items: [], total: 0 });
test.mock('/api/cart.json', { message: 'Try again' }, { status: 503 });
test.overrides();               // Inspect console overrides
test.reset('/api/cart.json');   // Remove direct overrides for this path
test.clear();                  // Clear all overrides and scenarios
```

Server previews put the changed data in the **HTML returned by the server**. Other browser sessions keep their original responses. Values survive reloads and are shared by tabs in the same browser. Finish with `test.clear()`.

## Rendering support

In development and QA, browser fetch interception handles CSR. Server requests read test values from cookies. Next Draft Mode bypasses static and revalidation caches for that session, allowing a fresh HTML preview even for an SSG or ISR page.

| Rendering path | After a console change |
| :--- | :--- |
| **CSR** | Intercept or patch browser fetch responses, then refresh |
| **SSR / Server Components** | Apply values to request-scoped server fetch calls and render new HTML |
| **SSG / `force-static`** | Bypass the static result through a session-scoped Draft Mode preview |
| **ISR** | Bypass the page and data cache for the preview; retain the shared ISR result |
| **`unstable_cache` / `use cache`** | Apply to fetch calls executed through the Draft Mode cache-bypass path |
| **`generateStaticParams`** | Preview existing generated routes; console commands do not regenerate the build-time route list |

`test.clear()` releases Draft Mode owned by this tool and returns to the default cache path. Existing CMS Draft sessions are preserved.

Validated against **Next.js 16.4.2 / App Router / Node runtime** with real production builds. Pages Router, Edge and `output: 'export'` are outside automatic integration. Direct database reads, XHR, WebSocket and external caches that do not use fetch need adapters. A small bridge reads request cookies inside cached Next scopes; rerun production regression tests when upgrading Next. [How it works and compatibility](./docs/server-rendering.md).

## Console controls the server preview

Mock and patch commands connect the preview automatically. You can also bypass caches to inspect fresh real data without changing it:

```js
test.cache.bypass();  // Keep existing overrides and open a server preview
test.cache.status();  // Inspect Draft status, pending changes and errors
test.cache.refresh(); // Render again with the same values
test.cache.restore(); // Clear tests and return to the default cache path
```

`refresh()` requests a fresh server render while Draft Mode is active; otherwise the existing cache policy applies. `test.clear()` also ends all tests. These controls cover your session's Next rendering and data cache path, not shared cache deletion, browser HTTP caches, SWR/React Query, Redis or external CDNs. [Cache behavior and design](./docs/concept.md).

## Try once, or keep it in a folder

For a one-off check, use `test.mock()` or `test.patch()`, inspect the page, then `test.clear()`. No temporary file or API call edits are needed.

Keep repeated tests in the generated `test-mode/catalog.ts` and split larger catalogs into feature and story files:

```ts
import { defineMock } from '@uiwwsw/next-test-mode/core';

export const catalog = {
  cookieKey: 'test-mode.entries',
  definitions: [
    defineMock('/api/cart', () => ({ items: [], total: 0 }), {
      caseKey: 'empty',
      pages: ['/cart'],
    }),
  ],
};
```

Select this case with `test.feat.add('/api/cart:empty')`. Activate a story spanning multiple APIs with `test.story('cart.empty')`. Definitions used by the server must avoid browser-only code.

Running `init` again preserves the edited test folder. `init --migrate` migrates unchanged generated 0.5/0.6 setup; customized integration files receive manual merge instructions. [Migration guide](./docs/migration.md).

## Details that matter

- Direct overrides match **GET plus exact pathname** by default. Specify other methods with `{ method: 'POST' }`. Identical pathnames on different hosts match together.
- `patch` overwrites top-level fields of the real response. Nested objects and arrays are replaced as a whole; the network request still runs. `mock` supplies the matching response directly.
- The total URL-encoded cookie state is limited to **3,500 bytes**. Use a small patch or a file-defined scenario for larger responses. Browser session restoration may restore cookies too.
- Draft connection failures emit a console error and `next-test-mode:error`; they do not trigger a reload. Await `ready` or `sync()` to verify success. [Client API](./docs/server-rendering.md#클라이언트-연결-상태).
- Test cookies are not authentication. The application controls QA access. Incoming authentication cookies are not automatically forwarded to external APIs.
- This tool reproduces page states. Use Playwright or Vitest for automated assertions and pass/fail results.

## Framework-independent APIs

The core, browser and Node APIs remain available under the new package name. Next.js is an optional peer; generic APIs work without it. There are no external runtime dependencies.

```ts
import { setupTestMode } from '@uiwwsw/next-test-mode';
import { createTestMode, defineMock } from '@uiwwsw/next-test-mode/core';
import { createMockFetch } from '@uiwwsw/next-test-mode/fetch';
import { withTestMode } from '@uiwwsw/next-test-mode/node';
import { createServerTestMode } from '@uiwwsw/next-test-mode/server';
```

For a generic browser application, connect `setupTestMode({ enabled: true, refresh: () => refetch() })` once at startup. Direct JSON overrides stay in memory by default. Use the generated `init` integration for Next Draft Mode. [Full API guide](./docs/guide.md) (Korean).

## Develop & release

```bash
npm ci
npx playwright install chromium
npm run ci             # Types, runtime tests, tarball installation and consumer types
npm run test:browser   # Browser console, fetch and Draft integration
npm run test:next      # Next dev, production, Cache Components and disabled builds
npm run test:demo      # Rendering examples, localized SEO and mobile editor
npm run dev:demo       # Next.js demo
npm run build:demo     # Vercel production build
```

A GitHub Release from a verified main tag triggers CI and npm publishing with provenance. Stable releases use `latest`. Version 1.0 retains the 0.7 public APIs. [Release process](./docs/releasing.md) · [Architecture](./docs/architecture.md) · [Changelog](./CHANGELOG.md).
