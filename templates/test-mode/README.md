# Test Mode App Template

Keep your API calls. Keep test scenarios in their own folder. Change data from the console.

This is an app-owned folder: edit mock/patch data and reusable screen scenarios here, then select them from DevTools. Install once in the client bootstrap and continue using the app's existing browser `fetch()` calls. Each call site can keep its normal production code.

For a one-off check, skip creating scenario files: `test.patch('/api/cart', { total: 9.99 })` or `test.mock('/api/cart', { items: [], total: 0 })` applies a temporary value in memory. `test.clear()` or a reload discards those values. When an experiment is useful again, capture it in `features/` and `stories/` so the team can edit, review and reuse it.

Copy this folder into your app, usually as:

```txt
src/test-mode/
```

Recommended structure:

```txt
src/test-mode/
  config.ts
  index.ts
  install.ts
  features/
    auth.ts
  stories/
    auth.stories.ts
```

- `features/*`: one API mock/patch behavior per entry.
- `stories/*`: combinations of feature entries for shared screen states.
- `config.ts`: app-specific runtime settings.
- `index.ts`: creates the app test-mode runtime.
- `install.ts`: installs console, overlay, and fetch patching.

Put `pages` on feature entries. Stories inherit and merge the pages from their referenced features, so a story usually does not need its own `pages`.

Console basics:

```js
test.patch('/api/cart', { total: 9.99 }); // one-off response value
test.clear();                           // restore the real API
test();
test.search();
test.search("login");
test.feat.list();
test.story.list("/login");
test.story.set("auth.login.locked");
```

After installing, call `installAppTestMode()` once from your client bootstrap.

Temporary JSON is not persisted; registered feature/story selections are persisted in cookie/localStorage. This browser template does not intercept SSR data fetching. Use the [server adapter](https://github.com/uiwwsw/test-mode/blob/main/docs/server-rendering.md) for server requests.

## Enable it deliberately

The template defaults to enabled only when `NODE_ENV` is `development` or `test`.
For a Vite browser app, replace `runtimeConfig.enabled` in `config.ts` with:

```ts
enabled: () => import.meta.env.DEV,
```

Use your own build/environment condition in other apps. A browser without a
`process` global is disabled by default. Install once, retain the returned cleanup
function and invoke it on teardown or HMR disposal. Selecting a scenario does not
refetch application data; trigger the affected request or reload the page.

Next.js에서 직접 JSON과 SSR까지 바로 연결하려면 `npx @uiwwsw/test-mode init --next`로 시작하세요. 이 템플릿은 API별 정의와 공유 시나리오를 앱 소유 폴더에 남기는 예제입니다. 두 설치 방식을 중복 실행하지 말고, 기존 설치의 옵션에 카탈로그를 등록하세요. [자동 SSR 연결 가이드](https://github.com/uiwwsw/test-mode/blob/main/docs/server-rendering.md).
