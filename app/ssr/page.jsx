import Playground from "../../demo-components/Playground.jsx";
import { loadCart } from "../../demo-components/load-cart.js";
export default async function Page() {
  const result = await loadCart({ cache: "no-store" });
  return (
    <Playground
      mode="SSR"
      initial={result}
      renderedAt={new Date().toISOString()}
    />
  );
}
