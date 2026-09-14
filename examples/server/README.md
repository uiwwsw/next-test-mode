# Console → cookie → SSR HTML

```bash
npm ci
npm run dev:ssr
```

http://127.0.0.1:4176 에서 개발자 도구의 Console을 여세요.

```js
test.story('cart.discount'); location.reload(); // 서버 HTML의 total: 9.99
test.story('cart.empty'); location.reload();    // 서버 HTML의 total: 0
test.clear(); location.reload();               // 실제 API의 total: 42
```

페이지의 가격은 서버가 생성한 HTML에 들어 있습니다. JavaScript를 실행한 뒤 가격을 바꾸는 예제가 아닙니다. 브라우저와 서버는 `scenarios.mjs`의 카탈로그를 공유하고, 선택한 key만 쿠키로 전달합니다. 서버 런타임은 요청마다 새로 생성합니다. 다른 브라우저 프로필/시크릿 세션에서는 원래 가격이 보입니다. 같은 origin의 탭끼리는 시나리오 선택 쿠키를 공유합니다.

```js
test.patch('/api/cart', { total: 123 });
await (await fetch('/api/cart')).json(); // 브라우저: 123
location.reload(); // 임시 JSON은 사라짐. SSR은 등록된 시나리오 선택만 사용
```

이 예제는 로컬 개발용으로 `127.0.0.1`에만 바인딩하고 test mode를 켜 둡니다. 공개 [Vercel playground](https://test-mode-tau.vercel.app/)는 브라우저 fetch / CSR 데모로 유지합니다. SSR 예제를 Vercel에 자동으로 올리는 설정은 아닙니다.

실제 앱 연결과 Next.js 예제: [서버 렌더링 가이드](../../docs/server-rendering.md).
