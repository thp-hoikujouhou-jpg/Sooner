import { useEffect, useState } from "react";
import { getInitialLang, legalDocHref } from "./shared";
import {
  ensureStorageConsentMigrated,
  getStorageConsent,
  setStorageConsent,
  clearCrossSubdomainLangCookie,
} from "./storageConsent";
import { syncLangCookieAfterConsentAccepted } from "./language";

const copy = {
  en: {
    title: "Cookies & local storage",
    body:
      "We use local storage in your browser to remember settings (for example UI language and, in the editor, API preferences you save). If you accept, we also set a first-party cookie on .sooner.sh so your language choice can stay consistent when you move between our subdomains (for example lp.sooner.sh and sooner.sh). If you decline, we only use storage on each hostname separately, so language may not carry over when you switch sites. We do not use this for ads. See our Privacy Policy for details.",
    accept: "Accept",
    deny: "Decline",
    privacy: "Privacy Policy",
  },
  ja: {
    title: "Cookie とローカルストレージ",
    body:
      "ブラウザのローカルストレージに、設定（例：表示言語、エディタで保存する API 設定など）を保存します。同意いただく場合、.sooner.sh 上のファーストパーティ Cookie も設定し、サブドメイン間（例：lp.sooner.sh と sooner.sh）で言語などの選択を揃えやすくします。拒否した場合はホストごとにのみ保存するため、サイトをまたいだときに言語が引き継がれないことがあります。広告目的では使用しません。詳細はプライバシーポリシーをご覧ください。",
    accept: "同意する",
    deny: "拒否する",
    privacy: "プライバシーポリシー",
  },
};

export default function StorageConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    ensureStorageConsentMigrated();
    setShow(getStorageConsent() === null);
  }, []);

  if (!show) return null;

  const lang = getInitialLang();
  const t = copy[lang];
  const privacyHref = `${legalDocHref(lang, "privacy")}#cookies-local-storage`;

  const onAccept = () => {
    setStorageConsent("all");
    syncLangCookieAfterConsentAccepted();
    setShow(false);
  };

  const onDeny = () => {
    setStorageConsent("essential");
    clearCrossSubdomainLangCookie();
    setShow(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4 pointer-events-none flex justify-center sm:justify-end"
      role="dialog"
      aria-labelledby="sooner-storage-consent-title"
      aria-describedby="sooner-storage-consent-desc"
    >
      <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0F0F0F]/95 backdrop-blur-md shadow-2xl shadow-black/40 p-4 sm:p-5 text-[#E4E3E0]">
        <h2 id="sooner-storage-consent-title" className="text-sm font-bold text-white mb-2">
          {t.title}
        </h2>
        <p id="sooner-storage-consent-desc" className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
          {t.body}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <a
            href={privacyHref}
            className="text-xs font-semibold text-[#38BDF8] hover:underline sm:order-none order-3"
          >
            {t.privacy}
          </a>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={onDeny}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-white/[0.12] text-[#A1A1AA] hover:bg-white/[0.04] transition-colors"
            >
              {t.deny}
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#38BDF8] text-black hover:bg-[#7DD3FC] transition-colors"
            >
              {t.accept}
            </button>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-[#52525B] leading-relaxed">
          {lang === "ja"
            ? "English: We use local storage for settings; optional cookie syncs language across .sooner.sh subdomains. See Privacy Policy."
            : "日本語: 設定の保存にローカルストレージを使い、同意時のみ .sooner.sh 間で言語を同期する Cookie を設定します。詳細はプライバシーポリシーへ。"}
        </p>
      </div>
    </div>
  );
}
