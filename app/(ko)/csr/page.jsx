import { pageMetadata } from "../../../demo-components/seo.js";
export const metadata = pageMetadata("ko", "/csr");
import Playground from "../../../demo-components/Playground.jsx";
export default function Page() {
  return <Playground pagePath="/csr" locale="ko" mode="CSR" />;
}
