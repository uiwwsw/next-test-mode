import Playground from "../../demo-components/Playground.jsx";
import { loadCart } from "../../demo-components/load-cart.js";
export const revalidate = 60;
export default async function Page() {
  const result = await loadCart({ next: { revalidate: 60 } });
  return (
    <Playground
      mode="ISR"
      initial={result}
      renderedAt={new Date().toISOString()}
    />
  );
}
