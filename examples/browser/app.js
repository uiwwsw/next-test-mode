import {
  createTestMode,
  defineMock,
  definePatch,
  defineStory,
  entry,
  httpResult,
  installMockFetch,
  installTestModeOverlay,
} from "./dist/index.js";

const $ = (selector) => document.querySelector(selector);
const apiPath = new URL("./api/cart.json", location.href).pathname;
const runtime = createTestMode({
  // This public sandbox intentionally enables the debugger. Real apps must use their dev flag.
  enabled: true,
  storageKey: "test-mode.demo",
  cookieKey: "test-mode.demo",
  eventName: "test-mode.demo:change",
  definitions: [
    defineMock(apiPath, () => ({ items: [], total: 0 }), {
      caseKey: "empty",
      method: "GET",
      pages: [location.pathname],
    }),
    defineMock(
      apiPath,
      () =>
        httpResult({
          data: { message: "잠시 후 다시 시도해 주세요." },
          status: 503,
          statusText: "Service Unavailable",
        }),
      { caseKey: "error", method: "GET", pages: [location.pathname] },
    ),
  ],
  patchDefinitions: [
    definePatch(
      apiPath,
      (data) => ({ ...data, discount: 10, total: data.total - 10 }),
      { caseKey: "discount", method: "GET", pages: [location.pathname] },
    ),
  ],
  stories: [
    defineStory({
      key: "cart.empty",
      title: "빈 목록",
      description: "상품이 없는 장바구니",
      entries: [entry(apiPath, "empty")],
    }),
    defineStory({
      key: "cart.error",
      title: "503 오류",
      description: "서버 오류 안내",
      entries: [entry(apiPath, "error")],
    }),
    defineStory({
      key: "cart.discount",
      title: "할인 적용",
      description: "샘플 상품에 할인 적용",
      entries: [entry(apiPath, "discount")],
    }),
  ],
});
runtime.clear();
let networkRequests = 0;
const originalFetch = window.fetch.bind(window);
const stopFetch = installMockFetch(runtime, {
  originalFetch: (...args) => {
    networkRequests++;
    return originalFetch(...args);
  },
});
const stopOverlay = installTestModeOverlay(runtime, {
  watermarkText: "TEST MODE",
  namespace: "__testModeDemo",
});
const debug = window.test;
const quickCommand = `test.patch(${JSON.stringify(apiPath)}, { total: 9.99 })`;
$("#quick-command").textContent = quickCommand;
$("#api-path").textContent = apiPath;
$("#shortcut").textContent = /Mac|iPhone|iPad/.test(navigator.platform)
  ? "⌥ ⌘ J · Chrome / Edge"
  : "Ctrl + Shift + J · Chrome / Edge";

