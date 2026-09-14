# 콘솔에서 CSR와 SSR을 함께 바꾸기

**최초 연결만 하고 기존 `fetch()` 호출 코드는 그대로 둡니다.** Console에서 `test.patch()` / `test.mock()`을 입력하면 브라우저 응답과 새 서버 렌더에 같은 값이 적용됩니다. 반복해서 쓸 동작은 앱 소유의 `test-mode/` 폴더에 등록할 수 있습니다.

**[공개 SSR 데모 열기 →](https://test-mode-tau.vercel.app/api/ssr)**

```js
test.patch('/api/cart.json', { total: 12.34 }); // 서버 HTML의 가격까지 자동 변경
test.clear(); // 원래 값으로 복귀
```

## Next.js: 최초 설정 한 번

```bash
npm install @uiwwsw/test-mode
npx @uiwwsw/test-mode init --next
npm run dev
```

프로젝트 루트에서 실행합니다. `src/app` / `src/pages` 구조와 `tsconfig.json` 유무에 맞춰 파일을 생성합니다. 모노레포는 `--dir apps/web`처럼 앱 경로를 지정하세요. 기존 instrumentation 파일은 덮어쓰지 않고 합칠 코드를 출력합니다. 설치 후 개발 서버를 재시작하세요.

생성되는 내용은 다음 두 파일뿐입니다. 페이지·컴포넌트·API 호출부는 수정하지 않습니다.

```ts
// instrumentation.ts (또는 .js / src/instrumentation.ts)
export async function register() {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupNextTestMode } = await import('@uiwwsw/test-mode/next');
    setupNextTestMode();
  }
}
```

```ts
// instrumentation-client.ts (서버 instrumentation과 같은 디렉터리)
import { setupTestMode } from '@uiwwsw/test-mode';

setupTestMode({ enabled: process.env.NODE_ENV === 'development', ssr: true });
```

Console에서 **실제 서버가 호출하는 API의 pathname**을 입력합니다.

```js
test.patch('/api/cart', { total: 9.99 });
test.mock('/api/cart', { items: [], total: 0 });
test.clear();
```

서버가 `https://api.example.com/api/cart`를 호출하면 `/api/cart`가 대상입니다. Next 페이지 주소가 아닙니다. 초기화 이후 실행하는 전역 `fetch`가 대상이며, 앱에서 이미 별도 변수에 저장한 fetch나 독립 HTTP 클라이언트까지 바꾸지는 않습니다.

지원 범위는 **Next.js 16의 Node 런타임**입니다. CI에서 실제 Next.js 16.3.5 앱에 npm tarball과 CLI를 설치하고, 수정하지 않은 Server Component의 fetch·서버 HTML·독립 방문자·`force-cache` 응답 분리·hydration 오류 여부를 Chromium으로 검증합니다. Next의 공식 [서버 instrumentation](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation)과 [브라우저 instrumentation](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client)을 사용합니다.

## 일반 Node / Express / Vercel

서버의 request handler를 시작 지점에서 한 번 감쌉니다. Express의 `app`도 Node request handler입니다.

```ts
import { createServer } from 'node:http';
import { withTestMode } from '@uiwwsw/test-mode/node';
import { app } from './app.js';

const handler = withTestMode(app);
const server = createServer(handler).listen(3000);
server.on('close', () => handler.dispose());
```

Vercel의 Node `(request, response)` 함수는 `export default withTestMode(handler)`로 연결합니다. Web `Request`/`Response` 형식이나 Edge handler용 래퍼는 아닙니다. 앱의 기존 전역 `fetch()`가 해당 요청 전용 런타임을 사용합니다.

브라우저에는 한 번 설치합니다.

```ts
import { setupTestMode } from '@uiwwsw/test-mode';

const { runtime, stop } = setupTestMode({
  enabled: import.meta.env.DEV, // 앱의 개발 환경 조건
  ssr: true,
});
// 앱 종료/HMR 정리: stop()
```

서버 기본값은 `NODE_ENV=development` 또는 `test`일 때만 활성화입니다. `enabled: request => ...`로 요청별 조건을 정할 수도 있습니다. 브라우저와 서버 양쪽의 환경 조건이 켜져야 합니다. 쿠키로 서버의 `enabled` 조건을 우회할 수 없습니다.

`allowedPaths: ['/api/cart']`를 서버 옵션에 넣으면 정확히 그 pathname만 변경합니다. 공개 데모는 샘플 API 하나만 허용합니다. 경로는 기본적으로 origin을 구분하지 않습니다.

## 자동 전달과 새로고침

브라우저의 Service Worker만으로 서버 프로세스의 fetch를 가로챌 수는 없습니다. 이 패키지는 워커·별도 동기화 API·서버 저장소 없이 브라우저와 서버의 시작 지점을 연결하고 **작은 JSON 상태를 세션 쿠키로 전달**합니다.

| 항목 | 동작 |
| --- | --- |
| 기본 브라우저 모드 | 직접 입력한 JSON은 메모리 전용. 새로고침하면 사라짐 |
| `ssr: true` | JSON과 선택한 feature key를 쿠키에 기록, 새 서버 요청에 적용, 브라우저에서도 복원 |
| 기본 갱신 | 변경을 50ms 동안 모아 한 번 `location.reload()` 실행 |
| 앱의 갱신 사용 | `refresh: () => router.refresh()` 또는 앱의 invalidate/refetch 함수로 대체 |
| 해제 | `test.reset(path)`는 해당 직접 입력 제거, `test.clear()`는 모든 입력·선택 해제 |
| 수명 | 새로고침 후에도 유지. 같은 브라우저의 탭이 쿠키 공유. 다른 세션은 분리 |
| 크기 | 전체 상태를 URL 인코딩한 뒤 최대 **3,500바이트**. 초과하면 기존 상태를 보존하고 오류 |

동기화 쿠키는 기본 `test-mode.entries.ssr`, `Path=/`, `SameSite=Lax`이며 HTTPS에서는 Secure를 설정합니다. 브라우저·서버의 `cookieKey`가 같아야 합니다. 같은 origin의 서버 요청에 전달되며 다른 도메인으로 자동 동기화하지 않습니다. 브라우저 정책상 쿠키를 쓸 수 없으면 SSR 설치가 오류를 내고 fetch/콘솔 설치를 시작하지 않습니다.

값을 전달하므로 새로고침으로 지우지 않습니다. 테스트를 끝낼 때 `test.clear()`를 사용하세요. 다른 탭에서 바꾼 값은 새 요청/새로고침에 반영되며, 모든 탭을 실시간으로 새로고침하는 기능은 아닙니다. 쿠키에는 코드나 함수를 저장하지 않고 유효한 JSON만 허용합니다. 큰 응답은 필요한 필드만 `patch`하거나 파일에 정의해 key만 전달하세요.

## 요청 분리와 캐시

Node 래퍼는 AsyncLocalStorage로 요청별 runtime을 분리합니다. Next 어댑터는 요청 headers 객체를 기준으로 상태를 분리합니다. 선택·직접 입력·호출 횟수가 다른 요청에 섞이지 않습니다. 들어온 인증 쿠키는 외부 API로 자동 복사하지 않습니다. 직접 작성한 handler가 캡처한 전역 변수는 앱이 관리합니다.

Next가 시작 중 fetch를 다시 설치해도 현재 fetch를 감싸며, 테스트 응답 변경은 **Next fetch 캐시 바깥**에서 적용합니다. Mock은 원래 fetch를 호출하지 않습니다. Patch는 Next가 반환한 실제 응답에만 변경을 적용합니다. 설치는 Node instrumentation에서 한 번 수행하세요. 이미 다른 라이브러리가 fetch 접근자 자체를 설치한 경우 명확한 오류를 냅니다.

활성 Next 어댑터는 요청 쿠키를 읽으므로 연결한 fetch가 실행되는 렌더는 요청 문맥을 필요로 합니다. 기본 생성 설정은 개발 환경 전용입니다. `use cache`, 별도 메모이제이션, 정적 생성, CDN에 저장된 HTML처럼 **fetch까지 도달하지 않는 결과**는 바꾸지 않습니다. 공유 QA 배포를 구성한다면 해당 결과 캐시를 앱에서 제외하세요. Node 래퍼는 테스트가 선택된 요청에 `Cache-Control: private, no-store`를 설정합니다. 이후 앱이 덮어쓰는 헤더까지 강제하지는 않습니다.

DB 직접 조회·XHR·WebSocket·Edge 런타임은 자동 연결 대상이 아닙니다. 다른 Node 프레임워크는 현재 요청의 고유 객체와 쿠키를 제공하는 `installServerTestMode({ getRequest })`로 연결하거나 아래 수동 어댑터를 사용할 수 있습니다.

## 파일에 공유 시나리오 남기기

```ts
// src/test-mode/catalog.ts — 앱 소유의 테스트 폴더
import { definePatch, defineStory } from '@uiwwsw/test-mode/core';

export const catalog = {
  patchDefinitions: [
    definePatch<unknown, { total: number }>('/api/cart',
      data => ({ ...data, total: 9.99 }),
      { caseKey: 'discount', pages: ['/cart'] }),
  ],
  stories: [defineStory({
    key: 'cart.discount', title: 'Discount', description: 'Discounted total',
    entries: ['/api/cart:discount'], pages: ['/cart'],
  })],
};
```

브라우저 `setupTestMode({ ...catalog, enabled: ..., ssr: true })`, 서버 `setupNextTestMode(catalog)` 또는 `withTestMode(app, catalog)`에 같은 정의를 전달합니다. 이후 `test.story('cart.discount')`로 선택합니다. 서버·브라우저가 함께 import하므로 이 카탈로그에는 서버 비밀값이나 DOM 전용 코드를 넣지 마세요.

## 필요한 조회만 수동 연결하기

기존 `createServerTestMode()`는 전역 fetch를 변경하지 않는 요청별 factory로 유지합니다.

```ts
import { createServerTestMode } from '@uiwwsw/test-mode/server';

export async function loadCart(request: Request) {
  const { fetch: serverFetch } = createServerTestMode({
    enabled: process.env.NODE_ENV === 'development',
    cookieHeader: request.headers.get('cookie'),
    ssr: true, // 직접 JSON 전달을 허용. 생략하면 기존 등록 시나리오 선택만 읽음
  });
  return (await serverFetch('https://api.example.com/api/cart')).json();
}
```

요청 handler/loader 안에서 만들고 결과를 여러 요청이 공유하는 전역에 저장하지 마세요. 서버 코드에서 `runtime.setMock()` / `runtime.setPatch()`를 호출할 수도 있습니다. 이 factory는 브라우저 사용을 거부합니다. outgoing Cookie는 시나리오를 재선택하지 않습니다. 저수준 `createMockFetch(runtime, { cookieHeader: false })`도 이 요청 전용 동작을 제공합니다.

## 로컬 데모 실행

```bash
npm ci
npm run dev:ssr
# http://127.0.0.1:4176/auto
```

서버가 원래 API를 fetch하고 JSON을 HTML에 넣습니다. 콘솔에서 직접 값을 바꾸면 HTML 원문도 바뀝니다. `/`에는 이전의 수동 시나리오 선택 예제를 남겨 호환성을 검사합니다.
