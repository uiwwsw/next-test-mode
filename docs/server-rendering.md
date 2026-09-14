# Next Draft Mode와 서버 렌더링

Next Test Mode는 브라우저 Console의 값을 다음 서버 요청에 전달하고, Next의 Draft Mode로 해당 세션의 캐시를 우회합니다. 호출부의 `fetch()`는 그대로 둡니다.

## 최초 설정

```bash
npm install @uiwwsw/next-test-mode
npx @uiwwsw/next-test-mode init
```

App Router의 루트 또는 `src/` 구조를 감지합니다. TS 프로젝트는 `.ts`, JS 프로젝트는 `.js` 파일을 생성합니다. 기존 설정은 덮어쓰지 않습니다. 변경하지 않은 구 버전 생성 파일은 `--migrate`로 이전할 수 있습니다.

생성하는 서버 시작 코드:

```ts
// instrumentation.ts (또는 src/instrumentation.ts)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' &&
      (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NEXT_TEST_MODE === '1')) {
    const { setupNextTestMode } = await import('@uiwwsw/next-test-mode/next');
    setupNextTestMode({ enabled: true });
  }
}
```

브라우저 시작 코드:

```ts
// instrumentation-client.ts
import { setupNextTestModeClient } from '@uiwwsw/next-test-mode/client';

setupNextTestModeClient({
  enabled: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NEXT_TEST_MODE === '1',
});
```

Draft Mode 경로:

```ts
// app/api/next-test-mode/route.ts
import { createDraftModeHandler } from '@uiwwsw/next-test-mode/next';

export const POST = createDraftModeHandler({
  enabled: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NEXT_TEST_MODE === '1',
});
```

Next의 기본 Node 런타임을 사용합니다. Cache Components와 함께 쓰는 앱에는 별도의 `runtime` route 설정을 추가하지 않습니다. QA 배포에서는 `NEXT_PUBLIC_NEXT_TEST_MODE=1`을 **빌드와 실행 환경 모두**에 설정하고 재배포하세요. 기본 production 빌드에서는 브라우저 설치와 서버 연결이 꺼지며 제어 경로는 404를 반환합니다.

## 콘솔에서 SSR이 바뀌는 과정

1. `test.patch('/api/cart', { total: 9.99 })`가 선택 상태와 JSON을 검증하고 세션 쿠키에 기록합니다.
2. 브라우저 연결이 `/api/next-test-mode`에 같은 출처의 POST 요청을 보냅니다.
3. 경로가 Next의 `draftMode().enable()`로 HttpOnly Draft 쿠키를 설정합니다. 이미 켜져 있으면 유지합니다.
4. 응답 확인 후 페이지를 새로고침합니다. Next는 Draft 세션에서 페이지·데이터 캐시를 우회해 다시 렌더합니다.
5. 서버의 기존 `fetch()`가 해당 요청의 테스트 쿠키를 읽어 mock 또는 patch된 값을 반환합니다. HTML에 이 값이 들어갑니다.
6. `test.clear()`가 테스트 상태를 지우고, 이 도구가 연 Draft 세션을 해제한 뒤 새로고침합니다.

Worker는 서버의 fetch를 가로챌 수 없으므로 이 연결을 대체하지 않습니다. Next 서버와 브라우저를 각 시작 지점에 한 번 설치하는 이유입니다. Draft 제어 경로는 데이터 API를 대체하지 않고 세션만 전환합니다.

## 렌더 방식별 범위

| 방식 | 지원하는 동작 | 유지되는 경계 |
| --- | --- | --- |
| CSR | 브라우저 fetch 변경 후 새로고침 | 이전에 받은 앱 상태를 직접 조작하지 않음 |
| SSR / RSC | 요청별 서버 fetch 변경, 실제 HTML 반영 | 전역 fetch를 거치지 않는 데이터 소스는 별도 연결 |
| SSG / `force-static` | Draft 세션에서 정적 페이지를 동적으로 미리보기 | 빌드 파일 자체를 수정하지 않음 |
| ISR | Draft 세션에서 공용 캐시를 우회 | 다른 방문자의 캐시나 재검증 시간을 바꾸지 않음 |
| `generateStaticParams` | 생성된 경로의 페이지 데이터 미리보기 | 빌드 시 매개변수 목록은 콘솔로 재생성하지 않음 |
| `unstable_cache` / `use cache` | Draft의 캐시 우회 중 실행하는 fetch 변경 | 사용자 정의 외부 캐시·직접 DB 호출까지 가로채지 않음 |

App Router의 **Next.js 16.3.5, Node.js 20.9 이상**을 기준으로 검증했습니다. 패키지의 Next peer 범위는 `>=16.3.5 <17`입니다. 그 범위의 모든 향후 버전을 검증했다는 뜻은 아닙니다. **Pages Router, Edge, `output: 'export'`는 자동 연결 대상이 아닙니다.** 정적 export에는 Draft 쿠키를 만들고 페이지를 다시 렌더할 서버가 없습니다.

이미 CMS가 켜 둔 Draft 세션은 `test.clear()`로 종료하지 않습니다. 도구가 처음 연 세션만 소유 표시 쿠키로 추적합니다. CMS와 같은 브라우저에서 테스트 중 CMS가 세션의 소유권을 바꾸는 복잡한 흐름에는 앱이 별도 세션 정책을 정해야 합니다.

## 호환성 브리지

