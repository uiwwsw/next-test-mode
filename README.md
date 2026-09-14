<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/test-mode/v0.5.0/docs/assets/hero.png" width="100%" alt="test mode — Same API calls. Your test data. Keep scenarios separate and change response values from the console." />
</p>

<p align="center">
  <strong>호출 코드는 그대로. 테스트 데이터는 따로. 확인은 콘솔에서.</strong><br />
  Keep your API calls. Isolate your scenarios. Try data from the console.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/test-mode"><img src="https://img.shields.io/npm/v/@uiwwsw/test-mode?style=flat-square&amp;color=173c36" alt="npm version" /></a>
  <a href="https://github.com/uiwwsw/test-mode/actions/workflows/ci.yml"><img src="https://github.com/uiwwsw/test-mode/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/test-mode?activeTab=dependencies"><img src="https://img.shields.io/badge/runtime_dependencies-0-173c36?style=flat-square" alt="Zero runtime dependencies" /></a>
  <a href="https://github.com/uiwwsw/test-mode/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-62796f?style=flat-square" alt="MIT license" /></a>
</p>

<p align="center">
  <a href="https://test-mode-tau.vercel.app/">Live demo ↗</a> ·
  <a href="https://test-mode-tau.vercel.app/api/ssr">SSR demo ↗</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#see-it-in-action">Demo</a> ·
  <a href="#csr-and-ssr">CSR / SSR</a> ·
  <a href="https://github.com/uiwwsw/test-mode/blob/main/docs/guide.md">사용 가이드</a> ·
  <a href="https://github.com/uiwwsw/test-mode/blob/main/docs/architecture.md">설계</a> ·
  <a href="https://github.com/uiwwsw/test-mode/blob/main/CHANGELOG.md">Changelog</a>
</p>

---

**test mode는 기존 API 호출 흐름으로 다양한 화면 상태를 확인하는 개발·QA 도구입니다.** 콘솔에서 `fetch` 응답을 교체하거나 일부 값을 바꿔, 빈 목록·할인·서버 오류를 실제 앱에서 재현합니다. **CSR부터 SSR까지 같은 콘솔 명령을 사용합니다.**

## Why test mode

| 호출 코드는 그대로 | 테스트 데이터는 따로 | 확인은 콘솔에서 |
| :--- | :--- | :--- |
| 앱 시작 시 한 번 연결하면 기존 `fetch()` 호출을 계속 사용합니다. 호출부마다 테스트 전용 함수나 조건 분기를 추가할 필요가 없습니다. | 한 번 확인할 값은 임시 테스트로 끝내고, 반복할 동작은 `src/test-mode/` 같은 전용 폴더에 모아 수정하고 공유합니다. | `test.patch()` 한 줄로 가격을 바꾸고, `test.mock()`으로 빈 목록이나 오류 응답을 넣습니다. `test.clear()`로 원래 응답에 복귀합니다. |

**앱의 호출 코드는 이대로 둡니다.**

```ts
// src/api/cart.ts — 평소에도, 테스트할 때도 같은 호출
export async function getCart() {
  const response = await fetch('/api/cart');
  return response.json();
}
```

**바꿔보고 싶은 값만 Console에 입력합니다.**

```js
test.patch('/api/cart', { total: 9.99 }); // 실제 상품은 유지하고 가격만 변경
// 앱이 getCart()를 다시 호출하면 변경된 데이터를 받습니다.
test.clear(); // 다음 호출부터 원래 응답
```

