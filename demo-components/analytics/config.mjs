export const usageConfig = {
  "service": "next-test-mode",
  "origin": "https://next-test-mode.vercel.app",
  "hosts": [
    "next-test-mode.vercel.app"
  ],
  "routes": [
    {
      "match": "^/$",
      "path": "/",
      "name": "ko_home"
    },
    {
      "match": "^/csr/?$",
      "path": "/csr",
      "name": "ko_csr"
    },
    {
      "match": "^/ssr/?$",
      "path": "/ssr",
      "name": "ko_ssr"
    },
    {
      "match": "^/ssg/?$",
      "path": "/ssg",
      "name": "ko_ssg"
    },
    {
      "match": "^/isr/?$",
      "path": "/isr",
      "name": "ko_isr"
    },
    {
      "match": "^/en/?$",
      "path": "/en",
      "name": "en_home"
    },
    {
      "match": "^/en/csr/?$",
      "path": "/en/csr",
      "name": "en_csr"
    },
    {
      "match": "^/en/ssr/?$",
      "path": "/en/ssr",
      "name": "en_ssr"
    },
    {
      "match": "^/en/ssg/?$",
      "path": "/en/ssg",
      "name": "en_ssg"
    },
    {
      "match": "^/en/isr/?$",
      "path": "/en/isr",
      "name": "en_isr"
    },
    {
      "match": "^/playground(?:/index\\.html)?/?$",
      "path": "/playground/",
      "name": "playground"
    }
  ],
  "outbound": [
    {
      "url": "https://github.com/uiwwsw/next-test-mode",
      "name": "github"
    },
    {
      "url": "https://www.npmjs.com/package/@uiwwsw/next-test-mode",
      "name": "npm"
    }
  ]
};
export function usageTag() {
  const data = JSON.stringify(usageConfig).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  return `<script type="module" src="${usageConfig.script || '/usage-analytics.js'}" data-usage-config="${data}"></script>`;
}
