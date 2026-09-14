import {
  createTestMode,
  installMockFetch,
  installTestModeOverlay,
} from "../../dist/index.js";
import { catalog } from "./scenarios.mjs";

const runtime = createTestMode({ ...catalog, enabled: true });
const stopFetch = installMockFetch(runtime);
const stopOverlay = installTestModeOverlay(runtime);
window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  stopFetch();
  stopOverlay();
});
