/**
 * Runs once at server startup (not during `next build`). Fails fast in
 * production when required env is missing instead of erroring mid-request;
 * warns in dev so the app still runs before auth is configured.
 */
const REQUIRED_ENV = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_DISCORD_ID",
  "AUTH_DISCORD_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
] as const;

export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length === 0) return;

  const message = `Missing required env vars: ${missing.join(", ")} (see .env.example)`;
  if (process.env.NODE_ENV === "production") throw new Error(message);
  console.warn(`⚠️  ${message} — sign-in will not work until they are set.`);
}
