export async function generateStaticParams() {
  const ids = await (await fetch("http://127.0.0.1:4181/api/ids")).json();
  return ids.map((id) => ({ id }));
}
export default async function Page() {
  const cart = await (
    await fetch("http://127.0.0.1:4181/api/cart", { cache: "force-cache" })
  ).json();
  return (
    <main>
      <strong data-total>{cart.total}</strong>
      <span data-render>{Math.random()}</span>
    </main>
  );
}
