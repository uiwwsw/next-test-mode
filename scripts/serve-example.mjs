import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const content = process.env.DEMO_ROOT
  ? resolve(root, process.env.DEMO_ROOT)
  : resolve(root, "examples/browser");
const base = process.env.DEMO_BASE || "/";
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
};
const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");
  response.setHeader("cache-control", "no-store");
  try {
    if (!pathname.startsWith(base)) throw new Error("Outside demo base");
    const relative = pathname.slice(base.length) || "index.html";
    const directory =
      !process.env.DEMO_ROOT && relative.startsWith("dist/") ? root : content;
    const path = resolve(directory, relative);
    const extension = Object.keys(types).find((ext) => path.endsWith(ext));
    if (!extension || !path.startsWith(directory + sep))
      throw new Error("Not a public file");
    if (directory === root && !path.startsWith(resolve(root, "dist") + sep))
      throw new Error("Outside dist");
    const body = await readFile(path);
    response.writeHead(200, { "content-type": types[extension] });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Example ready at http://127.0.0.1:${port}${base}`),
);
