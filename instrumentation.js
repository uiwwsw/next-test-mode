export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setupNextTestMode } = await import("./dist/next.js");
    // This public playground only changes its own sample API.
    setupNextTestMode({ enabled: true, allowedPaths: ["/api/cart.json"] });
  }
}
