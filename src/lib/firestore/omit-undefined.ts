/**
 * Firestore rejeita `undefined` em setDoc/updateDoc.
 * Remove chaves com valor undefined em profundidade (ex.: metadata nested).
 */
export function omitUndefined<T>(input: T): T {
  if (input === null || typeof input !== "object") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => omitUndefined(item)) as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined) continue;
    out[key] =
      value !== null && typeof value === "object"
        ? omitUndefined(value)
        : value;
  }
  return out as T;
}
