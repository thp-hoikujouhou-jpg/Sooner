import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { applyDocumentSeo } from "./seo";
import { writeStoredLanguage } from "./language";

export default function DocsHubPage({ pathLang }: { pathLang: "en" | "ja" }) {
  const [lang, setLang] = useState<"en" | "ja">(pathLang);

  useEffect(() => {
    setLang(pathLang);
  }, [pathLang]);

  useEffect(() => {
    writeStoredLanguage(lang);
    applyDocumentSeo({
      lang,
      title: lang === "ja" ? "Sooner ドキュメント" : "Sooner Documentation",
      description:
        lang === "ja"
          ? "Sooner の使い方、AI モデル設定、GitHub SAML SSO など。"
          : "How Sooner works: AI models, preview & backend, GitHub SAML SSO, and more.",
      ogTitle: lang === "ja" ? "Sooner ドキュメント" : "Sooner Documentation",
      ogDescription: lang === "ja" ? "Sooner 公式ドキュメント索引。" : "Official Sooner documentation index.",
    });
  }, [lang]);

  const appHref = `${typeof window !== "undefined" ? window.location.protocol : "https:"}//sooner.sh${lang === "ja" ? "?lang=ja" : ""}`;

  const links =
    lang === "ja"
      ? [
          { href: "/docs/ai-models?lang=ja", label: "モデル取得と AI プロバイダー", desc: "Gemini、Vercel AI Gateway、OpenRouter（/v1/models 等）の説明。" },
          { href: "/docs/github-sso?lang=ja", label: "GitHub SAML SSO（組織向け）", desc: "403 や組織承認の手順。" },
        ]
      : [
          { href: "/docs/ai-models?lang=en", label: "Model discovery & AI providers", desc: "Gemini, Vercel AI Gateway, OpenRouter (/v1/models pattern)." },
          { href: "/docs/github-sso?lang=en", label: "GitHub SAML SSO (organizations)", desc: "403 errors and authorization steps." },
        ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0]">
      <header className="border-b border-[#1A1A1A] px-4 py-4 sm:px-8 flex flex-wrap items-center justify-between gap-3">
        <a href={appHref} className="inline-flex items-center gap-2 text-sm text-[#38BDF8] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          {lang === "ja" ? "Sooner に戻る" : "Back to Sooner"}
        </a>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => setLang("en")} className={`px-3 py-1 rounded-lg border ${lang === "en" ? "border-[#38BDF8] text-[#38BDF8]" : "border-[#252525] text-[#8E9299]"}`}>English</button>
          <button type="button" onClick={() => setLang("ja")} className={`px-3 py-1 rounded-lg border ${lang === "ja" ? "border-[#38BDF8] text-[#38BDF8]" : "border-[#252525] text-[#8E9299]"}`}>日本語</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 sm:px-6 space-y-8">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[#38BDF8]" />
          <h1 className="text-2xl font-bold text-white">{lang === "ja" ? "ドキュメント" : "Documentation"}</h1>
        </div>
        <p className="text-sm text-[#A1A1AA] leading-relaxed">
          {lang === "ja"
            ? "Sooner の機能説明とトラブルシューティングをまとめています。ブログ（ニュース）とは別の、仕様に近い記事です。"
            : "Product behavior and troubleshooting. Separate from the blog (news and announcements)."}
        </p>

        <ul className="space-y-3">
          {links.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="block rounded-xl border border-[#252525] bg-[#111] p-4 hover:border-[#38BDF8]/40 transition-colors"
              >
                <span className="font-semibold text-[#38BDF8]">{item.label}</span>
                <p className="text-xs text-[#8E9299] mt-1">{item.desc}</p>
              </a>
            </li>
          ))}
        </ul>

        <p className="text-xs text-[#555]">
          {lang === "ja" ? "ブログ: " : "Blog: "}
          <a href="https://blog.sooner.sh/" className="text-[#38BDF8] hover:underline inline-flex items-center gap-1">
            blog.sooner.sh <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </main>
    </div>
  );
}
