"use client";
import { useEffect, useState } from "react";
import { english } from "./messages.js";

const command = "test.patch('/api/cart.json', { total: 9.99 })";
const snapshot = (runtime) =>
  JSON.stringify([runtime.active(), runtime.overrides()]);
export default function Playground({
  mode,
  locale = "ko",
  pagePath = "",
  initial = null,
  renderedAt = null,
}) {
  const t = (value) => locale === "en" ? english[value] ?? value : value;
  const [result, setResult] = useState(initial);
  const [input, setInput] = useState('{\n  "total": 9.99\n}');
  const [operation, setOperation] = useState("patch");
  const [status, setStatus] = useState("200");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
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
           {t("빈 목록, 바뀐 가격, 오류 응답까지. 호출 코드는 그대로입니다.")} </p>
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
               {t("값을 바꾸면 화면이 자동으로 갱신됩니다.")} </p>
          </section>
          <section className="result-pane">
            <div className="pane-heading">
              <span className="step">02</span>
              <h3>{t("변경된 결과를 확인하세요")}</h3>
            </div>
            <div className="result-meta">
              <span className="http-badge">HTTP {result?.status ?? "…"}</span>
              <span>LIVE PREVIEW</span>
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
            {renderedAt && <time hidden data-rendered-at>{renderedAt}</time>}
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
          <span>03 / QUICK FEEDBACK</span>
          <h3> {t("필요한 상태를 바로 확인하세요.")} </h3>
          <p>
             {t("빈 목록부터 오류 응답까지. 데이터만 바꾸고 실제 화면에서 확인하세요.")} </p>
        </article>
      </section>
    </>
  );
}
