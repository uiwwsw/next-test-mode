import { createServer } from "node:http";
createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.end(
    JSON.stringify(
      request.url === "/api/ids"
        ? ["one"]
        : { total: 42, items: [{ name: "Original", price: 42 }] },
    ),
  );
}).listen(4181, "127.0.0.1", () => console.log("Fixture upstream ready"));
