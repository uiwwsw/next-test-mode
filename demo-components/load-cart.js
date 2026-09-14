// Ordinary application fetch: no test-mode import or custom transport.
export async function loadCart(options) {
  const response = await fetch(
    "https://test-mode-tau.vercel.app/api/cart.json",
    options,
  );
  return { data: await response.json(), status: response.status };
}
