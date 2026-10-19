import { pageMetadata } from "../../../demo-components/seo.js";
export const metadata = pageMetadata("ko", "/isr");
import Playground from "../../../demo-components/Playground.jsx";
import { loadCart } from "../../../demo-components/load-cart.js";
export const revalidate = 60;
export default async function Page() {
  const result = await loadCart({ next: { revalidate: 60 } });
  return (
    <Playground pagePath="/isr" locale="ko"
      mode="ISR"
      initial={result}
      renderedAt={new Date().toISOString()}
    />
  );
}
