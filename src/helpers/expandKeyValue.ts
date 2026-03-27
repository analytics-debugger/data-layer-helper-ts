import type { PlainObject } from "./types";

/**
 * Expands a dot-notation key into a nested object.
 * e.g. expandKeyValue('a.b.c', 1) => { a: { b: { c: 1 } } }
 */
export function expandKeyValue(key: string, value: unknown): PlainObject {
  const result: PlainObject = {};
  let target: PlainObject = result;
  const parts = key.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]] = {} as PlainObject;
  }
  target[parts[parts.length - 1]] = value;
  return result;
}
