"use client";
import { useEffect, useState } from "react";
import { english } from "./messages.js";

const command = "test.patch('/api/cart.json', { total: 9.99 })";
const snapshot = (runtime) =>
  JSON.stringify([runtime.active(), runtime.overrides()]);
const modes = {
  CSR: [
    "브라우저가 가져온 응답",
    "브라우저 fetch에 같은 테스트 값을 적용합니다.",
  ],
  SSR: ["요청마다 새로 그린 화면", "서버가 fetch한 값으로 HTML을 생성합니다."],
  ISR: [
    "캐시된 화면도 내 세션에서 새로",
    "일반 방문자는 60초 재검증 캐시를, 테스트 세션은 새 서버 렌더를 사용합니다.",
  ],
  SSG: [
    "빌드 때 만든 화면도 미리보기",
    "일반 방문자는 빌드된 HTML을, 테스트 세션은 Draft Mode의 새 렌더를 받습니다.",
  ],
};
export default function Playground({
  mode,
  locale = "ko",
  pagePath = "",
  initial = null,
  renderedAt = null,
}) {
  const t = (value) => locale === "en" ? english[value] ?? value : value;
  const prefix = locale === "en" ? "/en" : "";
  const [result, setResult] = useState(initial);
  const [input, setInput] = useState('{\n  "total": 9.99\n}');
  const [operation, setOperation] = useState("patch");
  const [status, setStatus] = useState("200");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [cacheState, setCacheState] = useState(null);
  useEffect(() => {
    let live = true;
    const controller = window.demoTestMode;
    const failed = (event) => {
      if (live) {
        setError(event.detail);
        setReady(true);
      }
    };
    window.addEventListener("next-test-mode:error", failed);
    if (controller) {
      const override = controller.runtime
        .overrides()
        .find(
          (item) => item.path === "/api/cart.json" && item.method === "GET",
        );
      if (override) {
        setInput(JSON.stringify(override.data, null, 2));
        setOperation(override.mode);
        setStatus(String(override.status ?? 200));
        setActive(true);
      }
      controller.ready
        .then(() => {
          if (live) {
            setReady(true);
            setCacheState(controller.cache.status());
            setActive(controller.cache.status().draftEnabled);
          }
        })
        .catch((cause) => {
          if (live) setError(cause.message);
        });
    }
    if (mode === "CSR")
      fetch("/api/cart.json")
        .then(async (response) => ({
          data: await response.json(),
          status: response.status,
        }))
        .then((value) => {
          if (live) setResult(value);
        })
        .catch((cause) => {
          if (live) setError(cause.message);
        });
    return () => {
      live = false;
      window.removeEventListener("next-test-mode:error", failed);
    };
  }, [mode]);
  const apply = (event) => {
    event.preventDefault();
    try {
      const data = JSON.parse(input);
      const runtime = window.demoTestMode.runtime;
      const before = snapshot(runtime);
      if (operation === "mock")
        runtime.setMock("/api/cart.json", data, { status: Number(status) });
      else runtime.setPatch("/api/cart.json", data);
      setError("");
      setReady(before === snapshot(runtime));
    } catch (cause) {
      setError(cause.message);
    }
  };
  const controlCache = async (action) => {
    setReady(false);
    setError("");
    try {
      await window.demoTestMode.cache[action]();
      setCacheState(window.demoTestMode.cache.status());
      setActive(window.demoTestMode.cache.status().draftEnabled);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setReady(true);
    }
  };
  const reset = () => {
    void controlCache("restore");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setError(t("명령을 선택해 복사해 주세요."));
    }
  };
  const total =
    result?.data && typeof result.data === "object" && "total" in result.data
      ? String(result.data.total)
      : "—";
  return (
    <>
      <section className="intro">
        <nav aria-label="Language" className="language-nav">
          <a href={pagePath || "/"} hrefLang="ko" aria-current={locale === "ko" ? "page" : undefined}>한국어</a>
          <a href={`/en${pagePath}`} hrefLang="en" aria-current={locale === "en" ? "page" : undefined}>English</a>
        </nav>
        <div className="eyebrow">
          <span className="live-dot" /> NEXT.JS · CONSOLE-FIRST TESTING
        </div>
        <h1>
           {t("콘솔 한 줄로.")} <br />
          <span> {t("서버 데이터까지 테스트.")} </span>
        </h1>
        <p className="intro-copy">
           {t("개발 중 필요한 데이터와 화면 상태를 콘솔에서 바로 재현하세요.")} <br />
           {t("브라우저 응답부터 서버·정적 페이지까지, 호출 코드는 그대로입니다.")} </p>
        <div className="install">
          <code>npm i @uiwwsw/next-test-mode</code>
          <span>→</span>
          <code>npx @uiwwsw/next-test-mode init</code>
        </div>
      </section>
      <section className="playground" aria-label={t("실제 Next.js 데모")}>
        <div className="playground-heading">
          <div>
            <span className="eyebrow">TRY IT IN YOUR BROWSER</span>
            <h2> {t("값을 바꾸고, 화면에서 확인하세요.")} </h2>
          </div>
          <span
            className={`status-pill ${active ? "active" : ""}`}
            role="status"
          >
            {!ready ? t("연결 중…") : active ? t("테스트 세션 활성") : t("원래 데이터")}
          </span>
        </div>
        <div className="console-strip">
          <div>
            <span>DEVTOOLS → CONSOLE</span>
            <code>{command}</code>
          </div>
          <button onClick={copy} aria-label={t("콘솔 명령 복사")}>
            {copied ? t("복사 완료 ✓") : t("명령 복사 ↗")}
          </button>
        </div>
        <details className="limits">
          <summary> {t("서버에서 만든 화면도 콘솔로 테스트할 수 있을까요?")} </summary>
          <p> {t("브라우저 콘솔만으로는 이미 서버에서 생성한 HTML이나 빌드된 정적 데이터를 바꾸기 어렵습니다. Next Test Mode는 개발·QA 세션에서 테스트 값을 서버에 전달하고, Draft Mode로 캐시를 우회해 화면을 다시 렌더합니다. 평소 데브 모드에서 화면 상태를 재현하듯, 같은 콘솔 명령으로 확인하세요.")} </p>
          <p> {t("아래 렌더 방식은 기능 목록이 아니라 같은 테스트 값이 어디까지 적용되는지 확인하는 예제입니다. 먼저 명령을 실행하고 다른 방식으로 이동해 보세요.")} </p>
        </details>
        <nav className="mode-nav" aria-label={t("렌더링 방식")}>
          {Object.keys(modes).map((value) => (
            <a
              key={value}
              href={`${prefix}/${value.toLowerCase()}`}
              aria-current={mode === value ? "page" : undefined}
            >
              {value}
              <span>
                {value === "CSR"
                  ? "Client"
                  : value === "SSR"
                    ? "Server"
                    : value === "ISR"
                      ? "Revalidate"
                      : "Static"}
              </span>
            </a>
          ))}
        </nav>
        <div className="mode-description">
          <strong>{t(modes[mode][0])}</strong>
          <p>{t(modes[mode][1])}</p>
        </div>
        <div className="cache-tools" aria-label={t("서버 캐시 제어")}>
          <div>
            <strong> {t("서버 미리보기는 자동으로 연결됩니다")} </strong>
            <p data-cache-status>
              {cacheState?.draftEnabled
                ? t("내 세션은 캐시를 우회하는 중")
                : t("기본 캐시 경로")}{" "}
               {t("· 공용 캐시는 유지됩니다.")} </p>
            <code>
              test.cache.bypass() · test.cache.refresh() · test.cache.restore()
            </code>
          </div>
          <div className="cache-actions">
            <button
              disabled={!ready}
              onClick={() => {
                void controlCache("bypass");
              }}
            >
               {t("서버 캐시 우회")} </button>
            <button
              disabled={!ready}
              onClick={() => {
                void controlCache("refresh");
              }}
            >
               {t("다시 렌더")} </button>
          </div>
        </div>
        <div className="workspace">
          <section className="editor-pane">
            <div className="pane-heading">
              <span className="step">01</span>
              <h3> {t("원하는 데이터를 넣으세요")} </h3>
            </div>
            <form onSubmit={apply}>
              <fieldset disabled={!ready}>
                <div className="segmented">
                  <button
                    type="button"
                    aria-pressed={operation === "patch"}
                    onClick={() => setOperation("patch")}
                  >
                    Patch <small> {t("일부 변경")} </small>
                  </button>
                  <button
                    type="button"
                    aria-pressed={operation === "mock"}
                    onClick={() => setOperation("mock")}
                  >
                    Mock <small> {t("전체 교체")} </small>
                  </button>
                </div>
                <div className="editor-label">
                  <label htmlFor="json-input">GET /api/cart.json</label>
                  <span>JSON</span>
                </div>
                <textarea
                  id="json-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  spellCheck={false}
                  onKeyDown={(event) => {
                    if (
                      (event.metaKey || event.ctrlKey) &&
                      event.key === "Enter"
                    ) {
                      event.preventDefault();
                      event.currentTarget.form.requestSubmit();
                    }
                  }}
                />
                {operation === "mock" && (
                  <label className="http-input">
                     {t("HTTP 상태")} {" "}
                    <input
                      type="number"
                      min="200"
                      max="599"
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                    />
                  </label>
                )}
                <div className="editor-actions">
                  <button type="submit" className="primary">
                     {t("적용하고 화면 확인")} <span>↗</span>
                  </button>
                  <button type="button" onClick={reset}>
                     {t("원래 응답")} </button>
                </div>
              </fieldset>
            </form>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="pane-note">
               {t("콘솔과 입력창은 같은 패키지 API를 실행합니다.")} <br />
               {t("값을 바꾸면 Draft Mode 연결 후 화면이 자동 갱신됩니다.")} </p>
          </section>
          <section className="result-pane">
            <div className="pane-heading">
              <span className="step">02</span>
              <h3>
                {mode === "CSR"
                  ? t("브라우저가 받은 결과")
                  : t("서버가 HTML에 넣은 결과")}
              </h3>
            </div>
            <div className="result-meta">
              <span className="http-badge">HTTP {result?.status ?? "…"}</span>
              <span>{mode === "CSR" ? "CLIENT FETCH" : `${mode} → HTML`}</span>
            </div>
            <div className="total-block">
              <span>Cart total</span>
              <strong data-demo-total>{total}</strong>
            </div>
            <pre className="result-json" data-demo-payload>
              {result
                ? JSON.stringify(result.data, null, 2)
                : t("데이터를 불러오는 중…")}
            </pre>
            {renderedAt && (
              <div className="render-stamp">
                 {t("서버에서 생성한 시각")} <time data-rendered-at>{renderedAt}</time>
              </div>
            )}
          </section>
        </div>
        <p className="session-note">
          <strong> {t("내 테스트 세션에만 적용됩니다.")} </strong>  {t("새로고침 후에도 유지되며, 같은 브라우저의 탭이 공유합니다.")} <code>test.clear()</code> {t("로 종료하세요.")} </p>
      </section>
      <section className="benefits" aria-label={t("장점")}>
        <article>
          <span>01 / SAME CALLS</span>
          <h3> {t("호출부를 고치지 마세요.")} </h3>
          <p> {t("앱 시작 지점에 한 번 연결하면 기존 fetch를 계속 사용합니다.")} </p>
        </article>
        <article>
          <span>02 / YOUR SCENARIOS</span>
          <h3> {t("테스트는 테스트로 남기세요.")} </h3>
          <p>
             {t("한 번 쓸 값은 콘솔에서. 반복할 시나리오는 별도 폴더에서 수정하고 공유하세요.")} </p>
        </article>
        <article>
          <span>03 / EVERY RENDER</span>
          <h3> {t("캐시된 페이지도 확인하세요.")} </h3>
          <p>
             {t("콘솔의 테스트 값을 서버 렌더에도 전달합니다. 일반 방문자는 원래 페이지를 봅니다.")} </p>
        </article>
      </section>
      <details className="limits">
        <summary> {t("지원 범위와 입력값 안내")} </summary>
        <p>
           {t("Next.js 16 App Router의 Node 환경에서 실행하는 fetch 기반 CSR·SSR·ISR·SSG 미리보기를 지원합니다. 정적 HTML export·Pages Router·Edge·DB 직접 조회는 자동 연결 범위에 포함하지 않습니다.")} </p>
        <p>
           {t("입력값은 인코딩 후 최대 3,500바이트입니다. 큰 응답은 필요한 필드만 Patch하거나 파일에 시나리오로 등록하세요. 이 데모는 /api/cart.json 샘플 경로만 변경합니다.")} </p>
      </details>
    </>
  );
}
