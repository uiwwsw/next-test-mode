<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/next-test-mode/v0.6.0/docs/assets/hero.png" width="100%" alt="Next Test Mode — Same API calls. Your test data. CSR, SSR, ISR and SSG from one Console." />
</p>
<p align="center">
  <strong>호출 코드는 그대로. 테스트 데이터는 따로. 확인은 콘솔에서.</strong><br />
  Keep your fetch calls. Keep scenarios separate. Preview from DevTools.
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@uiwwsw/next-test-mode"><img src="https://img.shields.io/npm/v/@uiwwsw/next-test-mode?style=flat-square&amp;color=173c36" alt="npm version" /></a>
  <a href="https://github.com/uiwwsw/next-test-mode/actions/workflows/ci.yml"><img src="https://github.com/uiwwsw/next-test-mode/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Next.js-App_Router-173c36?style=flat-square" alt="Next.js App Router" />
  <a href="https://github.com/uiwwsw/next-test-mode/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-62796f?style=flat-square" alt="MIT license" /></a>
</p>
<p align="center">
  <a href="https://test-mode-tau.vercel.app/">Live demo ↗</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#rendering-support">지원 범위</a> ·
  <a href="https://github.com/uiwwsw/next-test-mode/blob/main/docs/guide.md">API 가이드</a> ·
  <a href="https://github.com/uiwwsw/next-test-mode/blob/main/docs/migration.md">기존 패키지에서 이전</a>
</p>

**Next Test Mode는 Next.js 앱의 API 응답을 콘솔에서 바꿔 화면 상태를 재현하는 개발·QA 도구입니다.** 빈 목록, 다른 가격, 서버 오류를 실제 화면에서 확인하세요. CSR은 브라우저 응답을 바꾸고, SSR·ISR·SSG는 **Next Draft Mode를 자동으로 연결해 해당 브라우저 세션에서 새로 렌더**합니다.

