import { siteUrl } from '../demo-components/seo.js';
export default function robots() {
  return { rules: [{ userAgent: ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot"], disallow: "/" },{ userAgent: '*', allow: '/', disallow: ['/api/'] }], sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl };
}
