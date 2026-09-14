// Optional framework peer. The emitted public API does not depend on its types.
declare module "next/headers" {
  export function headers(): Promise<{ get(name: string): string | null }>;
}
