import { cp, mkdir, rm } from "node:fs/promises";
await mkdir("public/api", { recursive: true });
await cp("examples/browser/api/cart.json", "public/api/cart.json");
await rm("public/playground", { recursive: true, force: true });
await cp("examples/browser", "public/playground", {
  recursive: true,
  filter: (path) => !path.endsWith("README.md"),
});
await cp("dist", "public/playground/dist", {
  recursive: true,
  filter: (path) => !path.endsWith(".ts") && !path.endsWith(".map"),
});
