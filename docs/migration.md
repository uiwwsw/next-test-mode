# @uiwwsw/test-mode → @uiwwsw/next-test-mode

0.6.0부터 제품 이름은 **Next Test Mode**, npm 패키지는 **`@uiwwsw/next-test-mode`**, 저장소는 **uiwwsw/next-test-mode**입니다. 기존 0.5.0 패키지는 계속 설치할 수 있지만 새 개발은 새 이름으로 진행합니다. 공개 데모 주소는 https://test-mode-tau.vercel.app/ 그대로입니다.

## Next App Router

```bash
npm uninstall @uiwwsw/test-mode
npm install @uiwwsw/next-test-mode
npx @uiwwsw/next-test-mode init --migrate
npm run dev
```

이 명령은 **수정하지 않은 0.5.0 자동 생성 instrumentation 파일**만 새 설정으로 바꾸며, Draft Mode POST 경로를 추가합니다. 기존 파일에 사용자 코드가 있으면 어떤 파일도 변경하지 않고 합칠 코드를 출력합니다. [생성 코드](./server-rendering.md#최초-설정)를 기존 hook 안에 합치세요. 페이지의 fetch 호출은 그대로 둡니다.

앱 소유의 시나리오 파일에 남은 import도 `@uiwwsw/test-mode`에서 `@uiwwsw/next-test-mode`로 바꾸세요. 새 브라우저 연결은 `/client`의 `setupNextTestModeClient`입니다. 기존 `setupTestMode({ ssr: true })`와 중복 설치하지 마세요. 서버는 `/next`의 `setupNextTestMode`를 사용합니다.

Next.js 16.3.5 이상 17 미만의 App Router와 Node.js 20.9 이상이 필요합니다. 검증된 Next 버전은 16.3.5입니다. QA 배포는 `NEXT_PUBLIC_NEXT_TEST_MODE=1`을 빌드와 실행 환경에 설정하고 재배포하세요. Pages Router와 Edge, 순수 정적 export는 자동 이전 대상이 아닙니다.

## 유지되는 API

`test.mock`, `test.patch`, `test.reset`, `test.clear`, feature/story 정의와 범용 core/fetch/browser/server/node/setup export는 유지합니다. 브라우저의 기본 storage/cookie 키도 유지하므로 기존 선택을 읽을 수 있습니다. 두 패키지를 동시에 설치·초기화하지 마세요.

새 Next 연결은 Console 변경 후 Draft Mode를 확인하고 페이지를 새로고침합니다. SSR뿐 아니라 SSG·ISR도 세션별 미리보기가 됩니다. `test.clear()`는 이 도구가 연 Draft Mode를 종료하고 원래 캐시 경로로 돌아갑니다. JSON 상태는 세션 쿠키에 유지되며 새로고침만으로 지워지지 않습니다.

범용 브라우저/Node 앱은 import 이름만 바꾸면 기존 API를 계속 사용할 수 있습니다. 범용 `setupTestMode()`의 기본 직접 JSON은 메모리에만 남습니다. Next peer는 선택적입니다.
