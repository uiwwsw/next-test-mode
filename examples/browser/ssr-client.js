import { setupTestMode } from "./dist/index.js";

const { runtime, stop } = setupTestMode({ enabled: true, ssr: true });
const input = document.querySelector("#ssr-input");
const status = document.querySelector("#ssr-status");
const error = document.querySelector("#ssr-error");
let mode = "patch";
const setMode = next => {
  mode = next;
  document.querySelector("#ssr-patch").setAttribute("aria-pressed", String(mode === "patch"));
  document.querySelector("#ssr-mock").setAttribute("aria-pressed", String(mode === "mock"));
  document.querySelector("#ssr-status-label").hidden = mode !== "mock";
};
const active = runtime.overrides().find(item => item.path === "/api/cart.json" && item.method === "GET");
if (active) {
  input.value = JSON.stringify(active.data, null, 2);
  status.value = String(active.status ?? 200);
  setMode(active.mode);
}
document.querySelector("#ssr-patch").onclick = () => setMode("patch");
document.querySelector("#ssr-mock").onclick = () => setMode("mock");
document.querySelector("#ssr-clear").onclick = () => runtime.clear();
document.querySelector("#ssr-form").onsubmit = event => {
  event.preventDefault();
  try {
    const data = JSON.parse(input.value);
    if (mode === "mock") runtime.setMock("/api/cart.json", data, { status: Number(status.value) });
    else runtime.setPatch("/api/cart.json", data);
    error.hidden = true;
  } catch (caught) { error.textContent = caught.message; error.hidden = false; }
};
window.addEventListener("pagehide", event => { if (!event.persisted) stop(); });
