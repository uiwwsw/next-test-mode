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
        <main>{children}</main>
        <footer className="site-footer">
          <strong>Next.js App Router · Node runtime</strong>
          <p>
            {locale === "en" ? "A public sample for development and QA. Test values only affect this demo session." : "이 사이트는 테스트용 공개 샘플입니다. 다른 앱의 데이터에는 영향을 주지 않습니다."}
          </p>
          <a href="https://github.com/uiwwsw/next-test-mode/blob/main/README.md#rendering-support">
            {locale === "en" ? "How it works — README ↗" : "동작 원리와 지원 범위는 README에서 ↗"}
          </a>
        </footer>
      </body>
    </html>
  );
}
