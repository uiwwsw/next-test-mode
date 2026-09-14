import { chromium, expect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve("docs/assets");
const frames = resolve("test-results/doc-frames");
await mkdir(frames, { recursive: true });
const server = spawn(process.execPath, ["scripts/serve-example.mjs"], {
  env: { ...process.env, PORT: "4174" },
  stdio: ["ignore", "pipe", "inherit"],
});
let browser;
try {
  await new Promise((resolveReady, reject) => {
    server.once("error", reject);
    server.once("exit", (code) =>
      reject(new Error(`Example server exited: ${code}`)),
    );
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Example ready")) resolveReady();
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
    viewport: { width: 1200, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto("http://127.0.0.1:4174/");
  await expect(page.locator("#cart")).toContainText("$42.00");
  const capture = (name) =>
    page.screenshot({ path: resolve(frames, `${name}.png`) });
  await capture("real");
  await page.getByRole("button", { name: "적용하고 테스트 모드 켜기" }).click();
  await expect(page.locator("#cart")).toContainText("$9.99");
  await capture("patch");
  await page.screenshot({ path: resolve(output, "playground.png") });
  await page.getByRole("button", { name: "Mock 응답 전체 교체" }).click();
  await page
    .getByLabel("응답에 적용할 JSON")
    .fill(
      '{\n  "items": [{"name": "내가 만든 상품", "price": 3.14}],\n  "total": 3.14\n}',
    );
  await page.getByRole("button", { name: "적용하고 테스트 모드 켜기" }).click();
  await expect(page.locator("#cart")).toContainText("$3.14");
  await capture("custom");
  await page
    .getByLabel("응답에 적용할 JSON")
    .fill('{\n  "message": "직접 입력한 오류 메시지"\n}');
  await page.locator("#mock-status").fill("503");
  await page.getByRole("button", { name: "적용하고 테스트 모드 켜기" }).click();
  await expect(page.locator("#http-status")).toHaveText(
    "503 Service Unavailable",
  );
  await capture("error");
  await page.getByRole("button", { name: "원래 응답", exact: true }).click();
  await expect(page.locator("#cart")).toContainText("$42.00");
  await capture("reset");
  execFileSync(
    "python3",
    [
      "-c",
      `
from PIL import Image
from pathlib import Path
import sys
frames = [Image.open(Path(sys.argv[1]) / (name + '.png')).convert('RGB') for name in ['real', 'patch', 'custom', 'error', 'reset']]
frames[0].save(sys.argv[2], save_all=True, append_images=frames[1:], duration=[1800,3000,3000,2600,1800], loop=0, optimize=True)
`,
      frames,
      resolve(output, "scenarios.gif"),
    ],
    { stdio: "inherit" },
  );
  console.log(
    "Rendered hero.png, playground.png and scenarios.gif from the working example.",
  );
} finally {
  await browser?.close();
  server.kill();
}