> `@uiwwsw/test-mode`의 새 이름은 **`@uiwwsw/next-test-mode`**입니다. [이전 가이드](https://github.com/uiwwsw/next-test-mode/blob/main/docs/migration.md).

## Why Next Test Mode

| 호출 코드는 그대로 | 테스트 데이터는 따로 | 확인은 콘솔에서 |
| :--- | :--- | :--- |
| 최초 설정 후 기존 `fetch()`를 계속 사용합니다. 각 API 호출부에 테스트 함수나 조건 분기를 추가할 필요가 없습니다. | 한 번 확인할 값은 콘솔에서 끝내고, 반복할 시나리오는 `src/test-mode/` 같은 전용 폴더에서 수정하고 공유합니다. | `test.patch()` 한 줄로 가격을 바꾸고 `test.mock()`으로 빈 목록·오류를 넣습니다. `test.clear()`로 원래 응답에 돌아갑니다. |

```ts
// 앱의 API 호출: 테스트를 켜도 이 코드는 그대로입니다.
const response = await fetch('https://api.example.com/api/cart');
const cart = await response.json();
```

```js
// DevTools → Console: 자신의 API pathname을 사용하세요.
test.patch('/api/cart', { total: 9.99 });
// Draft Mode 연결 → 자동 새로고침 → 바뀐 데이터로 화면 확인
test.clear();
```

## Quick start

Next.js **16 App Router / Node.js 20.9+** 프로젝트 루트에서:

```bash
npm install @uiwwsw/next-test-mode
npx @uiwwsw/next-test-mode init
npm run dev
```

설치 명령이 `app/` 또는 `src/app/`, JavaScript/TypeScript를 감지해 **세 파일**을 생성합니다.

| 파일 | 하는 일 |
| :--- | :--- |
| `instrumentation.ts` 또는 `.js` | 서버의 기존 fetch에 요청별 테스트 데이터 연결 |
| `instrumentation-client.ts` 또는 `.js` | Console·브라우저 fetch·Draft Mode·자동 새로고침 연결 |
| `app/api/next-test-mode/route.ts` 또는 `.js` | Next.js의 Draft Mode 쿠키를 켜고 끄는 POST 경로 |

페이지, API 함수, Next 설정 파일은 수정하지 않습니다. 기존 사용자 파일이 있으면 변경 없이 합칠 코드를 출력합니다. 워커나 별도 서버는 필요하지 않습니다.

기본 설정은 개발 환경에서만 켜집니다. **QA 배포에서도 사용하려면 `NEXT_PUBLIC_NEXT_TEST_MODE=1`을 빌드와 실행 환경에 설정**하세요. [생성 코드와 접근 제어](https://github.com/uiwwsw/next-test-mode/blob/main/docs/server-rendering.md).

## See it in action

**[CSR](https://test-mode-tau.vercel.app/csr) · [SSR](https://test-mode-tau.vercel.app/ssr) · [ISR](https://test-mode-tau.vercel.app/isr) · [SSG](https://test-mode-tau.vercel.app/ssg)** — 같은 장바구니를 네 가지 렌더 방식으로 직접 비교하세요.

<p align="center">
  <img src="https://raw.githubusercontent.com/uiwwsw/next-test-mode/v0.6.0/docs/assets/scenarios.gif" width="960" alt="실제 Next.js 데모: SSG 원래 가격, 콘솔 patch, SSR에서도 같은 값, HTTP 503, 원래 캐시 응답 복귀." />
</p>

데모의 DevTools Console에 입력하거나, 화면의 JSON 편집기에서 원하는 값을 적용하세요.

```js
test.patch('/api/cart.json', { total: 9.99 });
test.mock('/api/cart.json', { items: [], total: 0 });
test.mock('/api/cart.json', { message: 'Try again' }, { status: 503 });
test.overrides();               // 직접 입력한 값 확인
test.reset('/api/cart.json');   // 이 경로의 직접 입력만 제거
test.clear();                  // 모든 입력과 시나리오 해제
```

SSR·ISR·SSG 탭에서는 **서버가 보낸 HTML 자체에 변경된 값이 들어갑니다.** 다른 브라우저 세션의 원래 응답은 유지됩니다. JSON 상태는 같은 브라우저의 탭이 공유하며 새로고침 후에도 유지됩니다. 테스트가 끝나면 `test.clear()`를 사용하세요.

## Rendering support

| 렌더 방식 | Console 변경 후 동작 |
| :--- | :--- |
| **CSR** | 브라우저 fetch 응답 교체 또는 patch, 페이지 자동 새로고침 |
| **SSR / Server Components** | 해당 요청의 서버 fetch에 값 적용 → 새 HTML |
| **SSG / `force-static`** | Draft Mode에서 정적 결과를 우회해 세션별 동적 미리보기 |
| **ISR** | Draft Mode에서 기존 페이지·데이터 캐시를 우회해 미리보기. 공용 ISR 결과는 변경하지 않음 |
| **`unstable_cache` / `use cache`** | Draft Mode의 캐시 우회 경로에서 실행되는 fetch에 적용 |
| **`generateStaticParams`** | 빌드에서 생성한 경로의 페이지 미리보기 지원. 콘솔로 빌드 시 경로 목록을 다시 만들지는 않음 |

`test.clear()`는 이 도구가 연 Draft Mode를 해제해 원래 캐시 경로로 복귀합니다. **SSG 파일을 다시 쓰거나 모든 방문자의 ISR 캐시를 갱신하는 기능은 아닙니다.** 이미 켜진 CMS Draft 세션은 해제하지 않습니다.

실제 production 빌드로 검증한 기준은 **Next.js 16.3.5 / App Router / Node 런타임**입니다. Pages Router, Edge, `output: 'export'`는 자동 연결 대상이 아닙니다. 직접 DB 조회, XHR·WebSocket, fetch를 거치지 않는 외부 캐시에도 별도 어댑터가 필요합니다. 캐시 내부의 요청 쿠키를 읽는 작은 Next 내부 브리지가 있어, Next 버전 업그레이드 시 production 회귀 테스트가 필요합니다. [동작 원리와 호환성](https://github.com/uiwwsw/next-test-mode/blob/main/docs/server-rendering.md).

## Try once, or keep it in a folder

**잠깐 확인할 테스트는 콘솔에서 끝내세요.** `test.mock()` / `test.patch()` → 화면 확인 → `test.clear()`. 임시 실험 때문에 파일이나 API 호출 코드를 고칠 필요가 없습니다.

**반복할 테스트는 별도 폴더에서 관리하세요.**

```text
src/
  api/cart.ts                # 기존 API 호출
  test-mode/
    catalog.ts               # 브라우저·서버에서 공유할 등록 목록
    features/cart.ts         # API별 mock / patch와 데이터
    stories/cart.stories.ts  # 여러 API를 묶은 화면 시나리오
```

```ts
// src/test-mode/catalog.ts
import { defineMock } from '@uiwwsw/next-test-mode/core';

export const catalog = {
  definitions: [
    defineMock('/api/cart', () => ({ items: [], total: 0 }), {
      caseKey: 'empty',
      pages: ['/cart'],
    }),
  ],
};
```

이 목록을 생성된 두 instrumentation의 `setupNextTestMode({ ...catalog, enabled: true })`와 `setupNextTestModeClient({ ...catalog, enabled: ... })`에 전달하면 Console에서 `test.feat.add('/api/cart:empty')`로 선택할 수 있습니다. 여러 API를 묶은 story도 `test.story('cart.empty')`로 활성화합니다. 서버에서도 쓸 정의에는 브라우저 전용 코드를 넣지 마세요. [스타터와 연결 예시](https://github.com/uiwwsw/next-test-mode/tree/main/templates/test-mode).

## Details that matter

- 직접 입력은 **GET + 정확한 pathname**에 매칭합니다. 다른 메서드는 `{ method: 'POST' }` 옵션으로 지정합니다. 여러 호스트의 같은 pathname은 함께 매칭됩니다.
- `patch`는 실제 응답의 최상위 필드를 덮어씁니다. 중첩 객체와 배열은 통째로 교체되며, 실제 네트워크 요청은 실행됩니다. `mock`은 매칭된 요청의 응답을 직접 만듭니다.
- 쿠키로 전달하는 전체 선택·JSON 상태는 URL 인코딩 후 **3,500바이트**까지입니다. 큰 응답은 작은 patch 또는 파일에 정의한 시나리오로 관리하세요. 브라우저 세션 복원 설정에 따라 쿠키도 복원될 수 있습니다.
- Draft 연결 실패는 Console 오류와 `next-test-mode:error` 이벤트로 알리며 자동 새로고침하지 않습니다. `ready` / `sync()`로 성공 여부를 기다릴 수 있습니다. [클라이언트 API](https://github.com/uiwwsw/next-test-mode/blob/main/docs/server-rendering.md#클라이언트-연결-상태).
- 테스트 쿠키는 로그인 자격이 아닙니다. QA 환경의 접근 권한은 앱이 관리합니다. 들어온 인증 쿠키를 외부 API에 자동 전달하지 않습니다.
- 이 패키지는 **화면 상태를 재현하는 도구**입니다. 자동 assertion·합격 판정은 Playwright나 Vitest가 담당합니다.

## Framework-independent APIs

기존 범용 core·browser·Node API도 새 이름 아래 유지합니다. Next.js는 선택적 peer이며, 범용 API는 Next 없이 설치할 수 있습니다. 외부 런타임 의존성은 없습니다.

```ts
import { setupTestMode } from '@uiwwsw/next-test-mode';
import { createTestMode, defineMock } from '@uiwwsw/next-test-mode/core';
import { createMockFetch } from '@uiwwsw/next-test-mode/fetch';
import { withTestMode } from '@uiwwsw/next-test-mode/node';
import { createServerTestMode } from '@uiwwsw/next-test-mode/server';
```

일반 브라우저 앱은 `setupTestMode({ enabled: true, refresh: () => refetch() })`를 시작 시 한 번 연결합니다. 이 범용 설정의 직접 JSON은 기본적으로 메모리에만 남습니다. Next에서는 Draft Mode를 연결하는 `init` 설정을 사용하세요. [전체 API 가이드](https://github.com/uiwwsw/next-test-mode/blob/main/docs/guide.md).

## Develop & release

```bash
npm ci
npx playwright install chromium
npm run ci             # 타입, 런타임, tarball 설치와 소비자 타입 검사
npm run test:browser   # 브라우저 Console·fetch·Draft 연결
npm run test:next      # 실제 Next dev/production/Cache Components/비활성 배포
npm run test:demo      # 네 렌더 모드와 모바일 JSON 편집기
npm run dev:demo       # 실제 Next.js 데모
npm run build:demo     # Vercel 배포용 Next 빌드
```

검증된 main의 릴리스 태그를 GitHub Release로 발행하면, CI를 다시 통과한 패키지가 `NPM_TOKEN`을 사용하는 Actions에서 npm provenance와 함께 배포됩니다. [배포 절차](https://github.com/uiwwsw/next-test-mode/blob/main/docs/releasing.md) · [설계](https://github.com/uiwwsw/next-test-mode/blob/main/docs/architecture.md) · [Changelog](https://github.com/uiwwsw/next-test-mode/blob/main/CHANGELOG.md).
