<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/test-mode/v0.3.0/docs/assets/hero.png" width="100%" alt="test mode — Your app. Every API state. API mocks, response patches, and repeatable QA scenarios." />
</p>

<p align="center">
  <strong>콘솔에서 원하는 응답을 넣고, 실제 화면을 확인하세요.</strong><br />
  Framework-neutral API scenarios for development &amp; QA.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/test-mode"><img src="https://img.shields.io/npm/v/@uiwwsw/test-mode?style=flat-square&amp;color=173c36" alt="npm version" /></a>
  <a href="https://github.com/uiwwsw/test-mode/actions/workflows/ci.yml"><img src="https://github.com/uiwwsw/test-mode/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/test-mode?activeTab=dependencies"><img src="https://img.shields.io/badge/runtime_dependencies-0-173c36?style=flat-square" alt="Zero runtime dependencies" /></a>
  <a href="https://github.com/uiwwsw/test-mode/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-62796f?style=flat-square" alt="MIT license" /></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#see-it-in-action">Demo</a> ·
  <a href="https://github.com/uiwwsw/test-mode/blob/main/docs/guide.md">사용 가이드</a> ·
  <a href="https://github.com/uiwwsw/test-mode/blob/main/docs/architecture.md">설계</a> ·
  <a href="https://github.com/uiwwsw/test-mode/blob/main/CHANGELOG.md">Changelog</a>
</p>

---

로그인 잠금, 빈 장바구니, 일시적인 서버 오류. 매번 계정이나 서버 데이터를 바꾸지 않고, **앱의 실제 UI에서 필요한 상태를 재현**하세요. API 동작을 feature로 정의하고, 팀이 공유할 시나리오를 story로 묶습니다.

| Mock | Patch | Story |
| :--- | :--- | :--- |
| 요청 전에 응답을 만듭니다. | 실제 응답의 일부를 바꿉니다. | 여러 API 동작을 하나로 선택합니다. |
| 빈 목록 · HTTP 오류 · 특정 계정 상태 | 실제 상품 + 테스트 할인 · 재고 변경 | `cart.empty` · `auth.login.locked` |

## See it in action

<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/test-mode/v0.3.0/docs/assets/scenarios.gif" width="880" alt="실제 실행 데모: JSON 입력으로 가격을 변경하고, 직접 만든 상품을 mock하고, HTTP 오류를 적용한 뒤 원래 응답으로 복귀합니다." />
</p>

**Console에서 값을 입력 → 테스트 모드 활성화 → 실제 앱 갱신.** `test.patch()`로 가격을 바꾸거나 `test.mock()`으로 상품·오류 응답을 직접 넣어보세요. JSON 편집기에서도 같은 API를 실행할 수 있습니다.

데모에서는 콘솔 변경을 구독해 화면을 자동 갱신합니다. 받은 응답·HTTP 상태·실제 네트워크 요청 횟수를 함께 표시합니다. 값은 이 탭의 메모리에만 있고, `test.clear()`나 새로고침으로 초기화됩니다.

[데모 실행 · Vercel Import 설정](https://github.com/uiwwsw/test-mode/tree/main/examples/browser) · [배너와 데모 생성 소스](https://github.com/uiwwsw/test-mode/blob/main/scripts/render-doc-assets.mjs)

## Quick start

```bash
npm install @uiwwsw/test-mode
```

**1. 개발 환경에서 fetch와 콘솔을 연결합니다.** Vite 앱의 클라이언트 초기화 예제입니다.

```ts
import {
  createTestMode, installMockFetch, installTestModeOverlay,
} from '@uiwwsw/test-mode';

const runtime = createTestMode({ enabled: () => import.meta.env.DEV });
const stopFetch = installMockFetch(runtime);
const stopOverlay = installTestModeOverlay(runtime); // console의 test도 설치

// 앱 종료, effect cleanup, HMR dispose 시 호출
const cleanup = () => { stopOverlay(); stopFetch(); };
```

**2. 개발자 도구의 Console에서 원하는 값을 넣습니다.** 별도의 feature/story 등록 없이 바로 활성화됩니다.

```js
test.patch('/api/cart', { total: 9.99 }); // 실제 응답의 total만 변경
test.mock('/api/cart', { items: [], total: 0 }); // 응답 전체 교체
test.mock('/api/cart', { message: 'Retry' }, { status: 503 });
test.overrides();        // 직접 설정한 값 확인
test.reset('/api/cart'); // 임시 값만 제거 (기존 시나리오가 있으면 복귀)
test.clear();           // 임시 값·시나리오 모두 끄기
```

앱에서 API를 다시 요청하면 변경된 값을 받습니다. 이 데모처럼 즉시 화면을 갱신하려면 `runtime.subscribe(() => refetchCart())`를 연결하고 반환된 해제 함수를 앱 종료 시 호출하세요.

기본 대상은 **GET + 정확한 pathname**입니다. POST 등은 세 번째 인자에 `{ method: 'POST' }`를 전달합니다. Patch는 객체의 최상위 필드를 덮어쓰며 중첩 객체와 배열은 통째로 교체합니다. 임시 값은 저장하지 않고 선택된 시나리오보다 우선 적용합니다. [자세한 동작](https://github.com/uiwwsw/test-mode/blob/main/docs/guide.md#직접-응답-값-넣기).

> `enabled`는 Node의 `development` / `test` 환경에서만 기본 활성화됩니다. 브라우저에서는 앱의 개발 환경 조건을 명시하세요. 팀이 공유할 동작은 `defineMock` / `definePatch`로 등록하고 `defineStory`로 묶을 수 있습니다.

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
| 서버·API 클라이언트 연결 | `runtime.resolve()`와 `runtime.applyPatch()` |
| 타입과 디버깅 지원 | TypeScript 선언, 소스 코드, source map 제공 |

**필요한 모듈만 가져올 수도 있습니다.** 기존 최상위 import는 그대로 지원합니다.

```ts
import { createTestMode, defineMock } from '@uiwwsw/test-mode/core';
import { createMockFetch } from '@uiwwsw/test-mode/fetch';
import { installTestModeOverlay } from '@uiwwsw/test-mode/browser';
```

`core`에는 콘솔·오버레이 구현을 포함하지 않습니다. 서버 어댑터와 브라우저 설치 코드를 분리해서 구성할 수 있습니다.

## Fits your app

React, Vue, Next.js, Vite, 일반 JavaScript 앱에서 사용할 수 있는 ESM 패키지입니다. 모던 브라우저와 Node.js 18.17 이상을 지원하며, 런타임 의존성이 없습니다.

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
npm run build:demo     # Vercel용 demo-dist 생성
```

릴리스 태그·버전·main 포함 여부를 확인한 뒤, 모든 검증을 통과한 버전만 GitHub Actions에서 npm에 provenance와 함께 발행합니다. [배포 절차와 문서 이미지 갱신](https://github.com/uiwwsw/test-mode/blob/main/docs/releasing.md).

<p align="center">
  <sub>Built for repeatable debugging. Shared for easier QA.</sub><br />
  <a href="https://github.com/uiwwsw/test-mode/issues">문제 제보</a> ·
  <a href="https://github.com/uiwwsw/test-mode/releases">릴리스</a> ·
  <a href="https://github.com/uiwwsw/test-mode/blob/main/LICENSE">MIT License</a>
</p>
