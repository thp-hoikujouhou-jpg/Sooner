import React, { useEffect, useMemo, useState } from "react";
import { Zap, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { applyDocumentSeo } from "./seo";
import { writeStoredLanguage } from "./language";
import { legalDocHref, navigateToSubdomain, LEGAL_CONTACT_EMAIL } from "./shared";
import {
  legalMeta,
  termsEn,
  termsJa,
  privacyEn,
  privacyJa,
  type LegalSection,
} from "./legalContent";
import { getLegalSnapshot } from "./legalArchive";

export type LegalKind = "terms" | "privacy";

export default function LegalPage({
  kind,
  pathLang,
  archiveVersionId,
}: {
  kind: LegalKind;
  pathLang: "en" | "ja";
  archiveVersionId?: string;
}) {
  const [lang, setLang] = useState<"en" | "ja">(pathLang);
  const isProduction = typeof window !== "undefined" && window.location.hostname.endsWith("sooner.sh");

  const snapshot = archiveVersionId ? getLegalSnapshot(archiveVersionId) : undefined;
  const archiveMissing = Boolean(archiveVersionId && !snapshot);

  useEffect(() => {
    setLang(pathLang);
  }, [pathLang]);

  const meta = legalMeta[lang];
  const sections: LegalSection[] = useMemo(() => {
    if (archiveMissing) return [];
    if (snapshot) {
      if (kind === "terms") return lang === "ja" ? snapshot.termsJa : snapshot.termsEn;
      return lang === "ja" ? snapshot.privacyJa : snapshot.privacyEn;
    }
    if (kind === "terms") return lang === "ja" ? termsJa : termsEn;
    return lang === "ja" ? privacyJa : privacyEn;
  }, [kind, lang, snapshot, archiveMissing]);

  const pageTitle = kind === "terms" ? meta.termsTitle : meta.privacyTitle;
  const otherKind: LegalKind = kind === "terms" ? "privacy" : "terms";
  const otherLabel = kind === "terms" ? meta.otherDocPrivacy : meta.otherDocTerms;
  const otherHref = legalDocHref(lang, otherKind);
  const archiveIndexHref = `/legal/${lang}/archive`;

  useEffect(() => {
    const desc =
      lang === "ja"
        ? kind === "terms"
          ? "Soonerの利用規約。本サービスの利用条件、禁止事項、免責事項等について定めます。"
          : "Soonerのプライバシーポリシー。取得する情報、利用目的、第三者提供等について説明します。"
        : kind === "terms"
          ? "Sooner Terms of Service: conditions of use, acceptable use, disclaimers, and liability."
          : "Sooner Privacy Policy: what we collect, how we use data, and your rights.";

    applyDocumentSeo({
      lang,
      title: `${archiveVersionId ? `[Archive] ` : ""}${pageTitle} — Sooner`,
      description: desc,
      ogTitle: `${pageTitle} — Sooner`,
      ogDescription: desc,
      keywords:
        lang === "ja"
          ? "Sooner,利用規約,プライバシー,個人情報"
          : "Sooner,terms of service,privacy policy,personal data",
    });
  }, [kind, lang, pageTitle, archiveVersionId]);

  const goHome = () => {
    if (isProduction) navigateToSubdomain("site", lang);
    else window.location.href = "/";
  };

  const toggleLang = () => {
    const next = lang === "en" ? "ja" : "en";
    writeStoredLanguage(next);
    setLang(next);
    const newPath = archiveVersionId
      ? `/legal/${next}/archive/${archiveVersionId}/${kind}`
      : `/legal/${next}/${kind}`;
    window.history.replaceState(null, "", newPath);
  };

  if (archiveMissing) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-6">
        <p className="text-sm text-[#A1A1AA] mb-6 text-center max-w-md">
          {lang === "ja" ? "指定されたバージョンの文書が見つかりません。" : "This archived version was not found."}
        </p>
        <a href={archiveIndexHref} className="text-[#38BDF8] text-sm font-semibold hover:underline">
          {meta.archiveLink} →
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full bg-[#38BDF8]/[0.04] blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#38BDF8]/[0.02] blur-[100px]" />
      </div>

      <header className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-4 md:py-5 border-b border-white/[0.06] backdrop-blur-sm bg-[#09090B]/85">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity"
        >
          <div className="relative shrink-0">
            <Zap className="w-6 h-6 text-[#38BDF8]" />
            <div className="absolute inset-0 w-6 h-6 bg-[#38BDF8]/20 blur-md rounded-full" />
          </div>
          <span className="font-black text-base sm:text-lg tracking-tight truncate">Sooner</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={otherHref}
            className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-[#8E9299] hover:text-white border border-white/[0.08] rounded-lg transition-colors"
          >
            {otherLabel}
          </a>
          <button
            type="button"
            onClick={toggleLang}
            className="px-3 py-1.5 text-xs font-semibold text-[#71717A] hover:text-white border border-white/[0.08] rounded-lg transition-colors"
          >
            {lang === "en" ? meta.switchJa : meta.switchEn}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-4 sm:px-6 md:px-8 py-10 sm:py-14 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {archiveVersionId && snapshot ? (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90 mb-4 px-3 py-2 rounded-lg border border-amber-500/25 bg-amber-500/10">
              {lang === "ja"
                ? `アーカイブ（${snapshot.labelJa}）— 現行版はトップのリンクからご確認ください。`
                : `Archived copy (${snapshot.labelEn}) — see the current version via the links below.`}
            </p>
          ) : null}

          <div className="h-1 w-14 rounded-full bg-gradient-to-r from-[#38BDF8] to-cyan-300 mb-6" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#38BDF8] mb-3">
            Sooner
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">{pageTitle}</h1>
          <p className="text-xs text-[#52525B] mb-10">
            {archiveVersionId && snapshot ? `${snapshot.archivedOn} · ${lang === "ja" ? snapshot.labelJa : snapshot.labelEn}` : meta.lastUpdated}
          </p>

          <p className="text-xs text-[#71717A] leading-relaxed mb-10 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            {meta.notice}
          </p>

          <div className="space-y-10">
            {sections.map((sec) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24">
                <h2 className="text-sm font-bold text-white mb-3">{sec.title}</h2>
                <div className="space-y-3">
                  {sec.paragraphs.map((p, i) => (
                    <p key={i} className="text-sm text-[#A1A1AA] leading-[1.85]">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.06] space-y-4 text-center sm:text-left">
            <p className="text-xs text-[#71717A]">
              <span className="text-[#52525B]">{meta.contactEmailLabel}</span>{" "}
              <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-[#38BDF8] hover:underline font-medium">
                {LEGAL_CONTACT_EMAIL}
              </a>
            </p>
            {!archiveVersionId ? (
              <p className="text-[11px] text-[#52525B]">
                <a href={archiveIndexHref} className="text-[#8E9299] hover:text-[#38BDF8] transition-colors">
                  {meta.archiveLink} →
                </a>
              </p>
            ) : (
              <p className="text-[11px] text-[#52525B]">
                <a href={legalDocHref(lang, kind)} className="text-[#38BDF8] hover:underline">
                  {lang === "ja" ? "現行の" : "Current "}
                  {pageTitle} →
                </a>
              </p>
            )}
          </div>

          <div className="mt-10 pt-10 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button
              type="button"
              onClick={goHome}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#38BDF8] hover:underline"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              {meta.backHome}
            </button>
            <a
              href={otherHref}
              className="text-sm text-[#8E9299] hover:text-white transition-colors sm:text-right"
            >
              {otherLabel} →
            </a>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 px-4 py-8 border-t border-white/[0.06] text-center space-y-2">
        <p className="text-[10px] text-[#3F3F46]">© 2026 Sooner. All rights reserved.</p>
        <p className="text-[10px] text-[#52525B]">
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-[#38BDF8] hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </footer>
    </div>
  );
}
