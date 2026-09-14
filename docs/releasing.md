# 개발 및 배포

```bash
npm ci
npm run ci                  # 타입, 런타임 회귀 테스트, 실제 tarball 설치 검증
npx playwright install chromium
npm run test:next            # 실제 Next.js 앱에 tarball/CLI 설치 및 자동 SSR 검증
npm run test:browser        # 실제 Chromium에서 콘솔·fetch·overlay 검증
npm pack                    # dist를 새로 빌드하고 설치 가능한 tgz 생성
```

GitHub Actions는 PR과 main에서 Node.js 18.17 / 20 / 22 / 24 및 Chromium·Next.js 16.3.5 자동 SSR 연결을 검증합니다. 패키지 검사에는 외부 소비자 프로젝트에서의 ESM import, 타입이 있는 handler, 복사한 스타터의 TypeScript 컴파일이 포함됩니다.

배포는 **GitHub Release 발행** 또는 **Publish 워크플로의 기존 tag 지정 실행**으로 시작됩니다. 저장소 secret `NPM_TOKEN`을 사용하며, 발행 권한과 CI에서의 비대화형 발행 권한이 있어야 합니다. 토큰은 publish 단계에만 전달합니다.

1. `npm version patch --no-git-tag-version` 등으로 package.json과 package-lock.json 버전을 함께 올립니다.
2. 검증된 변경을 main에 반영한 뒤 그 main 커밋에 버전 tag를 만들고 push합니다.
3. 해당 `vX.Y.Z` tag로 GitHub Release를 발행합니다.
4. 전체 CI 통과, tag와 package 버전 일치, main에 포함된 커밋인지 확인 후 npm에 provenance와 함께 발행합니다.

정식 버전은 `latest`, `1.2.0-beta.1` 같은 사전 버전은 `next`로 발행합니다. 수동 실행도 main에 포함된 기존 버전 tag가 필요합니다. 임의 브랜치 HEAD는 배포하지 않습니다. 재실행 시 동일 커밋의 발행 완료 버전은 건너뛰고, 레지스트리 확인은 반영 지연을 고려해 10초 간격으로 최대 36회 재시도합니다.

최초 발행 후 토큰 없이 배포하려면 npm의 [Trusted publishing](https://docs.npmjs.com/trusted-publishers/)에 GitHub user `uiwwsw`, repository `test-mode`, workflow `publish.yml`, environment `npm`을 등록하고 직접 `npm publish`를 허용하세요. 워크플로에는 OIDC 권한이 준비되어 있습니다.


## 문서 이미지 갱신

`npm run docs:assets`는 작동하는 로컬 예제를 Chromium에서 촬영합니다. 개발 환경에 Python 3과 Pillow가 필요합니다. 생성된 PNG/GIF는 GitHub에서 제공하고 npm tarball에는 포함하지 않습니다.

## Vercel 데모

공개 주소: [CSR 데모](https://test-mode-tau.vercel.app/) · [SSR 데모](https://test-mode-tau.vercel.app/api/ssr)

Vercel에서 이 GitHub 저장소를 Import하고 Root Directory를 `./`로 둡니다. `vercel.json`에 Other 프레임워크, `npm run build:demo`, `demo-dist` 출력이 지정되어 있습니다. CSR 정적 파일과 `api/ssr.mjs` Node 함수를 함께 배포합니다. SSR 함수가 사용하는 `dist`도 같은 빌드에서 생성됩니다. 데모에는 환경 변수가 필요하지 않습니다. 연결 후 main 변경이 데모의 자동 배포를 시작합니다. npm 패키지 발행은 기존 GitHub Release / NPM_TOKEN 절차를 그대로 사용합니다.
