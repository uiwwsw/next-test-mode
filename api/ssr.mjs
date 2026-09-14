import { withTestMode } from "../dist/node.js";
import { renderAutomaticPage } from "../examples/server/automatic-page.mjs";

// One server-entry wrapper. The application data fetch below is unchanged.
export default withTestMode(async (_request, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  try {
    const upstream = await fetch("https://test-mode-tau.vercel.app/api/cart.json");
    response.end(renderAutomaticPage(await upstream.json(), upstream.status));
  } catch {
    response.end(renderAutomaticPage({ message: "Sample API is temporarily unavailable." }, 503));
  }
}, { enabled: true, allowedPaths: ["/api/cart.json"] });
