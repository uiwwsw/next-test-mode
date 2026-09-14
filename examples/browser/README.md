# Console-first playground

**[공개 데모 열기](https://test-mode-tau.vercel.app/)**

개발자 도구 → Console에서 값을 입력하면 실제 앱 미리보기가 즉시 바뀌는 데모입니다. 화면의 JSON 편집기도 동일한 패키지 API를 호출합니다.

**호출 코드는 그대로. 테스트 데이터는 따로. 확인은 콘솔에서.** 브라우저 fetch를 앱 시작 시 연결하면 기존 호출부를 유지할 수 있습니다. 한 번 쓸 값은 콘솔에서 실험하고, 반복해서 확인할 동작은 앱 소유의 `src/test-mode/` 폴더에 모아 관리하세요.

이 공개 데모는 **브라우저 fetch / CSR**을 보여줍니다. 임시 JSON을 서버로 전송하거나 SSR HTML을 수정하지 않습니다. 서버에서 실제 HTML을 생성하는 별도의 [SSR 실행 예제](../server)와 [CSR / SSR 연결 가이드](../../docs/server-rendering.md)를 참고하세요.

```js
test.patch('/api/cart.json', { total: 9.99 });
test.mock('/api/cart.json', {
  items: [{ name: '내 상품', price: 3.14 }], total: 3.14,
});
test.mock('/api/cart.json', { message: '다시 시도해 주세요' }, { status: 503 });
test.overrides(); // 직접 설정한 값 확인
test.clear();     // 테스트 모드 끄기, 원래 HTTP 응답으로 복귀
```

등록된 시나리오는 `test.story.list()`로 찾을 수 있습니다. `test()`에 전체 도움말이 있습니다. Chrome/Edge에서 macOS는 ⌥⌘J, Windows/Linux는 Ctrl+Shift+J로 Console을 열 수 있습니다. 페이지 위쪽 명령은 배포 경로에 맞춰 생성되므로 그대로 복사하면 됩니다.

## Vercel에 Import

Vercel에서 `uiwwsw/test-mode` 저장소를 Import하고 **Root Directory는 저장소 루트(`./`)**로 둡니다. 루트의 `vercel.json`이 다음 설정을 제공합니다.

| 설정 | 값 |
| --- | --- |
| Framework | Other (`null`) |
| Install Command | `npm ci` |
| Build Command | `npm run build:demo` |
| Output Directory | `demo-dist` |
| 환경 변수 | 필요 없음 |

`NPM_TOKEN`은 GitHub Actions의 패키지 발행용입니다. Vercel 데모에는 필요하지 않습니다. npm 패키지의 `dist`와 웹사이트의 `demo-dist`를 분리해 빈 화면이나 디렉터리 목록이 배포되지 않게 했습니다. Vercel의 Git 연결을 유지하면 main 업데이트가 데모 배포로 이어집니다.

샘플 API는 공개 JSON 파일을 HTTP로 제공하므로 서버 함수·DB가 필요 없습니다. Mock은 네트워크 요청을 생략하고, Patch는 원래 JSON을 받은 뒤 필드를 변경합니다. 입력한 값은 서버에 전송하거나 보관하지 않습니다.

## 로컬 실행

```bash
npm ci
npm run dev:example
```

[http://127.0.0.1:4173](http://127.0.0.1:4173)을 엽니다. 배포 결과를 그대로 확인하려면:

```bash
npm run build:demo
DEMO_ROOT=demo-dist node scripts/serve-example.mjs
```

이 공개 샌드박스만 `enabled: true`입니다. 실제 앱에서는 개발 환경 조건을 설정하세요. 임시 응답 값은 해당 runtime의 메모리에만 있고 새로고침하면 사라집니다. 데모는 초기화 때 저장된 feature/story 선택도 지웁니다.

콘솔 명령 후 자동 재요청은 **이 데모 앱의 구독 코드**입니다. 라이브러리를 설치한 다른 앱에서는 `runtime.subscribe()`를 앱의 데이터 재요청과 연결하거나 직접 다시 요청해야 합니다. 앱 모양에 맞지 않는 JSON도 입력할 수 있으며, 이때 원본 응답과 앱의 처리 실패 상태가 함께 표시됩니다.

`npm run docs:assets`는 실제 예제를 실행하고 PNG/GIF를 생성합니다. Chromium(`npx playwright install chromium`)과 Python 3 / Pillow가 필요합니다.
