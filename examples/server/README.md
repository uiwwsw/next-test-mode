# Console → automatic SSR HTML

**[공개 SSR 데모](https://test-mode-tau.vercel.app/api/ssr)**

```bash
npm ci
npm run dev:ssr
```

http://127.0.0.1:4176/auto 에서 Console을 여세요.

```js
test.patch('/api/cart.json', { total: 12.34 });
test.mock('/api/cart.json', { items: [{ name: 'My product', price: 3.14 }], total: 3.14 });
test.clear();
```

자동 새로고침 후 가격은 **서버가 생성한 HTML 원문**에 들어 있습니다. JSON 편집기로도 같은 명령을 실행할 수 있습니다. 다른 브라우저 세션에서는 원래 가격 42가 보입니다.

브라우저 `setupTestMode({ ssr: true })`와 서버 시작 지점의 `withTestMode(handler)`가 전달과 요청 분리를 담당합니다. 서버의 앱 코드는 평범한 `fetch()`를 사용합니다. JSON은 세션 쿠키로 전달되므로 새로고침 뒤에도 유지되며, 같은 브라우저 탭끼리는 공유합니다. `test.clear()`로 해제하세요. 전체 상태는 인코딩 후 3,500바이트까지입니다.

공개 함수 `api/ssr.mjs`는 샘플 `/api/cart.json` 하나만 변경하도록 허용하고 고정된 공개 API를 조회합니다. 로컬 서버는 `127.0.0.1`에만 바인딩합니다.

`/`에는 이전 수동 어댑터 예제를 유지합니다. 여기서는 `test.story('cart.discount'); location.reload()`로 등록된 선택만 전달하고, 직접 JSON은 기본 메모리 전용입니다. 이전 API의 호환성 검사에도 사용합니다.

실제 앱 설치와 Next.js 명령: [서버 렌더링 가이드](../../docs/server-rendering.md).