일반 요청에서 `headers()`를 읽으면 SSG가 동적 페이지로 바뀌고, `use cache` 내부에서 읽으면 오류가 발생합니다. 따라서 서버 연결은 우선 공개 `draftMode()`로 활성 여부를 확인하며, 비활성 요청과 빌드 중 fetch는 원래 경로로 보냅니다.

활성 Draft 요청에서는 `src/internal/next-request.ts`의 작은 브리지가 **Next 내부 Draft provider의 `_mutableCookies`를 읽기 전용으로 사용**합니다. 이것으로 `force-static`과 Cache Components의 캐시 범위에서도 요청별 쿠키와 동일한 요청 식별자를 얻습니다. Next 내부 객체를 수정하지 않으며 테스트 쿠키 두 개만 읽습니다.

이 부분은 공개 API만으로 구현된 호환성 보장이 아닙니다. 내부 구조가 달라지면 명시적인 `Unsupported Next.js` 오류를 내며 잘못된 공유 상태로 진행하지 않습니다. Next 업그레이드 시 `npm run test:next`로 production 회귀 테스트를 통과시켜야 합니다. CI는 설치된 tarball과 CLI로 dev, SSR, SSG, ISR, `force-static`, `generateStaticParams`, `unstable_cache`, Cache Components의 `use cache`, 비활성 production 빌드를 검사합니다. 정적 manifest, 서버 HTML, 독립 방문자와 초기화 후 원래 캐시도 검증합니다.

참고: [Next Draft Mode](https://nextjs.org/docs/app/guides/draft-mode), [draftMode API](https://nextjs.org/docs/app/api-reference/functions/draft-mode), [headers API](https://nextjs.org/docs/app/api-reference/functions/headers).

## 클라이언트 연결 상태

```ts
const controller = setupNextTestModeClient({
  enabled: true, // 앱의 개발/QA 환경 조건 사용
  // draftEndpoint: '/api/next-test-mode',
  // refresh: () => router.refresh(), // 앱이 선택하는 갱신; 기본값은 전체 새로고침
  onError: error => console.error(error.message),
});
await controller.ready; // 초기 Draft 상태 확인. 실패하면 reject
await controller.sync(); // 현재 상태와 Draft 세션을 다시 맞추기
// 종료/HMR cleanup: controller.stop()
```

기본 오류 처리는 Console 출력과 `next-test-mode:error` CustomEvent입니다. 이벤트 `detail`은 오류 메시지입니다. 실패 시 자동 새로고침하지 않습니다. 로컬 런타임과 JSON 쿠키 기록은 이미 끝났을 수 있으므로, 비동기 Draft 연결 전체가 원자적이라고 가정하지 마세요. 설정을 바로잡은 후 `sync()`하거나 페이지를 다시 여세요.

연결 요청은 설치 전에 캡처한 원래 fetch를 사용하므로 Console mock에 가로채이지 않습니다. 빠른 연속 입력은 직렬화하고 최신 상태 확인 후 갱신합니다. 재배포로 Next Draft 쿠키가 만료되면 다음 클라이언트 초기화에서 다시 연결합니다.

`refresh: () => router.refresh()`는 서버 컴포넌트를 갱신하지만, 앱의 React Query/SWR 캐시나 클라이언트 state를 모두 초기화하지 않습니다. 기본 전체 새로고침은 이러한 앱별 연결을 요구하지 않습니다.

## 접근 제어와 상태

제어 경로는 활성 환경, 동일 출처 POST, `Origin`, 커스텀 헤더, JSON 형식과 본문 크기를 검사합니다. 외부에 노출하는 QA 앱은 앱의 기존 로그인 정책을 연결할 수 있습니다.

```ts
export const POST = createDraftModeHandler({
  enabled: process.env.NEXT_PUBLIC_NEXT_TEST_MODE === '1',
  authorize: async request => canUsePreview(request), // 앱의 기존 권한 검사
});
```

제어 경로와 `authorize` 안의 fetch는 테스트 가로채기에서 제외합니다. 기존 Draft 쿠키를 가진 요청의 서버 미리보기도 앱 자체 인증으로 보호해야 합니다. 테스트 쿠키는 인증 수단이 아닙니다.

브라우저·서버·Draft 경로의 `cookieKey`를 동일하게 유지하세요. 기본 선택 쿠키는 `test-mode.entries`, JSON은 `test-mode.entries.ssr`, 소유 표시 쿠키는 `test-mode.entries.draft-owner`입니다. 선택과 JSON은 합쳐서 **3,500 URL 인코딩 바이트**로 제한합니다. 쿠키는 같은 브라우저의 탭이 공유합니다. 민감한 실제 데이터를 테스트 JSON에 담지 말고 앱 소유의 샘플 시나리오를 사용하세요.

## 일반 Node와 수동 어댑터

Next 밖의 Node 서버에서는 기존 API를 유지합니다.

```ts
import { createServer } from 'node:http';
import { withTestMode } from '@uiwwsw/next-test-mode/node';
import { app } from './app.js';

createServer(withTestMode(app, { enabled: true })).listen(3000);
```

브라우저에는 개발 환경에서 `setupTestMode({ enabled: true, ssr: true })`를 연결합니다. `withTestMode`는 AsyncLocalStorage로 요청별 상태를 분리하며, 들어온 인증 쿠키를 외부 fetch에 자동 전달하지 않습니다. 이 일반 Node 연결에는 Next Draft Mode가 없습니다.

서버 코드를 직접 연결하려면 `createServerTestMode({ cookieHeader, ssr: true, ...catalog })`가 반환하는 `fetch`와 `runtime`을 요청 안에서 사용하세요. 가변 런타임을 사용자 간에 공유하지 마세요.
