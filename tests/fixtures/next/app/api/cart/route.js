export function GET() {
  return Response.json({ total: 42, items: [{ name: "Original", price: 42 }] });
}
