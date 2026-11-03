import { siteUrl } from '../demo-components/seo.js';
export default function robots() {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }], sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl };
}
