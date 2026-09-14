# CSR와 SSR에서 응답 바꾸기

test mode의 기본 기능은 **API 응답을 바꿔 UI 상태를 재현**하는 것입니다. CSR은 브라우저 fetch에, SSR은 서버의 데이터 조회에 연결합니다. Next.js 앱에 브라우저 설치 코드만 추가했다고 Server Component의 조회까지 바뀌지는 않습니다.

## 브라우저와 서버 사이에 전달되는 것

| 제어 방식 | 브라우저 | 서버 |
| --- | --- | --- |
| `test.mock()` / `test.patch()` | 해당 런타임 메모리에 임시 JSON 저장 | 자동 전달되지 않음 |
| `test.story()` / `test.feat.add()` | 등록된 feature key 선택, localStorage와 쿠키에 기록 | 같은 카탈로그와 쿠키 키로 요청받으면 등록된 동작 선택 |
| `runtime.setMock()` / `runtime.setPatch()` | 해당 런타임에 적용 | 요청 전용 서버 런타임에서 호출하면 그 요청에만 적용 |

시나리오 선택 쿠키에는 feature key만 들어갑니다. 실행할 handler는 앱이 서버에 등록한 코드입니다. 브라우저에서 입력한 임의 JSON·함수·코드를 서버에서 실행하는 통로는 제공하지 않습니다.

CSR의 화면 갱신은 앱의 refetch/invalidate 동작에 연결하세요. SSR은 선택 이후 새 HTML/RSC 요청이 필요합니다. `test.clear()`로 선택을 해제해도 이미 그려진 서버 화면은 새로운 서버 렌더를 받아야 돌아옵니다.

## 요청마다 만들기

```ts
import { createServerTestMode } from '@uiwwsw/test-mode/server';
import { catalog } from './catalog';

export async function loadCart(request: Request) {
  const { runtime, fetch: serverFetch } = createServerTestMode({
    ...catalog,
    enabled: process.env.NODE_ENV === 'development',
    cookieHeader: request.headers.get('cookie'), // 없으면 null
    originalFetch: fetch, // 선택 사항: 프레임워크가 제공하는 fetch 사용
  });

  // 필요하면 서버 코드가 이 요청에만 적용할 값을 지정할 수 있습니다.
  // runtime.setPatch('/api/cart', { total: 9.99 });
  const response = await serverFetch('https://api.example.com/api/cart', {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Cart API returned ${response.status}`);
  return response.json();
}
```

- `createServerTestMode()`를 요청 handler/loader 안에서 호출하세요. 반환값을 모듈 전역이나 여러 사용자가 공유하는 캐시에 저장하지 마세요.
- 들어온 쿠키에서 유효한 등록 key만 읽어 새로운 런타임에 복사합니다. 쿠키가 없거나 손상되었으면 선택은 비어 있습니다. 선택·임시 값·`requestCount`가 다른 요청과 분리됩니다. 직접 작성한 handler가 캡처한 전역 변수까지 격리하지는 않습니다.
- 반환된 `fetch`를 사용한 조회만 변경됩니다. 전역 `fetch`, DB 클라이언트, 프레임워크의 렌더러를 교체하지 않습니다.
- 외부 API에 보내는 `Cookie` 헤더는 원래대로 전달하지만, 그 쿠키로 테스트 시나리오를 재선택하지 않습니다. 들어온 페이지 요청의 쿠키를 외부 API로 복사하지 않습니다. 필요한 인증 정보는 앱이 직접 정해서 전달하세요.
- 기본 경로 규칙은 core와 같습니다. 여러 API origin에 같은 pathname이 있으면 정의의 `match`로 origin을 구분하세요.
- 서버의 `enabled` 조건이 실제 활성화 여부를 결정합니다. 쿠키가 이를 우회하지 않습니다. 개발·QA 환경 조건은 브라우저와 서버 양쪽에서 정하세요.
- 브라우저에서 이 서버 factory를 호출하면 오류를 냅니다. 브라우저에서는 `createTestMode()`를 사용하세요.

저수준 `createMockFetch(runtime, { cookieHeader: false })`는 outgoing Cookie를 선택 소스로 사용하지 않고 런타임 상태만 사용합니다. 이 설정은 요청 전용 런타임을 직접 구성할 때 유용합니다. 문자열은 그 쿠키로 선택을 고정하며, 기존 `null`/생략 동작은 유지합니다.

## 공유 카탈로그

```ts
// catalog.ts — 브라우저와 서버에 모두 포함되는 앱 소유 코드
import { definePatch, defineStory } from '@uiwwsw/test-mode/core';

