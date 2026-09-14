async function load() {
  "use cache";
  return {
    cart: await (await fetch("http://127.0.0.1:4181/api/cart")).json(),
    render: Math.random(),
  };
}
export default async function Page() {
  const { cart, render } = await load();
  return (
    <main>
      <strong data-total>{cart.total}</strong>
      <span data-render>{render}</span>
    </main>
  );
}
