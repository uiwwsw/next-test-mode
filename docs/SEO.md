# SEO and localization

Public origin: https://next-test-mode.vercel.app. Korean `/` and English `/en` have their own canonical URL and reciprocal ko/en/x-default language alternatives. Rendering compatibility routes consolidate to the same-language homepage. Sitemap includes both canonical homepages. Robots disallows API routes.

Search intent: Next.js API mocking, fetch response patching, SSR/SSG/ISR testing, frontend QA; Korean equivalents appear in the visible guide and metadata. No claims of production API mutation or universal framework support. Existing demo controls are localized through demo-components/messages.js.

Verify with npm run ci and npm run build:demo, then check public HTML, sitemap, robots and both browser languages. Search Console ownership/submission does not guarantee indexing or ranking.

## 2026-10-20 production verification

Published Korean and English pages, sitemap and Google verification file return HTTP 200. Google Search Console ownership verification and sitemap submission completed. Naver ownership verification and sitemap submission completed (2026-10-20 14:00:04 KST). Site-specific submission status must not be described as indexing completion.

Runtime source baseline: 540782f. GitHub description, homepage and relevant repository topics were updated.
npm run ci and production demo build passed; the workspace deployment completed with all configured public health checks. Existing Korean/English demo controls are preserved.
