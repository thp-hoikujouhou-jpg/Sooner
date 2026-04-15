/**
 * User UI language preference.
 * Stored in localStorage (per-origin). With consent "all", also a `.sooner.sh` cookie for cross-subdomain language.
 */

import {
  clearCrossSubdomainLangCookie,
  ensureStorageConsentMigrated,
  getStorageConsent,
} from "./storageConsent";

export const SOONER_LANG_KEY = "sooner_language";
const LEGACY_LANG_KEY = "aether_language";
const COOKIE_NAME = "sooner_lang";

function readCookie(): "en" | "ja" | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const v = m?.[1];
  if (v === "ja" || v === "en") return v;
  return null;
}

function writeCookie(lang: "en" | "ja") {
  if (typeof document === "undefined") return;
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const domain = isLocal ? "" : "; domain=.sooner.sh";
  document.cookie = `${COOKIE_NAME}=${lang}; path=/${domain}; max-age=31536000; SameSite=Lax`;
}

function readLocalLangOnly(): "en" | "ja" {
  if (typeof localStorage === "undefined") return "en";
  const v = localStorage.getItem(SOONER_LANG_KEY);
  if (v === "ja" || v === "en") return v;
  const legacy = localStorage.getItem(LEGACY_LANG_KEY);
  if (legacy === "ja" || legacy === "en") {
    localStorage.setItem(SOONER_LANG_KEY, legacy);
    localStorage.removeItem(LEGACY_LANG_KEY);
    return legacy;
  }
  return "en";
}

export function readStoredLanguage(): "en" | "ja" {
  ensureStorageConsentMigrated();
  const consent = getStorageConsent();

  if (typeof localStorage === "undefined") {
    if (consent === "essential") return "en";
    return readCookie() ?? "en";
  }

  if (consent === "essential") {
    return readLocalLangOnly();
  }

  if (consent === null) {
    return readLocalLangOnly();
  }

  const v = localStorage.getItem(SOONER_LANG_KEY);
  if (v === "ja" || v === "en") return v;

  const fromCookie = readCookie();
  if (fromCookie) {
    localStorage.setItem(SOONER_LANG_KEY, fromCookie);
    return fromCookie;
  }

  const legacy = localStorage.getItem(LEGACY_LANG_KEY);
  if (legacy === "ja" || legacy === "en") {
    localStorage.setItem(SOONER_LANG_KEY, legacy);
    localStorage.removeItem(LEGACY_LANG_KEY);
    writeCookie(legacy);
    return legacy;
  }
  return "en";
}

export function writeStoredLanguage(lang: "en" | "ja") {
  ensureStorageConsentMigrated();
  const consent = getStorageConsent();
  if (typeof localStorage !== "undefined") localStorage.setItem(SOONER_LANG_KEY, lang);
  if (consent === "all") {
    writeCookie(lang);
  } else {
    clearCrossSubdomainLangCookie();
  }
}

/** After user clicks Accept on the storage banner; sync cookie from current localStorage language. */
export function syncLangCookieAfterConsentAccepted(): void {
  ensureStorageConsentMigrated();
  if (getStorageConsent() !== "all") return;
  const v = typeof localStorage !== "undefined" ? localStorage.getItem(SOONER_LANG_KEY) : null;
  const lang = v === "ja" || v === "en" ? v : "en";
  writeCookie(lang);
}