let editorMode = "patch";
let sequence = 0;
let pending;
let scheduled = false;
let disposed = false;
const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const clearError = () => {
  $("#editor-error").hidden = true;
  $("#json-input").removeAttribute("aria-invalid");
};
const showError = (error) => {
  $("#editor-error").textContent =
    error instanceof Error ? error.message : String(error);
  $("#editor-error").hidden = false;
  $("#json-input").setAttribute("aria-invalid", "true");
};
function readEditor() {
  let data;
  try {
    data = JSON.parse($("#json-input").value);
  } catch {
    throw new Error(
      "JSON 형식을 확인해 주세요. 키와 문자열에는 큰따옴표를 사용합니다.",
    );
  }
  if (
    editorMode === "patch" &&
    (data === null || typeof data !== "object" || Array.isArray(data))
  )
    throw new Error(
      "Patch에는 변경할 필드가 담긴 객체를 넣어주세요. 응답 전체를 바꾸려면 Mock을 선택하세요.",
    );
  const status = Number($("#mock-status").value);
  if (
    editorMode === "mock" &&
    (!Number.isInteger(status) || status < 200 || status > 599)
  )
    throw new Error("HTTP 상태는 200부터 599 사이의 정수로 입력해 주세요.");
  return { data, status };
}
function commandFor(data, status) {
  return `test.${editorMode}(${JSON.stringify(apiPath)}, ${JSON.stringify(data, null, 2)}${editorMode === "mock" && status !== 200 ? `, { status: ${status} }` : ""})`;
}
function updateCommand() {
  try {
    const { data, status } = readEditor();
    $("#editor-command").textContent = commandFor(data, status);
  } catch {
    $("#editor-command").textContent =
      "유효한 JSON을 입력하면 명령이 표시됩니다.";
  }
}
function setEditorMode(mode) {
  editorMode = mode;
  $("#choose-patch").setAttribute("aria-pressed", String(mode === "patch"));
  $("#choose-mock").setAttribute("aria-pressed", String(mode === "mock"));
  $("#status-label").hidden = mode !== "mock";
  $("#editor-hint").textContent =
    mode === "patch"
      ? "실제 응답에 이 필드만 덮어씁니다. 중첩 객체·배열은 통째로 교체합니다."
      : "실제 요청 없이 입력한 JSON과 HTTP 상태를 그대로 반환합니다.";
  clearError();
  updateCommand();
}
$("#choose-patch").addEventListener("click", () => setEditorMode("patch"));
$("#choose-mock").addEventListener("click", () => setEditorMode("mock"));
$("#json-input").addEventListener("input", () => {
  clearError();
  updateCommand();
});
$("#mock-status").addEventListener("input", () => {
  clearError();
  updateCommand();
});
$("#json-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    $("#editor-form").requestSubmit();
  }
});
$("#editor-form").addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();
  try {
    const { data, status } = readEditor();
    if (editorMode === "mock") debug.mock(apiPath, data, { status });
    else debug.patch(apiPath, data);
    updateCommand();
  } catch (error) {
    showError(error);
  }
});
$("#reset").addEventListener("click", () => debug.clear());
$("#refetch").addEventListener("click", () => scheduleRefresh());
for (const button of document.querySelectorAll("[data-preset]"))
  button.addEventListener("click", () => {
    const mode = button.dataset.preset;
    setEditorMode(mode === "patch" ? "patch" : "mock");
    $("#json-input").value = JSON.stringify(
      mode === "patch"
        ? { discount: 10, total: 32 }
        : mode === "empty"
          ? { items: [], total: 0 }
          : { message: "잠시 후 다시 시도해 주세요." },
      null,
      2,
    );
    $("#mock-status").value = mode === "error" ? "503" : "200";
    updateCommand();
    debug.reset();
    debug.story(
      { empty: "cart.empty", error: "cart.error", patch: "cart.discount" }[
        mode
      ],
    );
  });
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    $("#copy-status").textContent =
      "복사했습니다. 개발자 도구의 Console에 붙여넣고 실행하세요.";
  } catch {
    $("#copy-status").textContent =
      "자동 복사를 사용할 수 없습니다. 위 명령을 선택해서 복사해 주세요.";
  }
}
$("#copy-quick").addEventListener("click", () => copy(quickCommand));
$("#copy-editor").addEventListener("click", () => {
  try {
    const { data, status } = readEditor();
    copy(commandFor(data, status));
  } catch (error) {
    showError(error);
  }
});

