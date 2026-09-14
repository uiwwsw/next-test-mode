# 사용 가이드

> **Next.js App Router:** 먼저 `npm install @uiwwsw/next-test-mode`와 `npx @uiwwsw/next-test-mode init`을 실행하세요. 생성된 `/client` 연결이 Console·Draft Mode·자동 새로고침을 처리합니다. 아래 범용 설치 예제를 중복 설치하지 마세요. SSR·SSG·ISR 지원 범위는 [Next 연결 가이드](./server-rendering.md), 기존 패키지 이전은 [migration](./migration.md)을 확인하세요.

설치와 첫 실행은 [README](https://github.com/uiwwsw/next-test-mode#readme)를 참고하세요.

Next Test Mode는 **API 응답을 바꾸는 UI 디버깅 도구**입니다. `setupTestMode()`로 브라우저에 한 번 연결합니다. Next.js는 `npx @uiwwsw/next-test-mode init`, Node는 `withTestMode()`로 서버도 연결하면 직접 입력한 JSON을 SSR에 전달하고 자동 새로고침합니다. [CSR / SSR 지원 범위와 연결 예제](./server-rendering.md).

## 직접 응답 값 넣기

콘솔의 `test.mock(path, data, options?)`는 등록 없이 즉시 응답을 교체하고, `test.patch(path, fields, options?)`는 실제 응답의 필드를 변경합니다.

```js
test.mock('/api/cart', { items: [], total: 0 });
test.patch('/api/cart', { total: 9.99 });
test.mock('/api/login', { message: 'Locked' }, { method: 'POST', status: 403 });
test.overrides(); // [{ path, method, mode, data, ... }]
test.reset('/api/cart', { method: 'GET' });
test.reset(); // 모든 임시 값 제거. 선택된 feature/story는 유지
test.clear(); // 임시 값, feature/story, extension 모두 끄기
```

- 기본 method는 GET이며 대소문자를 정규화합니다. 경로는 `/`로 시작하는 정확한 pathname입니다. query/hash는 제외하고 origin은 구분하지 않습니다. feature의 `/api` 별칭·패턴 매칭은 임시 값에 적용하지 않습니다.
- 같은 경로·method에 다시 입력하면 이전 임시 값을 교체합니다. 임시 값이 선택된 feature/story보다 우선합니다. Patch는 기존 Mock도 우회하고 실제 HTTP 응답에 적용합니다. `reset()`하면 아래에 있던 feature/story가 다시 적용되므로 완전히 실제 API로 돌아가려면 `clear()`를 사용하세요.
- Mock은 JSON 객체·배열·문자열·숫자·boolean·null을 지원합니다. HTTP 상태는 200–599이며 HEAD/204/205/304의 본문은 생략합니다. 함수·순환 참조·undefined·NaN 등은 거부합니다. 입력 실패 시 기존 값은 유지합니다.
- Patch는 객체의 최상위 필드를 덮어씁니다. 중첩 객체나 배열은 통째로 교체합니다. 원래 응답이 객체가 아니면 오류를 내므로 전체 교체가 필요할 때는 Mock을 쓰세요.
- 입력과 조회 결과는 복사됩니다. 기본값은 runtime 메모리 전용입니다. `setupTestMode({ ssr: true })`는 쿠키에 저장해 같은 브라우저의 서버 요청과 공유하고 새로고침 후 복원합니다. 전체 상태는 인코딩 후 3,500바이트까지이며 초과하면 기존 값을 유지합니다. 수동 core API의 명시적인 `cookieHeader` 선택은 기존대로 동작합니다.
- `test.isEnabled()`와 오버레이는 임시 값도 반영합니다. `runtime.active()`는 등록된 feature 선택만 반환하며, 임시 값은 `runtime.overrides()`로 확인합니다.
- `setupTestMode({ refresh })`에 앱의 재요청 함수를 연결할 수 있습니다. SSR 동기화 모드의 기본 refresh는 페이지 새로고침입니다. fetch 밖에 있는 앱 캐시의 무효화는 앱에서 수행합니다.

TypeScript나 서버 어댑터에서는 같은 기능을 `runtime.setMock()`, `runtime.setPatch()`, `runtime.overrides()`, `runtime.resetOverrides()`로 사용합니다. `runtime.patch()`는 기존 응답 처리 API이므로 그대로 유지합니다.

## Mock, Patch, 요청 데이터

```ts
import { defineMock, definePatch, httpResult, passThrough } from '@uiwwsw/next-test-mode';

// HTTP 오류 응답. 오류를 throw하는 것과 달리 fetch 자체는 resolve됩니다.
const locked = defineMock('/api/login', () => httpResult({
  data: { message: 'Account locked' },
  status: 403,
  statusText: 'Forbidden',
}), { caseKey: 'locked', method: 'POST', pages: ['/login'] });

// 타입이 있는 요청과 응답을 정의할 수 있습니다.
const greeting = defineMock<{ name: string }, { greeting: string }>(
  '/api/hello',
  ({ body }) => ({ greeting: `Hello ${body?.name ?? 'world'}` }),
  { method: 'POST' },
);

// 실제 API를 호출한 다음 payload만 변경합니다.
const outOfStock = definePatch<unknown, { stock: number }>(
  '/api/products/:id',
  (response) => ({ ...response, stock: 0 }),
  { pages: ['/products'] },
);

// 특정 요청만 mock, 나머지는 실제 API로 전달합니다.
const search = defineMock('/api/search', ({ params }) =>
  (params as { q?: string }).q === 'empty' ? { results: [] } : passThrough(),
);
```

mock은 `definitions`, patch는 `patchDefinitions`에 등록해야 합니다. 정의는 등록만으로 활성화되지 않으며 story 또는 feature 선택이 필요합니다.

- `body` / `request`: GET·HEAD는 query params, POST·PUT·PATCH·DELETE는 요청 본문입니다.
- `params`: query string을 객체로 변환한 값입니다. 같은 키가 여러 번 있으면 마지막 값이 남습니다. 경로의 `:id`를 추출하는 기능은 아닙니다.
- `headers`, `method`, `path`, `url`: 요청을 검사할 수 있습니다. fetch 어댑터의 `headers`는 `Headers`입니다.
- `requestCount`: 해당 런타임 인스턴스와 feature key의 호출 횟수입니다. 서버의 사용자별 카운터는 아닙니다.
- 반환값은 JSON으로 직렬화합니다. 문자열, Blob, FormData, URLSearchParams, ArrayBuffer, typed array, ReadableStream은 원래 body 형식으로 처리합니다.
- HEAD와 204·205·304에는 본문을 넣지 않습니다. 해당 실제 응답은 patch도 건너뜁니다.
- 취소된 fetch는 reject됩니다. 이미 시작된 사용자 작성 비동기 handler 자체를 강제로 중지하지는 않습니다.

## 경로 매칭

```ts
defineMock('/api/orders/:id', () => ({ id: 1 }));
defineMock('/api/orders/*', () => []);
// 정규식은 첫 인자가 아니라 match 옵션으로 전달합니다.
defineMock('/order-by-id', () => ({ id: 1 }), { match: /^\/api\/orders\/\d+$/ });
defineMock('/api/orders', () => [], {
  match: ({ url, method }) => new URL(url).origin === 'https://api.example.com' && method === 'GET',
});
```

기본 매칭은 origin, query, hash를 제외한 pathname 기준이며 `/api/orders`와 `/orders`를 같은 경로로 취급합니다. 여러 API 호스트를 구분해야 하면 `match`에서 URL도 검사하세요. 정규식·함수 matcher도 등록 key를 활성화해야 동작합니다.

`mapRequest`는 프록시 경로를 매칭용 경로로 바꿀 때 사용합니다. 실제 네트워크 요청 인자는 변경하지 않습니다.

```ts
installMockFetch(runtime, {
  mapRequest: request => ({
    ...request,
    path: request.path.replace(/^\/proxy/, '/api'),
  }),
});
```

## 콘솔 API와 시나리오 규칙

```js
test.search();                  // feature와 story 전체 검색
test.search({ page: '/cart', query: 'empty', active: true });
test.feat.list();
test.feat.add('/api/cart:empty');
test.feat.remove('/api/cart:empty');
test.feat.toggle('/api/cart:empty');
test.feat.set(['/api/cart:empty']);
test.story.list();
test.story.add('cart.empty');
test.story.remove('cart.empty');
test.story.toggle('cart.empty');
test.story.set(['cart.empty']);
test('cart.empty');              // story key이면 선택, 아니면 feature 토글
test.active();
test.clear();
```

story는 고유한 `key`, `title`, `description`, 등록된 `entries`가 필요합니다. 화면 경로 `pages`는 feature에서 상속하거나 story에 명시해야 합니다. 같은 경로·HTTP 메서드의 상충하는 case를 한 story에 넣으면 등록 시 오류가 납니다. feature 선택 시에는 나중에 선택한 case가 기존의 상충하는 case를 교체합니다. 동일 entry의 중복 정의는 메서드 범위가 겹치지 않을 때만 허용합니다.

선택 상태는 localStorage와 cookie에 보관합니다. 저장소가 차단되거나 용량이 부족하면 인스턴스 메모리를 사용합니다. 기본 키는 `test-mode.entries`, 변경 이벤트는 `test-mode:change`입니다. 여러 앱을 한 origin에서 운영한다면 `storageKey`, `cookieKey`, `eventName`을 각각 지정하세요.

## 앱에 적용하기

**기존 호출 코드는 그대로 두고, 테스트 데이터와 시나리오는 앱 소유의 폴더에 모으세요.** 브라우저 fetch를 앱 시작 시 한 번 연결하면 호출부마다 테스트 전용 분기를 넣을 필요가 없습니다. 한 번 확인할 값은 콘솔의 `test.mock()` / `test.patch()`로만 사용하고, 반복할 동작만 파일로 남길 수 있습니다.

스타터를 복사한 뒤 `config.ts`의 `enabled`를 앱 환경에 맞게 설정하세요. 이 폴더는 패키지 내부가 아니라 여러분의 앱 코드이므로 필요한 데이터와 시나리오를 직접 수정하고 코드 리뷰할 수 있습니다.

```bash
cp -R node_modules/@uiwwsw/next-test-mode/templates/test-mode src/test-mode
```

```text
src/test-mode/
  config.ts              # 환경 조건, 저장소 키, 표시 설정
  index.ts               # runtime 생성
  install.ts             # 설치 및 cleanup
  features/auth.ts       # API 동작
  stories/auth.stories.ts # QA 시나리오
```

React/Next.js의 effect에서는 `return installAppTestMode()`로 정리 함수를 반환하세요. Vite의 HMR에서는 `import.meta.hot?.dispose(cleanup)`을 사용하세요. Vue/일반 앱은 클라이언트 bootstrap에서 한 번 설치하고 앱을 해제할 때 cleanup을 호출합니다.

기존 API 모듈은 계속 `fetch('/api/cart')`를 호출합니다. 별도 폴더의 동작을 등록하고 콘솔에서 `test.story('cart.empty')`처럼 선택하면 다음 API 응답부터 바뀝니다. 앱의 재요청 방식은 그대로 사용하거나 `runtime.subscribe()`에 연결하세요. SSR 자동 연결은 서버 시작 지점에 한 번 설치합니다.

## 서버 / axios 어댑터

Next.js는 `init`, 일반 Node는 `withTestMode(handler)`로 시작 지점에 한 번 연결하면 fetch 호출부를 유지합니다. 필요한 조회만 수동 연결할 때는 요청마다 `createServerTestMode({ cookieHeader, ssr: true, ...options })`를 생성하세요. 반환된 `runtime`과 `fetch`는 그 요청 전용입니다. [서버 렌더링 가이드](./server-rendering.md)에서 공유 시나리오·Next.js·캐시 조건을 확인하세요.

서버나 fetch를 사용하지 않는 API 클라이언트는 `runtime.resolve(request)`와 `runtime.applyPatch({ ...request, data })`로 연결할 수 있습니다.

```ts
const request = {
  method: 'GET',
  path: '/api/cart',
  cookieHeader: incomingRequest.headers.get('cookie') ?? '',
};
const mock = await runtime.resolve(request);
if (mock) {
  // 어댑터가 mock.data, status, statusText, headers를 실제 응답으로 변환
} else {
  const upstreamData = await callUpstream();
  const patched = await runtime.applyPatch({ ...request, data: upstreamData });
  const data = patched === null ? upstreamData : patched.data;
}
```

서버에서는 모든 요청에 `cookieHeader`를 명시해야 사용자별 선택 상태가 섞이지 않습니다. 활성화 cookie는 인증 수단이 아닙니다. 앱의 환경·접근 조건으로 test mode 사용 범위를 결정하세요. 기존 `patch()`도 유지하지만 `null` payload와 매칭 실패를 구분하려면 `applyPatch()`를 사용하세요.

상세 동작과 한계: [설계 및 보장 범위](./architecture.md), [Story 설계](./story-test-design.md).
