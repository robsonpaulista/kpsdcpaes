/**
 * Strip surrounding quotes from env values.
 * Next.js does this for .env; Node --env-file and some loaders keep them.
 */
export function stripEnvQuotes(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
