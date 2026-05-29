/**
 * Resolves the public base URL for server-generated links (e.g. email
 * verification). Priority:
 *   1. APP_URL — explicit override (set this to your custom domain in prod).
 *   2. VERCEL_PROJECT_PRODUCTION_URL — stable production domain on Vercel.
 *   3. VERCEL_URL — the current deployment's URL (preview deploys).
 *   4. localhost — local dev fallback.
 */
export function getAppUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod}`;

  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return `https://${deployment}`;

  return "http://localhost:3000";
}
