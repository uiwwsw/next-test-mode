import { chromium, expect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
const output = resolve("docs/assets");
const frames = resolve("test-results/doc-frames");
await mkdir(frames, { recursive: true });
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "4174"],
  { stdio: ["ignore", "pipe", "inherit"] },
);
let browser;
try {
  await new Promise((ok, fail) => {
    server.once("error", fail);
    server.once("exit", (code) => fail(new Error(`Next exited: ${code}`)));
    server.stdout.on("data", (data) => {
      if (data.toString().includes("Ready")) ok();
    });
  });
  browser = await chromium.launch();
  const hero = await browser.newPage({
    viewport: { width: 1200, height: 360 },
    deviceScaleFactor: 2,
  });
  await hero.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${await readFile(resolve(output, "hero.svg"), "utf8")}`,
  );
  await hero.screenshot({
    path: resolve(output, "hero.png"),
    omitBackground: true,
  });
  await hero.close();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1100 },
    deviceScaleFactor: 1,
  });
  await page.goto("http://127.0.0.1:4174/ssg");
  const ready = () =>
    expect(
      page.getByRole("button", { name: "적용하고 화면 확인" }),
    ).toBeEnabled();
  const capture = (name) =>
    page
      .locator(".playground")
      .screenshot({ path: resolve(frames, `${name}.png`) });
  await ready();
  await expect(page.locator("[data-demo-total]")).toHaveText("42");
  await capture("real");
  await page.evaluate(() =>
    window.test.patch("/api/cart.json", { total: 9.99 }),
  );
  await expect(page.locator("[data-demo-total]")).toHaveText("9.99");
  await ready();
  await capture("patch");
  await page.screenshot({
    path: resolve(output, "playground.png"),
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:4174/ssr");
  await ready();
  await expect(page.locator("[data-demo-total]")).toHaveText("9.99");
  await capture("server");
  await page.evaluate(() =>
    window.test.mock(
      "/api/cart.json",
      { message: "Try again" },
      { status: 503 },
    ),
  );
  await expect(page.getByText("HTTP 503", { exact: true })).toBeVisible();
  await ready();
  await capture("error");
  await page.evaluate(() => window.test.clear());
  await expect(page.locator("[data-demo-total]")).toHaveText("42");
  await ready();
  await capture("reset");
  execFileSync(
    "python3",
    [
      "-c",
      `
from PIL import Image
from pathlib import Path
import sys
frames=[Image.open(Path(sys.argv[1])/(name+'.png')).convert('RGB') for name in ['real','patch','server','error','reset']]
w=max(f.width for f in frames); h=max(f.height for f in frames)
normalized=[]
for frame in frames:
 canvas=Image.new('RGB',(w,h),'#f6f8f4'); canvas.paste(frame,(0,0)); normalized.append(canvas)
normalized[0].save(sys.argv[2],save_all=True,append_images=normalized[1:],duration=[1800,2600,2600,2400,1800],loop=0,optimize=True)
`,
      frames,
      resolve(output, "scenarios.gif"),
    ],
    { stdio: "inherit" },
  );
  console.log(
    "Rendered Next Test Mode hero, real production playground and animated SSG/SSR Console demo.",
  );
} finally {
  await browser?.close();
  server.kill();
}
