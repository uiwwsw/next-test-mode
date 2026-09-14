# 범용 브라우저 playground

이 폴더는 Next가 없는 브라우저 앱의 fetch·Console·overlay 예시와 회귀 테스트용입니다. 현재 공개 사이트는 루트 `app/`에 있는 실제 Next.js 데모입니다.

**[CSR](https://test-mode-tau.vercel.app/csr) · [SSR](https://test-mode-tau.vercel.app/ssr) · [ISR](https://test-mode-tau.vercel.app/isr) · [SSG](https://test-mode-tau.vercel.app/ssg)**

```js
test.patch('/api/cart.json', { total: 9.99 });
test.mock('/api/cart.json', { items: [], total: 0 });
test.clear();
```

범용 예시 실행: `npm run dev:example` → http://127.0.0.1:4173. 여기서는 직접 JSON이 메모리에만 있고 새로고침하면 사라집니다. 구독 코드가 자동 재요청을 담당합니다.

실제 Next 데모 실행: `npm run dev:demo`. Draft 세션의 JSON은 새로고침 후에도 유지되고 `test.clear()`로 해제합니다. Vercel은 저장소 루트, Next.js 프레임워크, `npm run build:demo`, `.next` 출력을 사용합니다. [배포 설정](../../docs/releasing.md#vercel).
