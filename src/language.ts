/** User UI language preference (localStorage). Legacy `aether_language` is migrated once. */

export const SOONER_LANG_KEY = "sooner_language";
const LEGACY_LANG_KEY = "aether_language";

export function readStoredLanguage(): "en" | "ja" {
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

export function writeStoredLanguage(lang: "en" | "ja") {
  localStorage.setItem(SOONER_LANG_KEY, lang);
}
