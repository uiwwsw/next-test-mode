const escape = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

export const renderAutomaticPage = (data, status) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>test mode · Console → SSR</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f7f5;color:#173c36;font:16px/1.65 system-ui,sans-serif}main{max-width:1060px;margin:auto;padding:30px 24px}header{display:flex;justify-content:space-between;gap:16px;margin-bottom:32px}a{color:inherit}h1{font-size:32px;letter-spacing:-1px;line-height:1.3;margin:8px 0}h2{font-size:18px;margin:0 0 18px}.muted{color:#526e65}code,pre,textarea{font-family:ui-monospace,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere}.command{padding:20px 24px;background:#102e29;color:#b9fbd6;border-radius:12px;margin:24px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.panel{border:1px solid #d7e3de;border-radius:12px;padding:24px;background:white;min-width:0}textarea{display:block;width:100%;min-height:180px;padding:14px;border:1px solid #a8c4b5;border-radius:8px;font-size:14px;margin:12px 0}fieldset{border:0;padding:0;margin:0;min-width:0}button:disabled{opacity:.55;cursor:wait}button,input{font:inherit}button{cursor:pointer;border:1px solid #acc6b8;border-radius:8px;padding:8px 12px;background:white;color:inherit}button[aria-pressed=true],button.primary{background:#173c36;color:#b9fbd6}.actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.total{font-size:54px;line-height:1.2;margin:22px 0;color:#1c6a4e}.label{font-size:12px;letter-spacing:1px}.error{color:#a42e38}input{width:88px;padding:6px;border:1px solid #acc6b8;border-radius:6px}footer{font-size:13px;margin-top:24px;color:#526e65}@media(max-width:700px){.grid{grid-template-columns:1fr}main{padding:24px 16px}h1{font-size:27px}.panel{padding:18px}}[hidden]{display:none!important}
</style></head><body><main>
<header><a href="/">test mode</a><span>LIVE SSR DEMO</span><a href="https://github.com/uiwwsw/next-test-mode/blob/main/docs/server-rendering.md">설치 방법 ↗</a></header>
<p class="label">SAME FETCH. BROWSER + SERVER.</p><h1>콘솔에서 바꾸면, SSR도 바뀝니다.</h1>
<p class="muted">시작할 때 한 번 연결하세요. 기존 API 호출로 서버가 그린 화면까지 확인합니다.</p>
<div class="command"><strong>개발자 도구 → Console</strong><pre>test.patch('/api/cart.json', { total: 12.34 })</pre><small>값을 입력하면 자동으로 새 서버 화면을 받습니다. test.clear()로 원래 응답에 복귀하세요.</small></div>
<div class="grid"><section class="panel"><h2>원하는 값을 직접 입력해 보세요</h2>
<div class="actions"><button id="ssr-patch" type="button" disabled aria-pressed="true">Patch · 일부 변경</button><button id="ssr-mock" type="button" disabled aria-pressed="false">Mock · 전체 교체</button></div>
<form id="ssr-form"><fieldset id="ssr-controls" disabled><label for="ssr-input">GET /api/cart.json · JSON</label><textarea id="ssr-input" spellcheck="false">{ "total": 12.34 }</textarea>
<label id="ssr-status-label" hidden>HTTP <input id="ssr-status" type="number" value="200" min="200" max="599"></label>
<div class="actions"><button class="primary" type="submit">SSR에 적용</button><button id="ssr-clear" type="button">원래 응답</button></div>
<p id="ssr-error" class="error" role="alert" hidden></p></fieldset></form>
<p id="ssr-ready" class="muted" role="status">콘솔과 입력창 연결 중…</p>
<p class="muted">SSR 모드의 입력값은 새로고침 후에도 유지됩니다. 같은 브라우저의 탭끼리 공유하며, 초기화하면 해제됩니다.</p></section>
<section class="panel"><h2>서버가 HTML에 넣은 결과</h2><span class="label">UPSTREAM HTTP ${escape(status)}</span>
<div class="total" data-ssr-total>${escape(data && typeof data === "object" && "total" in data ? data.total : "—")}</div>
<pre data-ssr-payload>${escape(JSON.stringify(data, null, 2))}</pre>
<p class="muted">이 결과는 클라이언트에서 덧그린 값이 아닙니다. 페이지의 원본 HTML에도 같은 데이터가 들어 있습니다.</p></section></div>
<footer>서버도 평소의 fetch()를 사용합니다. 이 공개 데모는 샘플 장바구니 경로만 허용합니다. SSR 동기화는 쿠키에 담기는 작은 JSON(인코딩 후 최대 3,500바이트)을 위한 기능입니다.</footer>
</main><script type="module" src="/ssr-client.js"></script></body></html>`;
