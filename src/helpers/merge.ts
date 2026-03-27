import type { PlainObject } from "./types";
import { hasOwn } from "./hasOwn";
import { isPlainObject } from "./isPlainObject";
import { isArray } from "./isArray";

/**
 * Deep merge `from` into `to`. Arrays and plain objects merge recursively.
 * Scalars and non-plain objects overwrite.
 * The special `_clear` key prevents merging (overwrites instead).
 */
export function merge(from: PlainObject | unknown[], to: PlainObject | unknown[]): void {
  const allowMerge = !(from as PlainObject)["_clear"];
  for (const key in from) {
    if (hasOwn(from, key)) {
      const fromVal = (from as any)[key];
      if (isArray(fromVal) && allowMerge) {
        if (!isArray((to as any)[key])) (to as any)[key] = [];
        merge(fromVal, (to as any)[key]);
      } else if (isPlainObject(fromVal) && allowMerge) {
        if (!isPlainObject((to as any)[key])) (to as any)[key] = {};
        merge(fromVal, (to as any)[key]);
      } else {
        (to as any)[key] = fromVal;
      }
    }
  }
  delete (to as any)["_clear"];
}
