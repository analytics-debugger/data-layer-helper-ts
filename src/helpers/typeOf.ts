export function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (value instanceof RegExp) return "regexp";
  if (typeof value === "object" && Object.prototype.toString.call(value) === "[object Arguments]")
    return "arguments";
  return typeof value;
}
