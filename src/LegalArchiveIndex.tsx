import React from "react";
import { Zap, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { applyDocumentSeo } from "./seo";
import { writeStoredLanguage } from "./language";
import { legalDocHref, navigateToSubdomain, LEGAL_CONTACT_EMAIL } from "./shared";
import { legalMeta } from "./legalContent";
import { LEGAL_SNAPSHOTS } from "./legalArchive";

export default function LegalArchiveIndex({ pathLang }: { pathLang: "en" | "ja" }) {
  const [lang, setLang] = React.useState<"en" | "ja">(pathLang);
  const isProduction = typeof window !== "undefined" && window.location.hostname.endsWith("sooner.sh");
  const meta = legalMeta[lang];
  const t = meta.archiveIndex;

  React.useEffect(() => {
    setLang(pathLang);
  }, [pathLang]);

  React.useEffect(() => {
    applyDocumentSeo({
      lang,
      title: `${t.pageTitle} — Sooner`,
      description: t.pageDesc,
    });
  }, [lang, t.pageTitle, t.pageDesc]);

  const goHome = () => {
    if (isProduction) navigateToSubdomain("site", lang);
    else window.location.href = "/";
  };

  const toggleLang = () => {
    const next = lang === "en" ? "ja" : "en";
    writeStoredLanguage(next);
    setLang(next);
    window.history.replaceState(null, "", `/legal/${next}/archive`);
  };

  const archiveBase = (id: string, doc: "terms" | "privacy") => `/legal/${lang}/archive/${id}/${doc}`;

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full bg-[#38BDF8]/[0.04] blur-[130px]" />
      </div>

      <header className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-4 md:py-5 border-b border-white/[0.06] backdrop-blur-sm bg-[#09090B]/85">
        <button type="button" onClick={goHome} className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity">
          <div className="relative shrink-0">
            <Zap className="w-6 h-6 text-[#38BDF8]" />
            <div className="absolute inset-0 w-6 h-6 bg-[#38BDF8]/20 blur-md rounded-full" />
          </div>
          <span className="font-black text-base sm:text-lg tracking-tight truncate">Sooner</span>
        </button>
        <button
          type="button"
          onClick={toggleLang}
          className="px-3 py-1.5 text-xs font-semibold text-[#71717A] hover:text-white border border-white/[0.08] rounded-lg transition-colors"
        >
          {lang === "en" ? meta.switchJa : meta.switchEn}
        </button>
      </header>

      <main className="relative z-10 flex-1 px-4 sm:px-6 md:px-8 py-10 sm:py-14 max-w-2xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">{t.pageTitle}</h1>
          <p className="text-sm text-[#71717A] leading-relaxed mb-8">{t.pageDesc}</p>

          {LEGAL_SNAPSHOTS.length === 0 ? (
            <p className="text-sm text-[#A1A1AA] border border-white/[0.08] rounded-xl p-6 bg-white/[0.02]">{t.empty}</p>
          ) : (
            <ul className="space-y-4">
              {LEGAL_SNAPSHOTS.map((snap) => (
                <li key={snap.id} className="border border-white/[0.08] rounded-xl p-5 bg-white/[0.02]">
                  <p className="text-sm font-bold text-white mb-1">{lang === "ja" ? snap.labelJa : snap.labelEn}</p>
                  <p className="text-[10px] text-[#52525B] mb-3">{snap.archivedOn}</p>
                  <div className="flex flex-wrap gap-3">
                    <a href={archiveBase(snap.id, "terms")} className="text-xs font-semibold text-[#38BDF8] hover:underline">
                      {meta.termsTitle} →
                    </a>
                    <a href={archiveBase(snap.id, "privacy")} className="text-xs font-semibold text-[#38BDF8] hover:underline">
                      {meta.privacyTitle} →
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 pt-8 border-t border-white/[0.06] space-y-4">
            <p className="text-xs text-[#71717A]">
              {t.currentDocs}{" "}
              <a href={legalDocHref(lang, "terms")} className="text-[#38BDF8] hover:underline">
                {meta.termsTitle}
              </a>
              {" · "}
              <a href={legalDocHref(lang, "privacy")} className="text-[#38BDF8] hover:underline">
                {meta.privacyTitle}
              </a>
            </p>
            <p className="text-xs text-[#52525B]">
              {t.contactPrefix}{" "}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-[#38BDF8] hover:underline">
                {LEGAL_CONTACT_EMAIL}
              </a>
            </p>
            <button type="button" onClick={goHome} className="inline-flex items-center gap-2 text-sm font-semibold text-[#38BDF8] hover:underline">
              <ArrowRight className="w-4 h-4 rotate-180" />
              {meta.backHome}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