export const catalog = {
  storageKey: 'my-app.qa', // 기본 cookieKey도 이 값. 양쪽에서 일치해야 합니다.
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

브라우저에는 `createTestMode({ ...catalog, enabled: true })`와 콘솔/오버레이를 앱의 개발 환경에서 설치합니다. 서버에도 같은 catalog를 전달합니다. 공유 파일에는 서버 비밀값이나 브라우저에서만 존재하는 DOM 코드를 넣지 마세요.

```js
// Console — 서버에도 등록된 동작을 선택하고 서버 렌더 다시 요청
test.story('cart.discount');
location.reload();
```

쿠키는 해당 도메인·경로와 브라우저의 쿠키 정책에 따라 전송됩니다. 다른 도메인의 SSR 서버로 자동 공유되지는 않습니다. 쿠키 저장이 차단된 환경에서는 CSR 메모리 fallback은 가능해도 이 SSR 연결은 동작하지 않습니다. 같은 origin의 탭은 시나리오 선택 쿠키를 공유합니다. 임시 JSON과는 수명이 다릅니다.

## Next.js App Router 연결 예

```tsx
// app/cart/page.tsx — Server Component
import { cookies } from 'next/headers';
import { createServerTestMode } from '@uiwwsw/test-mode/server';
import { catalog } from '@/test-mode/catalog';

export default async function CartPage() {
  const { fetch: serverFetch } = createServerTestMode({
    ...catalog,
    enabled: process.env.NODE_ENV === 'development',
    cookieHeader: (await cookies()).toString(),
    originalFetch: fetch,
  });
  const response = await serverFetch('https://api.example.com/api/cart', {
    cache: 'no-store',
  });
  if (!response.ok) return <p>Cart could not be loaded.</p>;
  const cart = await response.json();
  return <p>Total: {cart.total}</p>;
}
```

콘솔 설치는 별도 Client Component에서 수행합니다. 서버 조회는 위의 `serverFetch`를 사용해야 합니다. `cookies()`는 요청 시점의 값을 읽고, 위 예제의 `cache: 'no-store'`는 실제 upstream 조회를 요청마다 수행하도록 지정합니다. 앱이나 CDN이 최종 HTML을 별도로 공유 캐시하면 테스트 값이 섞일 수 있으므로 해당 개발·QA 경로는 공유 캐시에서 제외하세요. `use cache` 등으로 런타임이나 결과를 요청 밖에 보관하지 마세요.

이미 캐시된 데이터를 건너뛰는 경로나 빌드 시 생성된 페이지에는 어댑터가 호출되지 않습니다. 새 서버 렌더 요청만으로 모든 프레임워크 캐시가 무효화되는 것은 아닙니다. 브라우저와 서버의 첫 데이터가 다르면 hydration 불일치가 생길 수 있으므로 서버 결과를 초기 클라이언트 상태에 전달하는 앱의 기존 방식을 따르세요.

이 스니펫은 연결 패턴입니다. 저장소의 실행 검증은 Node HTTP SSR 예제와 Chromium에서 수행하며 모든 Next.js 버전·캐시 설정을 인증하는 것은 아닙니다. API 근거: [Server / Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [cookies](https://nextjs.org/docs/app/api-reference/functions/cookies), [server fetch](https://nextjs.org/docs/app/api-reference/functions/fetch).

## 바로 실행해서 확인

```bash
npm ci
npm run dev:ssr
# http://127.0.0.1:4176
```

[SSR 예제](../examples/server)는 실제 HTTP 응답을 서버에서 조회한 뒤 HTML에 가격을 넣습니다. Console에서 `test.story('cart.discount'); location.reload()`를 실행하면 원본 HTML도 9.99가 됩니다. 별도 브라우저 세션의 가격은 42로 유지됩니다. `test.patch('/api/cart', { total: 123 })`로 직접 넣은 값은 클라이언트 fetch에만 적용되고 SSR HTML에는 전달되지 않습니다.
