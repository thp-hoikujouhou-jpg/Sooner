/**
 * Records the user's choice about cross-subdomain language cookies vs local-only storage.
 * Stored in localStorage (always) so we do not show the banner repeatedly.
 */

export const STORAGE_CONSENT_KEY = "sooner_storage_consent";
export type StorageConsentLevel = "all" | "essential";

const COOKIE_NAME = "sooner_lang";
const LANG_KEY = "sooner_language";

function parseLangCookie(): "en" | "ja" | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const v = m?.[1];
  if (v === "en" || v === "ja") return v;
  return null;
}

export function getStorageConsent(): StorageConsentLevel | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(STORAGE_CONSENT_KEY);
  if (v === "all" || v === "essential") return v;
  return null;
}

export function setStorageConsent(level: StorageConsentLevel): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_CONSENT_KEY, level);
}

/**
 * Existing visitors already had language in cookie or localStorage before the consent UI existed;
 * treat that as acceptance so we do not nag them.
 */
export function ensureStorageConsentMigrated(): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(STORAGE_CONSENT_KEY)) return;
  if (parseLangCookie() !== null || localStorage.getItem(LANG_KEY)) {
    localStorage.setItem(STORAGE_CONSENT_KEY, "all");
  }
}

export function clearCrossSubdomainLangCookie(): void {
  if (typeof document === "undefined") return;
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const domain = isLocal ? "" : "; domain=.sooner.sh";
  document.cookie = `${COOKIE_NAME}=; path=/${domain}; max-age=0`;
}
