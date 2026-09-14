# 앱 소유의 테스트 폴더

API 호출부는 그대로 두고, 반복할 mock·patch·story를 이 폴더에서 수정하세요. 임시 값은 Console의 `test.mock()` / `test.patch()`로 확인한 뒤 `test.clear()`하면 됩니다.

```bash
cp -R node_modules/@uiwwsw/next-test-mode/templates/test-mode src/test-mode
```

## Next App Router

먼저 패키지의 `init`으로 서버·브라우저·Draft 경로를 생성하세요. 이 폴더에서 브라우저용 runtime을 만들거나 `install.ts`를 중복 실행하지 않고, 서버와 브라우저가 공유할 순수 등록 목록을 만듭니다.

```ts
// src/test-mode/catalog.ts
import { authFeatures } from './features/auth';
import { authStories } from './stories/auth.stories';

export const catalog = {
  definitions: [...authFeatures],
  stories: [...authStories],
};
```

생성된 서버 hook의 `setupNextTestMode({ ...catalog, enabled: true })`, 클라이언트 hook의 `setupNextTestModeClient({ ...catalog, enabled: 기존환경조건 })`에 같은 목록을 전달하세요. `/src` 구조의 hook에서는 `./test-mode/catalog`로 import합니다. 서버에서도 실행하는 정의에는 DOM이나 브라우저 전용 라이브러리를 넣지 마세요. `config.ts`의 범용 환경 감지 대신 생성된 Next 환경 조건을 유지합니다.

등록 후 Console에서 `test.search()`로 목록을 보고 `test.story('auth.locked')`처럼 선택합니다. 정확한 story key는 `stories/auth.stories.ts`를 확인하세요. 전체 응답은 파일에 두고 선택 key만 쿠키로 보내면 큰 데이터도 JSON 쿠키 제한을 피할 수 있습니다.

## 범용 브라우저 앱

`index.ts` / `config.ts` / `install.ts`는 Next 자동 연결이 없는 앱의 수동 설치 예시입니다. `config.ts`의 enabled 조건을 앱의 환경 변수에 맞추고 시작 시 `installAppTestMode()`를 한 번 호출하세요. 반환된 cleanup은 종료/HMR에 실행합니다. Next의 생성된 설치와 함께 실행하지 마세요.
