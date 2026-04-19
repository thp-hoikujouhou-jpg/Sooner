import React, { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { applyDocumentSeo } from "./seo";
import { writeStoredLanguage } from "./language";

const OPENAI_MODELS_SPEC = "https://platform.openai.com/docs/api-reference/models/list";
const VERCEL_GATEWAY = "https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-compat";
const OPENROUTER_DOCS = "https://openrouter.ai/docs/api/reference/overview";

export default function DocsAiModelsPage({ pathLang }: { pathLang: "en" | "ja" }) {
  const [lang, setLang] = useState<"en" | "ja">(pathLang);

  useEffect(() => {
    setLang(pathLang);
  }, [pathLang]);

  useEffect(() => {
    writeStoredLanguage(lang);
    applyDocumentSeo({
      lang,
      title: lang === "ja" ? "モデル取得と AI プロバイダー | Sooner" : "Model discovery & AI providers | Sooner",
      description:
        lang === "ja"
          ? "Gemini、Vercel AI Gateway、OpenRouter のモデル一覧（/v1/models 等）の説明。"
          : "How Sooner lists models: Gemini, Vercel AI Gateway, and OpenRouter (/v1/models pattern).",
      ogTitle: lang === "ja" ? "モデル取得と AI プロバイダー" : "Model discovery & AI providers",
      ogDescription:
        lang === "ja"
          ? "Cursor や Cline と同様の「キー＋一覧 API」の考え方と、Sooner の実装。"
          : "Industry pattern and how Sooner implements model listing.",
    });
  }, [lang]);

  const appHref = `${typeof window !== "undefined" ? window.location.protocol : "https:"}//sooner.sh${lang === "ja" ? "?lang=ja" : ""}`;
  const docsHref = `/docs${lang === "ja" ? "?lang=ja" : ""}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0]">
      <header className="border-b border-[#1A1A1A] px-4 py-4 sm:px-8 flex flex-wrap items-center justify-between gap-3">
        <a href={docsHref} className="inline-flex items-center gap-2 text-sm text-[#38BDF8] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          {lang === "ja" ? "ドキュメント索引" : "Documentation index"}
        </a>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => setLang("en")} className={`px-3 py-1 rounded-lg border ${lang === "en" ? "border-[#38BDF8] text-[#38BDF8]" : "border-[#252525] text-[#8E9299]"}`}>English</button>
          <button type="button" onClick={() => setLang("ja")} className={`px-3 py-1 rounded-lg border ${lang === "ja" ? "border-[#38BDF8] text-[#38BDF8]" : "border-[#252525] text-[#8E9299]"}`}>日本語</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 sm:px-6 space-y-8 text-sm leading-relaxed">
        {lang === "ja" ? (
          <>
            <h1 className="text-2xl font-bold text-white">モデル取得の仕組み（AI ツールの裏側）</h1>
            <p className="text-[#A1A1AA]">
              Cursor や Cline のように、<strong className="text-white">API キーを入れるとモデル一覧が出る</strong>仕組みは、多くの場合{" "}
              <strong className="text-white">OpenAI 互換 API</strong>の{" "}
              <code className="text-[#38BDF8]">GET /v1/models</code>（または Base URL がすでに{" "}
              <code className="text-[#38BDF8]">…/v1</code> なら <code className="text-[#38BDF8]">GET …/models</code>
              ）に <code className="text-[#38BDF8]">Authorization: Bearer …</code> で問い合わせ、返ってきた{" "}
              <code className="text-[#38BDF8]">id</code> をドロップダウンに載せています。
            </p>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Sooner の実装</h2>
              <ul className="list-disc pl-5 space-y-2 text-[#A1A1AA]">
                <li>
                  <strong className="text-white">Vercel AI Gateway</strong>: ブラウザから直接は CORS のため使えず、Sooner の <code className="text-[#38BDF8]">VITE_BACKEND_URL</code> API が{" "}
                  <code className="text-[#38BDF8]">/api/ai/gateway/models</code> と{" "}
                  <code className="text-[#38BDF8]">/api/ai/gateway/chat-completions</code> として中継します（ヘッダー <code className="text-[#38BDF8]">X-Sooner-Gateway-Key</code>）。
                </li>
                <li>
                  <strong className="text-white">OpenRouter</strong>（設定の OpenRouter プロバイダー）: 既定ベースは{" "}
                  <code className="text-[#38BDF8]">https://openrouter.ai/api/v1</code>。モデル一覧は{" "}
                  <code className="text-[#38BDF8]">GET /v1/models</code>、チャットは <code className="text-[#38BDF8]">POST /v1/chat/completions</code>
                  。別のベース URL にしたい場合はビルド時に <code className="text-[#38BDF8]">VITE_OPENROUTER_API_BASE</code> または{" "}
                  <code className="text-[#38BDF8]">VITE_CUSTOM_OPENAI_API_BASE</code> を指定します。ブラウザ直叩きは{" "}
                  <strong className="text-white">CORS</strong> 次第です。
                </li>
                <li>
                  <strong className="text-white">注意</strong>: ブラウザから任意のオリジンへ直接叩くと{" "}
                  <strong className="text-white">CORS</strong> で失敗することがあります。プロキシや CORS 対応 API が必要です。
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">プレビューとバックエンド</h2>
              <p className="text-[#A1A1AA]">
                ライブプレビュー、Git（clone / push / pull）、ファイル一覧の高速取得、Storage 一括削除などは、ビルド時の{" "}
                <code className="text-[#38BDF8]">VITE_BACKEND_URL</code> で指す <strong className="text-white">Node ワークスペース API</strong>
                （例: Railway）がある構成で利用できます。静的ホストのみの場合は、エディタ・ZIP・ブラウザ側プレビュー中心の動きになります。
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">参考リンク</h2>
              <ul className="space-y-2">
                <li>
                  <a href={VERCEL_GATEWAY} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline">
                    Vercel AI Gateway（OpenAI 互換） <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
                <li>
                  <a href={OPENAI_MODELS_SPEC} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline">
                    OpenAI Models API リファレンス <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
                <li>
                  <a href={OPENROUTER_DOCS} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline">
                    OpenRouter API 概要 <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
              </ul>
            </section>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white">Model discovery & AI providers</h1>
            <p className="text-[#A1A1AA]">
              Tools like <strong className="text-white">Cursor</strong> and <strong className="text-white">Cline</strong> often list models by calling an{" "}
              <strong className="text-white">OpenAI-compatible</strong> endpoint:{" "}
              <code className="text-[#38BDF8]">GET /v1/models</code> (or <code className="text-[#38BDF8]">GET …/models</code> when the configured base already ends with{" "}
              <code className="text-[#38BDF8]">/v1</code>) with <code className="text-[#38BDF8]">Authorization: Bearer …</code>, then reading each model{" "}
              <code className="text-[#38BDF8]">id</code>.
            </p>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">How Sooner does it</h2>
              <ul className="list-disc pl-5 space-y-2 text-[#A1A1AA]">
                <li>
                  <strong className="text-white">Vercel AI Gateway</strong>: browsers cannot call the gateway directly (CORS). The Sooner{" "}
                  <code className="text-[#38BDF8]">VITE_BACKEND_URL</code> API proxies{" "}
                  <code className="text-[#38BDF8]">/api/ai/gateway/models</code> and{" "}
                  <code className="text-[#38BDF8]">/api/ai/gateway/chat-completions</code> with header <code className="text-[#38BDF8]">X-Sooner-Gateway-Key</code>.
                </li>
                <li>
                  <strong className="text-white">OpenRouter</strong> (OpenRouter provider in Settings): default base is{" "}
                  <code className="text-[#38BDF8]">https://openrouter.ai/api/v1</code> for <code className="text-[#38BDF8]">GET /v1/models</code> and{" "}
                  <code className="text-[#38BDF8]">POST /v1/chat/completions</code>. Override at build time with{" "}
                  <code className="text-[#38BDF8]">VITE_OPENROUTER_API_BASE</code> or <code className="text-[#38BDF8]">VITE_CUSTOM_OPENAI_API_BASE</code>{" "}
                  for a compatible mirror. Browser calls may still fail with <strong className="text-white">CORS</strong> depending on the host.
                </li>
                <li>
                  <strong className="text-white">Note</strong>: browser calls to arbitrary origins may fail with <strong className="text-white">CORS</strong>
                  — use a proxy or an API that allows your web origin.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Preview & backend</h2>
              <p className="text-[#A1A1AA]">
                Live preview, Git (clone / push / pull), faster Storage file indexes, and bulk deletes are available when you deploy the{" "}
                <strong className="text-white">Node workspace API</strong> pointed to by <code className="text-[#38BDF8]">VITE_BACKEND_URL</code>{" "}
                (e.g. Railway). Static hosting alone focuses on editing, ZIP workflows, and limited preview.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">References</h2>
              <ul className="space-y-2">
                <li>
                  <a href={VERCEL_GATEWAY} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline">
                    Vercel AI Gateway (OpenAI-compatible) <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
                <li>
                  <a href={OPENAI_MODELS_SPEC} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline">
                    OpenAI Models API reference <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
                <li>
                  <a href={OPENROUTER_DOCS} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline">
                    OpenRouter API overview <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
              </ul>
            </section>
          </>
        )}

        <p className="pt-6 border-t border-[#1A1A1A]">
          <a href={appHref} className="text-[#38BDF8] hover:underline text-sm">
            {lang === "ja" ? "Sooner アプリを開く" : "Open Sooner app"}
          </a>
        </p>
      </main>
    </div>
  );
}
