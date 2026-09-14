// Ordinary SSR: no test-mode import or custom fetch.
export default async function Page() {
  const cart = await (
    await fetch("http://127.0.0.1:4181/api/cart", { cache: "no-store" })
  ).json();
  return (
    <main>
      <h1>SSR cart</h1>
      <strong data-total>{cart.total}</strong>
      <pre data-cart>{JSON.stringify(cart)}</pre>
    </main>
  );
}
