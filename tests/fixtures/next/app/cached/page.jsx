import { unstable_cache } from "next/cache";
const load = unstable_cache(
  async () => ({
    cart: await (await fetch("http://127.0.0.1:4181/api/cart")).json(),
    render: Math.random(),
  }),
  ["cart"],
);
export default async function Page() {
  const { cart, render } = await load();
  return (
    <main>
      <strong data-total>{cart.total}</strong>
      <span data-render>{render}</span>
    </main>
  );
}
