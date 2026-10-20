import packageInfo from "../package.json";
import { siteUrl } from "./seo.js";
export default function SiteLayout({ children, locale = "ko" }) {
  return (
    <html lang={locale}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "SoftwareApplication",
          name: "Next Test Mode", applicationCategory: "DeveloperApplication",
          operatingSystem: "Cross-platform", softwareVersion: packageInfo.version,
          url: `${siteUrl}${locale === "en" ? "/en" : ""}`, inLanguage: locale,
          description: locale === "en" ? "Test Next.js fetch responses and page states from the console, with session-scoped server and static previews." : "콘솔에서 Next.js fetch 응답과 화면 상태를 재현하고 서버·정적 페이지도 세션별로 확인하는 개발·QA 도구입니다.",
          sameAs: "https://github.com/uiwwsw/next-test-mode",
          license: "https://github.com/uiwwsw/next-test-mode/blob/main/LICENSE",
          isAccessibleForFree: true
        }) }} />
        <header className="site-header">
          <a className="brand" href={locale === "en" ? "/en" : "/"}>
            next<span>test mode</span>
            <i>1.0</i>
          </a>
          <nav aria-label={locale === "en" ? "Project links" : "프로젝트 링크"}>
            <a href="https://www.npmjs.com/package/@uiwwsw/next-test-mode">
              npm ↗
            </a>
            <a href="https://github.com/uiwwsw/next-test-mode">GitHub ↗</a>
          </nav>
        </header>
        <main>{children}<section className="search-guide" aria-labelledby="search-guide-title">
          <h2 id="search-guide-title">{locale === "en" ? "Next.js API mocking and frontend QA" : "Next.js API 모킹과 프론트엔드 QA"}</h2>
          <p>{locale === "en" ? "Next Test Mode is a fetch mocking and response-patching tool for Next.js development. Reproduce loading, empty, error and custom data states without replacing your existing API client. Explore client rendering and session-scoped server, static and ISR previews in this demo." : "넥스트 테스트모드는 Next.js 개발 중 fetch 응답을 mock·patch하는 테스트 도구입니다. 기존 API 클라이언트를 유지하며 로딩·빈 목록·오류·원하는 데이터 상태를 재현합니다. 데모에서 클라이언트 렌더링과 세션별 서버·정적·ISR 미리보기를 확인하세요."}</p>
          <a href={`https://github.com/uiwwsw/next-test-mode/blob/main/${locale === 'en' ? 'README.md' : 'README.ko.md'}`}>{locale === "en" ? "Installation and supported rendering modes ↗" : "설치와 렌더링 지원 범위 ↗"}</a>
        </section></main>
        <footer className="site-footer">
          <strong>Next.js App Router · Node runtime</strong>
          <p>
            {locale === "en" ? "A public sample for development and QA. Test values only affect this demo session." : "이 사이트는 테스트용 공개 샘플입니다. 다른 앱의 데이터에는 영향을 주지 않습니다."}
          </p>
          <a href="https://github.com/uiwwsw/next-test-mode">
            {locale === "en" ? "How it works — README ↗" : "동작 원리와 지원 범위는 README에서 ↗"}
          </a>
        </footer>
      </body>
    </html>
  );
}
