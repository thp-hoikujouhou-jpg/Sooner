/**
 * User UI language preference.
 * Stored in both localStorage (per-origin) and a `.sooner.sh` cookie (cross-subdomain).
 * The cookie allows language to persist across signin, signup, app, and site subdomains.
 */

export const SOONER_LANG_KEY = "sooner_language";
const LEGACY_LANG_KEY = "aether_language";
const COOKIE_NAME = "sooner_lang";

function readCookie(): "en" | "ja" | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const v = m?.[1];
  if (v === "en" || v === "ja") return v;
  return null;
}

function writeCookie(lang: "en" | "ja") {
  if (typeof document === "undefined") return;
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const domain = isLocal ? "" : "; domain=.sooner.sh";
  document.cookie = `${COOKIE_NAME}=${lang}; path=/${domain}; max-age=31536000; SameSite=Lax`;
}

export function readStoredLanguage(): "en" | "ja" {
  if (typeof localStorage === "undefined") return readCookie() ?? "en";

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
  if (typeof localStorage !== "undefined") localStorage.setItem(SOONER_LANG_KEY, lang);
  writeCookie(lang);
}
