"use client";
import { useEffect, useState } from "react";

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
  initial = null,
  renderedAt = null,
}) {
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
      setError("명령을 선택해 복사해 주세요.");
    }
  };
  const total =
    result?.data && typeof result.data === "object" && "total" in result.data
      ? String(result.data.total)
      : "—";
  return (
    <>
      <section className="intro">
        <div className="eyebrow">
          <span className="live-dot" /> NEXT.JS · CONSOLE-FIRST TESTING
        </div>
        <h1>
          호출 코드는 그대로.
          <br />
          <span>화면의 가능성은 자유롭게.</span>
        </h1>
        <p className="intro-copy">
          테스트 데이터는 따로 두고, 원하는 값은 콘솔에서.
          <br />
          CSR부터 SSR·ISR·SSG까지 같은 명령으로 확인하세요.
        </p>
        <div className="install">
          <code>npm i @uiwwsw/next-test-mode</code>
          <span>→</span>
          <code>npx @uiwwsw/next-test-mode init</code>
        </div>
      </section>
      <section className="playground" aria-label="실제 Next.js 데모">
        <div className="playground-heading">
          <div>
            <span className="eyebrow">TRY IT IN YOUR BROWSER</span>
            <h2>네 가지 렌더링, 같은 사용법.</h2>
          </div>
          <span
            className={`status-pill ${active ? "active" : ""}`}
            role="status"
          >
            {!ready ? "연결 중…" : active ? "테스트 세션 활성" : "원래 데이터"}
          </span>
        </div>
        <nav className="mode-nav" aria-label="렌더링 방식">
          {Object.keys(modes).map((value) => (
            <a
              key={value}
              href={`/${value.toLowerCase()}`}
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
          <strong>{modes[mode][0]}</strong>
          <p>{modes[mode][1]}</p>
        </div>
        <div className="console-strip">
          <div>
            <span>DEVTOOLS → CONSOLE</span>
            <code>{command}</code>
          </div>
          <button onClick={copy} aria-label="콘솔 명령 복사">
            {copied ? "복사 완료 ✓" : "명령 복사 ↗"}
          </button>
        </div>
        <div className="cache-tools" aria-label="서버 캐시 제어">
          <div>
            <strong>콘솔에서 서버 캐시까지</strong>
            <p data-cache-status>
              {cacheState?.draftEnabled
                ? "내 세션은 캐시를 우회하는 중"
                : "기본 캐시 경로"}{" "}
              · 공용 캐시는 유지됩니다.
            </p>
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
              서버 캐시 우회
            </button>
            <button
              disabled={!ready}
              onClick={() => {
                void controlCache("refresh");
              }}
            >
              다시 렌더
            </button>
          </div>
        </div>
        <div className="workspace">
          <section className="editor-pane">
            <div className="pane-heading">
              <span className="step">01</span>
              <h3>원하는 데이터를 넣으세요</h3>
            </div>
            <form onSubmit={apply}>
              <fieldset disabled={!ready}>
                <div className="segmented">
                  <button
                    type="button"
                    aria-pressed={operation === "patch"}
                    onClick={() => setOperation("patch")}
                  >
                    Patch <small>일부 변경</small>
                  </button>
                  <button
                    type="button"
                    aria-pressed={operation === "mock"}
                    onClick={() => setOperation("mock")}
                  >
                    Mock <small>전체 교체</small>
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
                    HTTP 상태{" "}
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
                    적용하고 화면 확인 <span>↗</span>
                  </button>
                  <button type="button" onClick={reset}>
                    원래 응답
                  </button>
                </div>
              </fieldset>
            </form>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="pane-note">
              콘솔과 입력창은 같은 패키지 API를 실행합니다.
              <br />
              값을 바꾸면 Draft Mode 연결 후 화면이 자동 갱신됩니다.
            </p>
          </section>
          <section className="result-pane">
            <div className="pane-heading">
              <span className="step">02</span>
              <h3>
                {mode === "CSR"
                  ? "브라우저가 받은 결과"
                  : "서버가 HTML에 넣은 결과"}
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
                : "데이터를 불러오는 중…"}
            </pre>
            {renderedAt && (
              <div className="render-stamp">
                서버에서 생성한 시각 <time data-rendered-at>{renderedAt}</time>
              </div>
            )}
          </section>
        </div>
        <p className="session-note">
          <strong>내 테스트 세션에만 적용됩니다.</strong> 새로고침 후에도
          유지되며, 같은 브라우저의 탭이 공유합니다. <code>test.clear()</code>로
          종료하세요.
        </p>
      </section>
      <section className="benefits" aria-label="장점">
        <article>
          <span>01 / SAME CALLS</span>
          <h3>호출부를 고치지 마세요.</h3>
          <p>앱 시작 지점에 한 번 연결하면 기존 fetch를 계속 사용합니다.</p>
        </article>
        <article>
          <span>02 / YOUR SCENARIOS</span>
          <h3>테스트는 테스트로 남기세요.</h3>
          <p>
            한 번 쓸 값은 콘솔에서. 반복할 시나리오는 별도 폴더에서 수정하고
            공유하세요.
          </p>
        </article>
        <article>
          <span>03 / EVERY RENDER</span>
          <h3>캐시된 페이지도 확인하세요.</h3>
          <p>
            Draft Mode가 테스트 세션의 캐시를 우회합니다. 일반 방문자는 원래
            페이지를 봅니다.
          </p>
        </article>
      </section>
      <details className="limits">
        <summary>지원 범위와 입력값 안내</summary>
        <p>
          Next.js 16 App Router의 Node 환경에서 실행하는 fetch 기반
          CSR·SSR·ISR·SSG 미리보기를 지원합니다. 정적 HTML export·Pages
          Router·Edge·DB 직접 조회는 자동 연결 범위에 포함하지 않습니다.
        </p>
        <p>
          입력값은 인코딩 후 최대 3,500바이트입니다. 큰 응답은 필요한 필드만
          Patch하거나 파일에 시나리오로 등록하세요. 이 데모는 /api/cart.json
          샘플 경로만 변경합니다.
        </p>
      </details>
    </>
  );
}
