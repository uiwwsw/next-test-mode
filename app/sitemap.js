import { siteUrl, routes } from '../demo-components/seo.js';
export default function sitemap() {
  return routes.flatMap((path) => ['ko', 'en'].map((locale) => ({
    url: `${siteUrl}${locale === 'en' ? '/en' : ''}${path}`,
    alternates: { languages: { ko: `${siteUrl}${path}`, en: `${siteUrl}/en${path}`, 'x-default': `${siteUrl}/en${path}` } },
  })));
}
