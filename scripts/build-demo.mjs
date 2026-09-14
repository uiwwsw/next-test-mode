import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
const output = resolve("demo-dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp("examples/browser", output, {
  recursive: true,
  filter: (source) => !source.endsWith("README.md"),
});
await cp("dist", resolve(output, "dist"), {
  recursive: true,
  filter: (source) => !source.endsWith(".map") && !source.endsWith(".ts"),
});
console.log(
  "Built standalone playground in demo-dist (relative URLs, static sample API).",
);
