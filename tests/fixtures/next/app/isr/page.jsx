export const revalidate = 3600;
export default async function Page() {
  const cart = await (
    await fetch("http://127.0.0.1:4181/api/cart", {
      next: { revalidate: 3600 },
    })
  ).json();
  return (
    <main>
      <h1>ISR</h1>
      <strong data-total>{cart.total}</strong>
      <pre data-cart>{JSON.stringify(cart)}</pre>
      <span data-render>{Math.random()}</span>
    </main>
  );
}
