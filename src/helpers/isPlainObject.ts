import type { PlainObject } from "./types";
import { typeOf } from "./typeOf";

export function isPlainObject(value: unknown): value is PlainObject {
  if (!value || typeOf(value) !== "object") return false;
  try {
    const proto = Object.getPrototypeOf(value);
    if (proto === null) return true;
    if (proto.constructor && typeof proto.constructor === "function") {
      return proto.constructor === Object;
    }
  } catch {
    return false;
  }
  return false;
}
