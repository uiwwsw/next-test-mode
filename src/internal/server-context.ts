import { AsyncLocalStorage } from "node:async_hooks";
const bypass = new AsyncLocalStorage<boolean>();
export const isTestModeBypassed = () => bypass.getStore() === true;
/** Control-route authentication and bookkeeping must use real server data. */
export const withoutTestMode = <T>(operation: () => T): T =>
  bypass.run(true, operation);
