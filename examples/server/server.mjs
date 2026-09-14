import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServerTestMode } from "../../dist/server.js";
import { catalog } from "./scenarios.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const dist = resolve(root, "dist");
const upstream = {
  items: [{ name: "Original product", price: 42 }],
  total: 42,
};
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

// Local runnable example; the public Vercel playground remains a static CSR demo.
export const createSSRDemoServer = () => {
  const server = createServer(async (request, response) => {
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      if (pathname === "/api/cart") {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(upstream));
        return;
      }
      if (
        pathname.startsWith("/dist/") ||
        [
          "/examples/server/client.mjs",
          "/examples/server/scenarios.mjs",
        ].includes(pathname)
      ) {
        const file = resolve(root, `.${pathname}`);
        if (
          pathname.startsWith("/dist/") &&
          (!file.startsWith(`${dist}${sep}`) || !file.endsWith(".js"))
        ) {
          response.writeHead(404).end();
          return;
        }
        response.setHeader("Content-Type", "text/javascript");
        response.end(await readFile(file));
        return;
      }
      if (pathname !== "/") {
        response.writeHead(404).end();
        return;
      }
      // A fresh runtime and counters for every incoming HTML request.
      const { fetch: serverFetch } = createServerTestMode({
        ...catalog,
        enabled: true,
        cookieHeader: request.headers.cookie ?? null,
      });
      const address = server.address();
      const cart = await (
        await serverFetch(`http://127.0.0.1:${address.port}/api/cart`, {
          cache: "no-store",
        })
      ).json();
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(`<!doctype html><html lang="ko"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>test mode · SSR example</title>
<style>body{font:18px/1.7 system-ui;max-width:760px;margin:60px auto;padding:0 24px;color:#173c36}pre{padding:20px;background:#eef5f0;overflow:auto}strong{font-size:32px}</style>
<h1>이 가격은 서버가 HTML에 넣었습니다.</h1>
<p>SSR total: <strong data-ssr-total>${escapeHtml(cart.total)}</strong></p>
<pre data-ssr-payload>${escapeHtml(JSON.stringify(cart, null, 2))}</pre>
<p>Console에서 서버에도 등록된 시나리오를 선택한 뒤 새로고침하세요.</p>
<pre>test.story('cart.discount'); location.reload()
test.story('cart.empty'); location.reload()
test.clear(); location.reload()</pre>
<p><code>test.patch()</code>로 직접 입력한 값은 브라우저에만 남습니다.
SSR은 공유된 시나리오 선택 쿠키를 다음 요청에서 읽습니다.</p>
<script type="module" src="/examples/server/client.mjs"></script></html>`);
    } catch (error) {
      response
        .writeHead(error.code === "ENOENT" ? 404 : 500)
        .end("Example request failed");
    }
  });
  return server;
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT ?? 4176);
  createSSRDemoServer().listen(port, "127.0.0.1", () => {
    console.log(`SSR example: http://127.0.0.1:${port}`);
  });
}
