# 콘솔이 제어하고, 테스트 코드는 분리합니다

이 라이브러리는 실제 앱의 fetch 호출을 유지하면서 Console에서 화면 상태와 Next 서버 미리보기를 제어합니다. 테스트 정의는 앱의 `test-mode/`에만 둡니다. 실제 비즈니스 로직은 테스트 라이브러리를 import하거나 테스트 여부를 판단하지 않습니다. 프레임워크 시작 지점과 Draft 경로에만 최초 연결이 필요합니다.

## 네 가지 경계

1. **테스트 정의:** 순수 catalog에 mock·patch·story와 샘플을 둡니다. 브라우저와 서버가 같은 정의를 읽으며, 페이지는 이를 참조하지 않습니다.
2. **콘솔과 상태:** Console은 runtime의 상태를 바꿉니다. 입력 JSON은 검증 후 제한된 세션 쿠키로 전달하고, 큰 샘플은 파일에 둔 뒤 선택 key만 전달합니다.
3. **미리보기 제어:** 별도 연결 모듈이 실제 transport로 Draft Mode를 조정합니다. 상태는 idle → syncing → refreshing으로 진행하며 오류·중지 상태를 외부에서 확인할 수 있습니다. 입력이 비동기 갱신 도중 바뀌면 최신 상태를 다시 처리합니다.
4. **서버 실행:** Next 어댑터는 활성 Draft 요청에만 요청별 runtime을 연결합니다. mock/patch 결과는 기존 fetch 캐시의 바깥에서 적용하며, 기본 페이지는 원래 캐시 경로를 유지합니다.

## Console에서 서버 캐시가 달라지는 이유

`test.patch(...)` → JSON 쿠키 → 동일 출처 POST → Next Draft 쿠키 → 새 페이지 요청 → 서버 재렌더 순서입니다. `test.cache.bypass()`는 JSON override가 없어도 이 경로를 켭니다. 기존 mock/patch가 있다면 유지합니다. `test.cache.refresh()`는 현재 미리보기를 다시 요청합니다. Draft가 꺼져 있으면 기존 캐시 정책을 따릅니다. `test.cache.restore()`는 테스트 입력·선택·수동 우회를 해제합니다. 기존 CMS Draft 세션은 보존합니다.

| 캐시 | 도구의 동작 |
| --- | --- |
| Next Full Route / 정적 HTML / ISR | Draft 세션에서 캐시된 페이지를 우회해 새 렌더 |
| Next Data Cache / fetch force-cache | Draft 실행 경로에서 최신 fetch를 실행 |
| unstable_cache / Cache Components의 use cache | 검증된 Next Draft 우회 경로에서 실행하는 fetch에 테스트 값 적용 |
| Router Cache | 기본 전체 새로고침으로 이전 클라이언트 라우터 결과 교체 |
| 브라우저 HTTP 캐시, Service Worker | 일괄 삭제하지 않음. 앱의 별도 정책 필요 |
| SWR / React Query / 직접 DB / Redis / 외부 CDN | 해당 도구의 캐시 API나 별도 어댑터 필요 |

즉 **모든 서버 캐시를 지우는 도구가 아니라, 콘솔에서 내 Next 테스트 세션의 캐시 우회와 복귀를 제어하는 도구**입니다. 일반 방문자의 캐시를 보존하므로 운영과 QA 데이터를 섞지 않습니다. 지원 경계와 Next 내부 브리지의 버전 의존성은 [서버 연결 문서](./server-rendering.md)를 참고하세요.

## 빌드와 테스트 분리

생성된 instrumentation은 빌드 시 환경 조건이 참일 때만 테스트 폴더를 로드합니다. 테스트 카탈로그를 페이지에서 직접 import하면 이 분리가 무너지므로 그렇게 사용하지 않습니다. 일반 production과 QA production을 실제로 각각 빌드해 카탈로그 표식의 포함/제외를 검사합니다. 초기 CSR fetch가 테스트 설치 전에 실행되지 않는지도 검사합니다.

동일한 core/fetch runtime은 Next와 독립적입니다. Next 캐시 정책은 `/client`, `/next` 연결에만 있고 generic browser/Node API의 기본 의미를 바꾸지 않습니다. UI 데이터 조회와 테스트 제어 요청도 분리되어 Console mock이 Draft 연결이나 서버 권한 검사 응답을 바꿀 수 없습니다.