브라우저·서버의 시작 지점에 한 번 연결합니다. **Next.js는 설치 명령이 이 연결을 생성**하므로 페이지나 API 호출부를 바꿀 필요가 없습니다. [CSR / SSR 지원 범위](#csr-and-ssr).

## See it in action

**[CSR 데모 →](https://test-mode-tau.vercel.app/)** · **[실제 SSR 데모 →](https://test-mode-tau.vercel.app/api/ssr)** 로그인이나 설치 없이 콘솔·JSON 입력으로 직접 바꿔보세요. SSR 데모에서는 `test.patch('/api/cart.json', { total: 12.34 })`를 입력하면 서버가 생성한 HTML의 가격이 자동으로 바뀝니다.

<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/test-mode/v0.5.0/docs/assets/scenarios.gif" width="880" alt="같은 API 호출로 테스트 데이터를 바꾸는 실제 데모: 가격 변경, 직접 만든 상품, HTTP 오류, 원래 응답 복귀." />
</p>

**Console에서 값을 입력 → 테스트 모드 활성화 → 실제 앱 갱신.** `test.patch()`로 가격을 바꾸거나 `test.mock()`으로 상품·오류 응답을 직접 넣어보세요. JSON 편집기에서도 같은 API를 실행할 수 있습니다.

위 움짤은 **브라우저 fetch / CSR 예제**이며, 콘솔 변경을 구독해 화면을 자동 갱신합니다. 받은 응답·HTTP 상태·실제 네트워크 요청 횟수를 함께 표시합니다. 값은 이 탭의 메모리에만 있고, `test.clear()`나 새로고침으로 초기화됩니다. [SSR 데모](https://test-mode-tau.vercel.app/api/ssr)는 직접 입력한 값을 쿠키로 전달해 서버 HTML을 새로 받고, `test.clear()`로 초기화합니다.

[데모 실행 · Vercel Import 설정](https://github.com/uiwwsw/test-mode/tree/main/examples/browser) · [배너와 데모 생성 소스](https://github.com/uiwwsw/test-mode/blob/main/scripts/render-doc-assets.mjs)

## Quick start

### Next.js: 명령어로 최초 설정

```bash
npm install @uiwwsw/test-mode
npx @uiwwsw/test-mode init --next
npm run dev
```

프로젝트 루트에서 실행하세요. **브라우저와 Node 서버의 instrumentation 파일 두 개를 생성**하고, `src/` 구조와 TypeScript를 감지합니다. 기존 파일이 있으면 덮어쓰지 않고 합칠 코드를 보여줍니다. 개발 서버를 재시작한 뒤 Console에서:

```js
test.patch('/api/cart', { total: 9.99 }); // 자신의 API pathname으로 변경
// 브라우저 응답 + 다음 서버 렌더에 적용. 페이지는 자동 새로고침됩니다.
test.clear(); // 원래 응답으로 복귀하고 자동 새로고침
```

페이지·Server Component의 기존 `fetch()`를 그대로 사용합니다. Next.js 16의 Node 런타임을 지원하고, 생성되는 설정은 개발 환경에서만 켜집니다. 워커 파일·별도 테스트 API·공유 저장소를 설치할 필요가 없습니다. [생성 코드와 SSR 동작](https://github.com/uiwwsw/test-mode/blob/main/docs/server-rendering.md).

### 브라우저 앱: 시작 지점에 함수 하나

```ts
import { setupTestMode } from '@uiwwsw/test-mode';

const { stop } = setupTestMode({
  enabled: import.meta.env.DEV, // Vite 예시: 앱의 개발 환경 조건 사용
  refresh: () => refetchCart(), // 앱의 기존 재요청 함수
});
// 앱 종료 / HMR dispose에서 stop() 호출
```

`setupTestMode()`가 runtime·fetch·콘솔·오버레이를 한 번에 연결합니다. `refresh`는 선택 사항이며, 생략하면 앱의 다음 요청부터 바뀝니다. 직접 설정한 JSON은 기본적으로 메모리에만 남습니다.

```js
test.patch('/api/cart', { total: 9.99 }); // 실제 상품은 유지하고 가격만 변경
test.mock('/api/cart', { items: [], total: 0 }); // 응답 전체 교체
test.mock('/api/cart', { message: 'Retry' }, { status: 503 });
test.overrides();        // 직접 설정한 값 확인
test.reset('/api/cart'); // 이 경로의 직접 입력만 제거
test.clear();           // 입력한 값·시나리오 모두 끄기
```

기본 대상은 **GET + 정확한 pathname**입니다. 다른 메서드는 세 번째 인자에 `{ method: 'POST' }`를 전달합니다. Patch는 최상위 필드를 덮어쓰며 중첩 객체와 배열은 통째로 교체합니다. [자세한 동작](https://github.com/uiwwsw/test-mode/blob/main/docs/guide.md#직접-응답-값-넣기).

> SSR 동기화(`ssr: true`)를 켜면 직접 입력한 값도 세션 쿠키에 남아 새로고침 후 복원됩니다. 같은 브라우저의 탭이 공유하며 `test.clear()`로 해제합니다. 전체 상태는 URL 인코딩 후 **3,500바이트**까지 지원합니다. 큰 응답은 작은 `patch` 또는 파일에 등록한 시나리오로 관리하세요.

## Try once, or keep it in a folder

**한 번 확인할 테스트는 콘솔에서 끝내세요.** `test.mock()` / `test.patch()`로 입력하고 `test.clear()`로 끝냅니다. 기본 CSR 모드에서는 새로고침으로도 사라지며, SSR 동기화 모드에서는 새로고침 후에도 유지됩니다. 임시 실험을 위해 파일을 만들거나 API 호출부를 고칠 필요가 없습니다.

**다시 쓸 테스트는 별도 폴더에서 관리하세요.** 빈 목록·로그인 잠금·할인 같은 반복 시나리오는 앱 소유의 파일로 남깁니다. 화면 코드와 별도로 수정하고 코드 리뷰하거나 팀에 공유할 수 있습니다.

```text
src/
  api/cart.ts                  # 기존 API 호출 코드
  test-mode/
    config.ts                  # 개발 환경 설정
    index.ts                   # 테스트 정의 등록
    install.ts                 # 앱 시작 시 한 번 연결
    features/cart.ts           # API별 mock / patch와 테스트 데이터
    stories/cart.stories.ts    # 여러 API를 묶은 화면 시나리오
```

폴더의 동작을 등록한 뒤에는 `test.story('cart.empty')`처럼 콘솔에서 선택합니다. [스타터 템플릿](https://github.com/uiwwsw/test-mode/tree/main/templates/test-mode)을 복사해 시작할 수 있습니다. 등록된 시나리오의 **선택 상태**는 쿠키/localStorage에 유지됩니다. 서버도 같은 카탈로그를 등록하면 선택한 동작을 함께 재현합니다.

## CSR and SSR

| 데이터가 오는 곳 | 한 번 연결한 뒤의 동작 |
| :--- | :--- |
| 브라우저 `fetch` · CSR | `setupTestMode()` → 다음 응답에 `mock` / `patch` 적용. `refresh`로 앱의 재요청 연결 |
| Next.js 16 · Node SSR · Server Component | `init --next` → 기존 `fetch` 유지, 콘솔 JSON 전달, 자동 새 서버 렌더 |
| 일반 Node / Express / Vercel Node handler | 서버 시작 지점에 `withTestMode(handler)`, 브라우저에 `setupTestMode({ ssr: true, ... })` |
| 이미 받은 HTML · fetch 밖의 앱 캐시 · 정적 생성 페이지 | 새 요청 없이 소급 변경하지 않음. 필요하면 앱의 캐시 갱신 |
| DB 직접 조회 · XHR · WebSocket · Edge 런타임 | 자동 서버 연결 대상 아님. 별도 데이터 어댑터 필요 |

## Server rendering

일반 Node 서버도 **시작 지점만 한 번 감싸면 기존 `fetch()`를 유지**합니다.

```ts
import { createServer } from 'node:http';
import { withTestMode } from '@uiwwsw/test-mode/node';
import { app } from './app.js'; // 기존 Node/Express request handler

createServer(withTestMode(app)).listen(3000);
```

브라우저 시작 지점에는 `setupTestMode({ enabled: true, ssr: true })`를 **개발 환경에서만** 실행하세요. 브라우저 쿠키를 읽고 요청마다 값과 호출 횟수를 분리하므로 다른 방문자의 테스트 값이 섞이지 않습니다. 들어온 인증 쿠키를 외부 API로 자동 전달하지 않습니다.

Next.js에서는 위 custom server 없이 `init --next`를 사용합니다. 개발 시 서버 fetch 응답 변경을 Next의 데이터 캐시 바깥에서 처리하고, 요청 쿠키를 읽어 서버 렌더에 연결합니다. 이미 캐시된 페이지나 `use cache`로 fetch 자체를 건너뛰는 경로까지 무효화하는 기능은 아닙니다.

기존의 요청별 `createServerTestMode()`도 계속 지원합니다. [자동 설치 / 수동 어댑터 / 공유 시나리오 가이드](https://github.com/uiwwsw/test-mode/blob/main/docs/server-rendering.md).

## What you get

| 기능 | 사용 방법 |
| :--- | :--- |
| 콘솔에서 직접 응답 값 입력 | `test.mock()`, `test.patch()`, `test.reset()` |
| 팀이 공유하는 화면 시나리오 | `test.story('cart.empty')`, `test.story.list('/cart')` |
| API 한 개만 빠르게 전환 | `test.feat.add('/api/cart:empty')` |
| 현재 설정 확인과 검색 | `test.active()`, `test.search('cart')`, `test()` |
| 현재 화면에만 테스트 표시 | `pages`와 SPA 이동을 반영하는 오버레이 |
| 실제 응답을 유지하면서 필드 변경 | `definePatch()` |
| 특정 mock 요청만 실제 API에 전달 | `passThrough()` |
| 호출부를 유지하는 자동 SSR 연결 | `init --next`, `withTestMode()` |
| 필요한 조회만 수동으로 연결 | `createServerTestMode()` |
| 직접 작성하는 API 클라이언트 어댑터 | `runtime.resolve()`와 `runtime.applyPatch()` |
| 타입과 디버깅 지원 | TypeScript 선언, 소스 코드, source map 제공 |

**필요한 모듈만 가져올 수도 있습니다.** 기존 최상위 import는 그대로 지원합니다.

```ts
import { createTestMode, defineMock } from '@uiwwsw/test-mode/core';
import { createMockFetch } from '@uiwwsw/test-mode/fetch';
import { installTestModeOverlay } from '@uiwwsw/test-mode/browser';
import { createServerTestMode } from '@uiwwsw/test-mode/server';
import { withTestMode } from '@uiwwsw/test-mode/node';
import { setupNextTestMode } from '@uiwwsw/test-mode/next';
```

`core`에는 콘솔·오버레이 구현을 포함하지 않습니다. 서버 어댑터와 브라우저 설치 코드를 분리해서 구성할 수 있습니다.

## Fits your app

React, Vue, Next.js, Vite, 일반 JavaScript 앱에서 사용할 수 있는 ESM 패키지입니다. 모던 브라우저와 Node.js 18.17 이상을 지원하며, 외부 런타임 의존성이 없습니다. Next.js 연결만 앱에 설치된 Next.js를 선택적 peer로 사용합니다.

- 앱 소유의 [스타터 템플릿](https://github.com/uiwwsw/test-mode/tree/main/templates/test-mode)을 복사해 feature와 story를 관리하세요.
- [사용 가이드](https://github.com/uiwwsw/test-mode/blob/main/docs/guide.md)에서 typed handler, 경로 매칭, SSR cookie 전달, 확장 기능을 확인하세요.
- [설계 및 보장 범위](https://github.com/uiwwsw/test-mode/blob/main/docs/architecture.md)에서 처리 순서와 제약을 확인하세요.

이 패키지는 화면 상태를 재현하는 런타임입니다. 테스트 실행이나 assertion은 Playwright·Vitest 등의 도구가 담당합니다. 전역 `fetch`를 거치지 않는 XHR·WebSocket·iframe 통신에는 별도 어댑터가 필요합니다. 본문 전체를 읽는 patch는 무한 SSE 스트림에 적용하지 마세요.

## Develop & release

```bash
npm ci
npm run ci             # 타입 · 런타임 · tarball 설치 및 consumer 타입 검증
npm run test:browser   # Chromium 통합 테스트 (최초: npx playwright install chromium)
npm run dev:example    # 콘솔 · JSON 입력 데모
npm run test:next      # 설치 명령 → 실제 Next.js SSR · 방문자 분리 · 캐시 검증
npm run dev:ssr        # 콘솔 JSON → 자동 SSR HTML 갱신 예제
npm run build:demo     # Vercel용 demo-dist 생성
```

릴리스 태그·버전·main 포함 여부를 확인한 뒤, 모든 검증을 통과한 버전만 GitHub Actions에서 npm에 provenance와 함께 발행합니다. [배포 절차와 문서 이미지 갱신](https://github.com/uiwwsw/test-mode/blob/main/docs/releasing.md).

<p align="center">
  <sub>Built for repeatable debugging. Shared for easier QA.</sub><br />
  <a href="https://github.com/uiwwsw/test-mode/issues">문제 제보</a> ·
  <a href="https://github.com/uiwwsw/test-mode/releases">릴리스</a> ·
  <a href="https://github.com/uiwwsw/test-mode/blob/main/LICENSE">MIT License</a>
</p>
