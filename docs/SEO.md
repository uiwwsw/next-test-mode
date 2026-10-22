# SEO and localization

Public origin: https://next-test-mode.vercel.app. Korean `/` and English `/en` have their own canonical URL and reciprocal ko/en/x-default language alternatives. Rendering compatibility routes consolidate to the same-language homepage. Sitemap includes both canonical homepages. Robots disallows API routes.

Search intent: Next.js API mocking, fetch response patching, SSR/SSG/ISR testing, frontend QA; Korean equivalents appear in the visible guide and metadata. No claims of production API mutation or universal framework support. Existing demo controls are localized through demo-components/messages.js.

Verify with npm run ci and npm run build:demo, then check public HTML, sitemap, robots and both browser languages. Search Console ownership/submission does not guarantee indexing or ranking.
