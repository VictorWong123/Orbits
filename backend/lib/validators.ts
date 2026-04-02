import { z } from "zod";

/**
 * Runs a Zod `safeParse` against `data` and returns either the typed parsed
 * result or the first validation error message as a plain string.
 *
 * Using a string return type keeps server action error handling uniform:
 * callers can do `if (typeof result === "string") return result`.
 *
 * @param schema - Any Zod schema.
 * @param data   - Raw input to validate (typically from FormData fields).
 * @returns Parsed, typed data on success; first error message string on failure.
 */
export function parseOrError<T>(schema: z.ZodSchema<T>, data: unknown): T | string {
  const result = schema.safeParse(data);
  if (!result.success) return result.error.errors[0].message;
  return result.data;
}
