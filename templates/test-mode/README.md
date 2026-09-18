# 앱 소유의 테스트 폴더

API 호출부는 그대로 두고, 반복할 mock·patch·story를 이 폴더에서 수정하세요. 임시 값은 Console의 `test.mock()` / `test.patch()`로 확인한 뒤 `test.clear()`하면 됩니다.

```bash
cp -R node_modules/@uiwwsw/next-test-mode/templates/test-mode src/test-mode
```

## Next App Router

`npx @uiwwsw/next-test-mode init`이 앱 안에 `test-mode/catalog`, `client`, `server`를 생성합니다. 반복할 시나리오는 그 catalog에 등록하세요. 이 템플릿에서는 `features/`와 `stories/`만 필요에 따라 가져오면 됩니다. `index.ts`와 `install.ts`의 범용 runtime을 중복 설치하지 마세요.

```ts
// src/test-mode/catalog.ts
import { authFeatures } from './features/auth';
import { authStories } from './stories/auth.stories';

export const catalog = {
  cookieKey: 'test-mode.entries',
  definitions: [...authFeatures],
  stories: [...authStories],
};
```

생성된 두 설치 파일이 같은 catalog를 읽습니다. 실제 앱의 페이지와 API에는 import를 추가하지 않습니다. 서버에서도 실행하는 정의에는 DOM이나 브라우저 전용 라이브러리를 넣지 마세요. 빌드 조건은 생성된 instrumentation 파일에 유지해야 일반 production에서 테스트 코드가 제외됩니다.

등록 후 Console의 `test.search()`로 목록을 보고 선택합니다. 큰 응답은 파일에 두고 선택 key만 전달하면 JSON 쿠키 제한을 피할 수 있습니다. `test.cache.bypass()`는 데이터 mock 없이 서버 미리보기만 켭니다.

## 범용 브라우저 앱

`index.ts` / `config.ts` / `install.ts`는 Next 자동 연결이 없는 앱의 수동 설치 예시입니다. `config.ts`의 enabled 조건을 앱의 환경 변수에 맞추고 시작 시 `installAppTestMode()`를 한 번 호출하세요. 반환된 cleanup은 종료/HMR에 실행합니다. Next의 생성된 설치와 함께 실행하지 마세요.
