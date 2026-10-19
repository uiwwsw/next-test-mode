import { pageMetadata } from "../../../../demo-components/seo.js";
export const metadata = pageMetadata("en", "/csr");
import Playground from "../../../../demo-components/Playground.jsx";
export default function Page() {
  return <Playground pagePath="/csr" locale="en" mode="CSR" />;
}
