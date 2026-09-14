# Changelog

## 0.6.0 — Next Test Mode

- Rename the npm package to `@uiwwsw/next-test-mode` and repository to `uiwwsw/next-test-mode`; retain the old package for existing installs and document migration.
- Add Next App Router Draft Mode coordination with unchanged fetch call sites: CSR, SSR, SSG, ISR, force-static, generated routes and cached fetch previews.
- Generate server/client instrumentation plus a guarded Draft POST route; migrate unchanged 0.5.0 hooks with `init --migrate`. Production stays disabled unless explicitly enabled for QA.
- Isolate request state and control/authorization fetches; serialize rapid Console changes, preserve pre-existing CMS Draft sessions and restore ordinary caches on clear.
- Replace the public demo with a real Next.js app featuring four render modes, Console/JSON editing, HTTP errors and mobile layouts.
- Add production, Cache Components and disabled-build integration checks. Document the version-sensitive Draft provider bridge, Next 16.3.5 compatibility and Node 20.9 minimum.


## 0.5.0 — 2026-09-14

- Keep existing browser and server `fetch()` call sites: one-call browser setup, a Node request wrapper, and a Next.js 16 Node instrumentation adapter.
- Add `npx @uiwwsw/test-mode init --next` to generate first-time setup, detect src/TypeScript projects, and preserve existing instrumentation files.
- Opt in to SSR JSON synchronization: Console `mock` / `patch` values survive reloads and refresh server-rendered HTML automatically. Session cookies are limited to 3,500 encoded bytes; rejected changes preserve working state.
- Isolate server state and counters per request. Keep overrides outside Next fetch caching and avoid browser hydration attribute changes.
- Add a public interactive SSR demo, raw-HTML and concurrent-visitor regressions, plus a real Next.js app installation test in CI.
- Preserve low-level APIs and the default memory-only lifetime of browser JSON overrides. Explain automatic setup, lifecycle, framework support and cache boundaries in the README and guides.

## 0.4.1 — 2026-09-14

- Lead the README, npm presentation and live demo with three benefits: unchanged browser fetch call sites after bootstrap setup, isolated reusable scenario files, and immediate console data experiments.
- Show the same application API call with different test data, and explain when to keep an experiment temporary or move it into an app-owned test-mode folder.
- Refresh the banner and recorded demo while retaining explicit CSR/SSR and persistence boundaries. Runtime APIs are unchanged.

## 0.4.0 — 2026-09-14

- Define test mode as console-first API response overrides for UI debugging, with an explicit CSR/SSR support matrix and updated playground guidance.
- Add `createServerTestMode` and the `./server` entry point: a fresh runtime and fetch per incoming server request, selected from registered cookie entries, with isolated counters and server-authored overrides.
- Add `cookieHeader: false` to the fetch adapter so outgoing API authentication cookies cannot override an already captured request selection. Existing string/null behavior remains compatible.
- Include a runnable Node HTTP SSR example, Next.js integration guidance, and browser-to-server cookie handoff tests. Temporary console JSON remains local to the browser.

## 0.3.1 — 2026-09-14

- Link directly to the public Vercel playground from the README and demo documentation.
- Allow longer npm registry propagation during post-publication verification, avoiding a failed run after a successful publish.

## 0.3.0 — 2026-09-14

- Add immediate console response values with `test.mock`, `test.patch`, `test.overrides` and `test.reset`, backed by typed core APIs. Values are detached JSON snapshots and never persisted.
- Give temporary responses explicit path/method precedence, transactional input validation, mock HTTP status control and cookie-scoped server isolation.
- Rebuild the demo around DevTools commands and a real JSON editor, automatic request refresh, HTTP/response inspection, request counts, error handling and reset.
- Add a static sample API, portable demo build, and root Vercel configuration for Git import without secrets or server functions.
- Verify custom values, JSON errors, rapid edits, keyboard/copy flow and mobile/nested-path hosting.

## 0.2.0 — 2026-09-09

- Redesign the README and npm presentation with a custom banner, an actual four-state demo, concise onboarding and dedicated usage/release guides.
- Split the runtime, browser controls, fetch adapter, public types and shared helpers; add `./core`, `./browser` and `./fetch` exports without changing root imports.
- Preserve active scenarios on unknown story names; notify subscribers after successful dynamic registration.
- Make console/overlay installation transactional, teardown idempotent, and nested installation safe in either cleanup order. Continue releasing resources when an extension teardown fails.
- Synchronize cross-tab storage removal without resurrecting stale cookie selections.
- Add browser lifecycle regressions, a real local API playground, and consumer tests for every public entry point.

## 0.1.0 — 2026-09-09

First npm release of the API scenario runtime for development and QA.

- Mock and patch API responses; combine entries into named stories controlled from a browser console and page-aware overlay.
- Extract the fetch adapter and fix DELETE bodies, Request header replacement, empty bodies, form inputs, binary payloads, HEAD and bodyless HTTP statuses.
- Leave unmatched responses and streaming bodies untouched. Preserve response metadata and application headers when patching, and support JSON null patch results.
- Respect cancellation and restore fetch hooks safely, including nested installs.
- Isolate request counts by runtime; validate ambiguous features and conflicting stories; canonicalize API aliases and roll back invalid registration.
- Make browser subscriptions fire once and keep controls usable when persistence fails. Clean up overlay markers and pending navigation refreshes.
- Require explicit development/test activation and replace application-specific storage/event defaults with neutral names.
- Fix typed mock/patch registration for consumers and ship usable source/declaration maps.
- Add Node and Chromium regression tests, real tarball installation/type checks, npm lockfile and guarded GitHub Actions publication using NPM_TOKEN/provenance with OIDC support.
- Rewrite the README around the package's purpose, limits, configuration, request lifecycle and release process.
