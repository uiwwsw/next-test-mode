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

// Share previews use a committed image, so deployments do not depend on GitHub.
await cp("docs/assets/social-card.png", "public/social-card.png");

await cp("docs/verification", "public", { recursive: true });

// Demo fonts are source assets; public/ is generated and ignored.
await cp("docs/assets/fonts", "public/fonts", { recursive: true });

for (const asset of ['favicon.svg', 'favicon-96.png', 'apple-touch-icon.png']) {
  await cp(`docs/assets/${asset}`, `public/${asset}`);
}

for (const asset of ['usage-analytics.js','usage-analytics.css']) await cp(`demo-components/analytics/${asset}`,`public/${asset}`);
const {readFile,writeFile}=await import('node:fs/promises');
const {usageTag}=await import('../demo-components/analytics/config.mjs');
const playground=await readFile('public/playground/index.html','utf8');
await writeFile('public/playground/index.html',playground.replace('</head>',()=>usageTag()+'</head>'));
