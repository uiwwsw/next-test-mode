export const siteUrl = 'https://next-test-mode.vercel.app';
export const routes = [''];
export function pageMetadata(locale = 'ko', path = '') {
  const en = locale === 'en';
  const label = '';
  // Compatibility rendering routes share the same demo UI; consolidate search signals.
  path = '';
  const title = en
    ? `${label}Next Test Mode — Next.js API Mocking & Fetch Testing`
    : `${label}넥스트 테스트모드 — Next.js API 모킹·fetch 테스트`;
  const description = en
    ? 'Mock and patch fetch responses from DevTools without changing API calls. Preview server-rendered and static Next.js pages in your own development or QA session.'
    : 'API 호출 코드 수정 없이 콘솔에서 fetch 응답과 화면 상태를 재현하세요. 서버·정적 페이지도 내 개발·QA 세션에서 mock·patch로 확인합니다.';
  const url = `${siteUrl}${en ? '/en' : ''}${path}`;
  return {
    metadataBase: new URL(siteUrl), title, description,
    verification: { other: { 'naver-site-verification': 'c2c4f0c55ff6a540df8b6d5ed9f07dc657a581b9' } },
    keywords: ['Next Test Mode', '테스트모드', '넥스트 테스트모드', 'Next.js 테스트', 'API 모킹', 'fetch 응답 변경', '프론트엔드 QA', 'Next.js API mocking', 'fetch mock', 'API response patching', 'SSR testing', 'SSG preview', 'Draft Mode', 'frontend testing tools'],
    alternates: { canonical: url, languages: { ko: `${siteUrl}${path}`, en: `${siteUrl}/en${path}`, 'x-default': `${siteUrl}/en${path}` } },
    openGraph: { type: 'website', siteName: 'Next Test Mode', title, description, url, locale: en ? 'en_US' : 'ko_KR', alternateLocale: en ? ['ko_KR'] : ['en_US'], images: [{ url: '/social-card.png', width: 1200, height: 630, alt: 'Next Test Mode — One console. Server data, too.' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/social-card.png'] },
    robots: { index: true, follow: true },
  };
}
