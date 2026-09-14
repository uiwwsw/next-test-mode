import "./style.css";
export const metadata = {
  title: "Next Test Mode — Same fetch. Every render.",
  description:
    "호출 코드는 그대로. 테스트 데이터는 따로. 콘솔에서 CSR·SSR·ISR·SSG를 확인하세요.",
};
export default function Layout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <a className="brand" href="/">
            next<span>test mode</span>
            <i>0.6</i>
          </a>
          <nav aria-label="프로젝트 링크">
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
            이 사이트는 테스트용 공개 샘플입니다. 다른 앱의 데이터에는 영향을
            주지 않습니다.
          </p>
          <a href="https://github.com/uiwwsw/next-test-mode/blob/main/docs/server-rendering.md">
            동작 원리와 지원 범위 ↗
          </a>
        </footer>
      </body>
    </html>
  );
}
