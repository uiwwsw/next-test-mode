import { defineMock, definePatch, defineStory } from "../../dist/core.js";

// This catalog is shared by the browser and server; mutable runtimes are not.
export const catalog = {
  storageKey: "test-mode.ssr-example",
  definitions: [
    defineMock("/api/cart", () => ({ items: [], total: 0 }), {
      caseKey: "empty",
      pages: ["/"],
    }),
  ],
  patchDefinitions: [
    definePatch("/api/cart", (data) => ({ ...data, total: 9.99 }), {
      caseKey: "discount",
      pages: ["/"],
    }),
  ],
  stories: [
    defineStory({
      key: "cart.discount",
      title: "Discount",
      description: "Keep the real products and change the total to 9.99.",
      entries: ["/api/cart:discount"],
      pages: ["/"],
    }),
    defineStory({
      key: "cart.empty",
      title: "Empty cart",
      description: "Return an empty cart without an upstream request.",
      entries: ["/api/cart:empty"],
      pages: ["/"],
    }),
  ],
};
