/**
 * CI / production build guard: fail fast with one error line if required VITE_* are missing.
 * Skips when not in CI and REQUIRE_VITE_ENV is unset (local dev keeps working).
 */
const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_BACKEND_URL",
];

const run = process.env.CI === "true" || process.env.REQUIRE_VITE_ENV === "1";
if (!run) {
  process.exit(0);
}

const missing = required.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error(
    `[build] Missing required env (set GitHub Actions secrets or export before build): ${missing.join(", ")}`
  );
  process.exit(1);
}

process.exit(0);
