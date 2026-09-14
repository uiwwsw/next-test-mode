import type { ResponseOverride, ResponseOverrideOptions } from "../types.js";
import { normalizePath } from "./paths.js";

/** Keep console experiments as detached JSON values, never persisted code. */
const copyJSON = (value: unknown): unknown => {
  const ancestors = new Set<object>();
  const copy = (item: unknown): unknown => {
    if (item === null || typeof item === "string" || typeof item === "boolean")
      return item;
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item !== "object" || item === null)
      throw new TypeError("Response overrides require JSON values.");
    if (ancestors.has(item))
      throw new TypeError("Response overrides cannot contain circular values.");
    const array = Array.isArray(item);
    if (
      !array &&
      Object.getPrototypeOf(item) !== Object.prototype &&
      Object.getPrototypeOf(item) !== null
    )
      throw new TypeError("Response overrides require plain JSON objects.");
    ancestors.add(item);
    const output: Record<string, unknown> | unknown[] = array ? [] : {};
    for (const key of Reflect.ownKeys(item)) {
      if (array && key === "length") continue;
      if (typeof key !== "string" || (array && !/^(0|[1-9]\d*)$/.test(key)))
        throw new TypeError("Response overrides require JSON property keys.");
      const descriptor = Object.getOwnPropertyDescriptor(item, key)!;
      if (!("value" in descriptor))
        throw new TypeError(
          "Response overrides cannot contain getters or setters.",
        );
      const cloned = copy(descriptor.value);
      if (descriptor.enumerable)
        Object.defineProperty(output, key, {
          value: cloned,
          writable: true,
          enumerable: true,
          configurable: true,
        });
    }
    if (array && Object.keys(item).length !== item.length)
      throw new TypeError("Response overrides cannot contain sparse arrays.");
    ancestors.delete(item);
    return output;
  };
  return copy(value);
};

export const overridePath = (path: string) => {
  if (
    typeof path !== "string" ||
    !path.trim().startsWith("/") ||
    path.trim().startsWith("//")
  ) {
    throw new TypeError("Use an absolute pathname such as /api/cart.");
  }
  return normalizePath(path);
};

const normalizeMethod = (method = "GET") => {
  if (typeof method !== "string" || !/^[a-z]+$/i.test(method.trim()))
    throw new TypeError("Use an HTTP method such as GET or POST.");
  return method.trim().toUpperCase();
};

export class ResponseOverrides {
  private entries = new Map<string, ResponseOverride>();

  clone() {
    const result = new ResponseOverrides();
    result.entries = new Map(this.entries);
    return result;
  }

  set(
    path: string,
    data: unknown,
    mode: "mock" | "patch",
    options: ResponseOverrideOptions = {},
  ) {
    const normalizedPath = overridePath(path);
    const method = normalizeMethod(options.method);
    const value = copyJSON(data);
    if (
      mode === "patch" &&
      (value === null || typeof value !== "object" || Array.isArray(value))
    ) {
      throw new TypeError(
        "A patch must be a JSON object containing the fields to replace.",
      );
    }
    const status = options.status ?? 200;
    if (!Number.isInteger(status) || status < 200 || status > 599)
      throw new RangeError("Mock status must be an integer from 200 to 599.");
    const statusText =
      options.statusText ??
      (status === 200 ? "OK" : status === 503 ? "Service Unavailable" : "");
    if (
      typeof statusText !== "string" ||
      /[^\x20-\x7e\x80-\xff]/.test(statusText)
    )
      throw new TypeError("Invalid HTTP status text.");
    this.entries.set(`${method} ${normalizedPath}`, {
      path: normalizedPath,
      method,
      mode,
      data: value,
      ...(mode === "mock" ? { status, statusText } : {}),
    });
    return this.list();
  }

  list(): ResponseOverride[] {
    return [...this.entries.values()].map((item) => ({
      ...item,
      data: copyJSON(item.data),
    }));
  }

  find(path: string, method: string): ResponseOverride | undefined {
    const item = this.entries.get(
      `${method.toUpperCase()} ${normalizePath(path)}`,
    );
    return item ? { ...item, data: copyJSON(item.data) } : undefined;
  }

  clear(path?: string, method?: string) {
    const normalizedPath = path === undefined ? undefined : overridePath(path);
    const normalizedMethod =
      method === undefined ? undefined : normalizeMethod(method);
    for (const [key, item] of this.entries) {
      if (
        (normalizedPath === undefined || normalizedPath === item.path) &&
        (normalizedMethod === undefined || normalizedMethod === item.method)
      )
        this.entries.delete(key);
    }
    return this.list();
  }
}