function currentState() {
  const override = runtime
    .overrides()
    .find((item) => item.path === apiPath && item.method === "GET");
  if (override)
    return {
      mode: "custom",
      transport: override.mode,
      label: `${override.mode.toUpperCase()} · CUSTOM`,
    };
  const active = runtime.active();
  if (active.includes(entry(apiPath, "empty")))
    return { mode: "empty", transport: "mock", label: "MOCK · EMPTY" };
  if (active.includes(entry(apiPath, "error")))
    return { mode: "error", transport: "mock", label: "MOCK · 503" };
  if (active.includes(entry(apiPath, "discount")))
    return { mode: "patch", transport: "patch", label: "PATCH · DISCOUNT" };
  return { mode: "real", transport: "http", label: "SAMPLE API" };
}
function renderCart(data, ok) {
  const cart = $("#cart");
  cart.replaceChildren();
  const state = (title, description, error = false) => {
    const box = el("div", undefined, error ? "error" : "empty");
    box.append(
      el("div", error ? "!" : "＋", "state-icon"),
      el("h3", title),
      el("p", description),
    );
    cart.append(box);
  };
  if (!ok) {
    state(
      "잠깐, 다시 시도해 볼까요?",
      typeof data?.message === "string"
        ? data.message
        : "앱이 오류 응답을 받았습니다.",
      true,
    );
    return;
  }
  if (
    data === null ||
    typeof data !== "object" ||
    !Array.isArray(data.items) ||
    !Number.isFinite(data.total) ||
    data.items.some(
      (item) =>
        !item || typeof item.name !== "string" || !Number.isFinite(item.price),
    )
  ) {
    state(
      "앱이 처리할 수 없는 응답입니다.",
      "이 예제는 items 배열(name, price)과 숫자 total을 사용합니다. 받은 응답은 아래에서 확인할 수 있습니다.",
      true,
    );
    return;
  }
  if (!data.items.length) {
    state(
      "장바구니가 비어 있습니다.",
      "마음에 드는 첫 번째 상품을 담아보세요.",
    );
    return;
  }
  cart.append(el("h3", "Your everyday essentials"));
  for (const [index, item] of data.items.entries()) {
    const row = el("div", undefined, "item");
    row.append(
      el("span", String(index + 1).padStart(2, "0"), "item-index"),
      el("span", item.name, "item-name"),
      el("span", money(item.price), "price"),
    );
    cart.append(row);
  }
  const total = el("div", undefined, "total");
  total.append(el("span", "Total"), el("span", money(data.total)));
  cart.append(total);
  if (Number.isFinite(data.discount) && data.discount !== 0)
    cart.append(
      el("span", `${money(data.discount)} discount applied`, "discount"),
    );
}
function addLog(state, status, elapsed) {
  const li = el("li");
  li.append(
    el("span", state.transport.toUpperCase(), "log-mode"),
    el("span", `GET · ${status}`),
    el("span", `${Math.round(elapsed)} ms`, "time"),
  );
  $("#requests").prepend(li);
  while ($("#requests").children.length > 5)
    $("#requests").lastElementChild.remove();
}
function scheduleRefresh() {
  if (scheduled || disposed) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    if (!disposed) refresh();
  });
}
async function refresh() {
  const requestNumber = ++sequence;
  pending?.abort();
  pending = new AbortController();
  const state = currentState();
  const enabled = debug.isEnabled();
  $("#runtime-state").textContent = enabled
    ? "● Test mode 켜짐"
    : "● Test mode 꺼짐";
  $("#runtime-state").classList.toggle("on", enabled);
  $("#status-badge").textContent = state.label;
  $("#http-status").textContent = "요청 중…";
  const started = performance.now();
  try {
    const response = await fetch(apiPath, {
      cache: "no-store",
      signal: pending.signal,
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    if (requestNumber !== sequence || disposed) return;
    $("#http-status").textContent =
      `${response.status} ${response.statusText}`.trim();
    $("#payload").textContent =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);
    $("#transport").textContent = {
      mock: "Mock · 네트워크 요청 없음",
      patch: "Patch · HTTP 응답의 필드 변경",
      http: "Sample API · 원본 HTTP 응답",
    }[state.transport];
    renderCart(data, response.ok);
    addLog(state, response.status, performance.now() - started);
  } catch (error) {
    if (requestNumber !== sequence || disposed) return;
    $("#http-status").textContent = "요청 실패";
    $("#payload").textContent = error.message;
    $("#transport").textContent =
      "응답을 처리하지 못했습니다. JSON 또는 연결을 확인하세요.";
    renderCart({ message: error.message }, false);
    addLog(state, "ERROR", performance.now() - started);
  }
  $("#request-count").textContent = `HTTP ${networkRequests}회`;
  document.body.dataset.ready = state.mode;
}
const unsubscribe = runtime.subscribe(scheduleRefresh);
window.addEventListener(
  "pagehide",
  (event) => {
    if (event.persisted) return;
    disposed = true;
    pending?.abort();
    unsubscribe();
    stopOverlay();
    stopFetch();
  },
  { once: true },
);
console.info(
  "[test mode] Console에서 아래 명령의 값을 바꿔 실행하세요. 이 데모는 변경 후 자동으로 API를 다시 요청합니다.",
);
console.info(quickCommand);
console.info(
  "test() → 도움말 | test.overrides() → 현재 값 | test.clear() → 원래 응답",
);
updateCommand();
scheduleRefresh();
