# 개발 및 배포

```bash
npm ci
npx playwright install chromium
npm run ci
npm run test:browser
npm run test:next
npm run test:demo
npm pack
```

PR/main CI는 Node.js 20.9 / 22 / 24, Chromium, 실제 Next.js 16.3.5를 검증합니다. tarball을 독립 앱에 설치해 ESM·타입·스타터·CLI를 확인합니다. Next fixture는 dev, production의 SSR·SSG·ISR·force-static·생성 경로·unstable_cache, Cache Components/use cache, 비활성 production을 각각 검사합니다. 테스트 카탈로그가 비활성 production의 브라우저·서버 번들에서 제외되는지, 첫 CSR fetch부터 가로채는지도 검사합니다. 공개 데모는 네 렌더 모드·모바일 JSON 입력·데이터 조작 없는 캐시 우회/복귀를 검사합니다.

## npm

GitHub Release 발행 또는 Publish workflow에서 기존 tag를 지정하면 배포합니다. `NPM_TOKEN`에는 `@uiwwsw/next-test-mode` 발행 권한과 기존 `@uiwwsw/test-mode`의 이전 안내 설정 권한이 필요합니다. 토큰은 publish/deprecate 단계에만 전달합니다.

1. package.json과 package-lock.json 버전을 함께 갱신합니다.
2. 검증된 변경을 main에 반영하고 그 커밋에 `vX.Y.Z` 태그를 만듭니다.
3. 같은 태그로 GitHub Release를 발행합니다.
4. 전체 CI, 태그·버전 일치, main 포함 여부를 통과하면 npm provenance와 함께 발행합니다.
5. 레지스트리에서 버전·커밋·무결성·provenance와 실제 설치에 사용하는 패키지 목록·배포 태그까지 확인한 다음, 기존 패키지에 새 이름과 이전 가이드를 안내합니다. 기존 버전은 삭제하지 않습니다.

정식 버전은 `latest`, 사전 버전은 `next` 채널로 배포합니다. 동일 커밋으로 이미 발행했다면 건너뛰며, 다른 커밋의 동일 버전은 거부합니다. 레지스트리 반영은 최대 36회 재시도합니다. 성공 후 일반 `npm view`와 새 소비자 설치로도 확인하세요.

npm [Trusted publishing](https://docs.npmjs.com/trusted-publishers/)을 설정한다면 GitHub user `uiwwsw`, repository **`next-test-mode`**, workflow `publish.yml`, environment `npm`을 사용합니다. 워크플로의 OIDC 권한은 준비되어 있습니다.

## Vercel

공개 데모: [CSR](https://test-mode-tau.vercel.app/csr) · [SSR](https://test-mode-tau.vercel.app/ssr) · [ISR](https://test-mode-tau.vercel.app/isr) · [SSG](https://test-mode-tau.vercel.app/ssg).

저장소를 Import하고 Root Directory를 `./`로 둡니다. `vercel.json`은 **Next.js**, `npm run build:demo`, `.next` 출력을 지정합니다. 기존 프로젝트의 UI에 별도 빌드/출력 override가 있다면 이 값과 맞추세요. GitHub 저장소 이름은 `next-test-mode`이며 데모 도메인은 그대로입니다.

데모는 루트 `app/`의 실제 Next 앱입니다. `instrumentation.js`와 `instrumentation-client.js`가 로컬 패키지 빌드를 연결하고, 공개 샘플 `/api/cart.json`만 서버 테스트 대상으로 허용합니다. 샘플 데모에는 환경 변수가 필요하지 않습니다. 사용자 앱에 생성하는 설정은 기본 development 전용입니다.

루트와 `/ssg`는 정적 생성, `/isr`은 60초 재검증, `/ssr`은 매 요청 렌더, `/csr`은 브라우저 fetch입니다. 빌드 시 공개 데모의 샘플 JSON을 가져오므로 최초 도메인 이전 때는 `demo-components/load-cart.js`의 샘플 주소도 확인하세요. 구 `/api/ssr` 주소는 `/ssr`로 안내합니다.

## 문서 이미지

`npm run docs:assets`는 Next production 데모를 Chromium으로 촬영하고 README의 PNG/GIF를 만듭니다. Python 3과 Pillow가 필요합니다. 이미지는 GitHub 릴리스 태그의 절대 URL로 제공하며 npm tarball에는 넣지 않습니다. README 이미지 URL의 태그도 새 릴리스에 맞추세요.
