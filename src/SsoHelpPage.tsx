import React, { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { applyDocumentSeo } from "./seo";
import { writeStoredLanguage } from "./language";

const DOCS_OAUTH_SSO =
  "https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-an-oauth-app-for-use-with-saml-single-sign-on";
const DOCS_PAT_SSO =
  "https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on";

export default function SsoHelpPage({ pathLang }: { pathLang: "en" | "ja" }) {
  const [lang, setLang] = useState<"en" | "ja">(pathLang);

  useEffect(() => {
    setLang(pathLang);
  }, [pathLang]);

  useEffect(() => {
    writeStoredLanguage(lang);
    applyDocumentSeo({
      lang,
      title: lang === "ja" ? "GitHub SAML SSO と Sooner" : "GitHub SAML SSO & Sooner",
      description:
        lang === "ja"
          ? "組織の SAML SSO 環境で Sooner の GitHub 連携を使うときの承認手順と管理者向けメモ。"
          : "How SAML SSO affects Sooner’s GitHub integration, authorization steps, and admin notes.",
      ogTitle: lang === "ja" ? "GitHub SAML SSO と Sooner" : "GitHub SAML SSO & Sooner",
      ogDescription:
        lang === "ja"
          ? "組織リポジトリへのアクセスと GitHub 上での承認について。"
          : "Org repos, GitHub authorization, and Sooner.",
    });
  }, [lang]);

  const appHref = `${typeof window !== "undefined" ? window.location.protocol : "https:"}//sooner.sh${lang === "ja" ? "?lang=ja" : ""}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0]">
      <header className="border-b border-[#1A1A1A] px-4 py-4 sm:px-8 flex flex-wrap items-center justify-between gap-3">
        <a
          href={appHref}
          className="inline-flex items-center gap-2 text-sm text-[#38BDF8] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === "ja" ? "Sooner に戻る" : "Back to Sooner"}
        </a>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`px-3 py-1 rounded-lg border ${lang === "en" ? "border-[#38BDF8] text-[#38BDF8]" : "border-[#252525] text-[#8E9299]"}`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLang("ja")}
            className={`px-3 py-1 rounded-lg border ${lang === "ja" ? "border-[#38BDF8] text-[#38BDF8]" : "border-[#252525] text-[#8E9299]"}`}
          >
            日本語
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 sm:px-6 space-y-8 leading-relaxed text-sm">
        {lang === "ja" ? (
          <>
            <h1 className="text-2xl font-bold text-white">SAML SSO を使う組織の方へ</h1>
            <p className="text-[#A1A1AA]">
              Sooner は GitHub のリポジトリ一覧・クローン・PR / Issues などに GitHub API とトークンを使います。組織で{" "}
              <strong className="text-white">SAML シングルサインオン（SSO）</strong> が有効な場合、個人の GitHub
              ログインだけではその組織のリポジトリにアクセスできず、<strong className="text-white">403</strong>{" "}
              になることがあります。
            </p>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">開発者（あなた）がすること</h2>
              <ul className="list-disc pl-5 space-y-1 text-[#A1A1AA]">
                <li>
                  Sooner の設定で GitHub に接続したあと、組織のリポジトリが出ない・API が 403 のときは、GitHub
                  上で <strong className="text-white">その組織向けにトークン／OAuth アプリを承認（Authorize）</strong>{" "}
                  してください。
                </li>
                <li>
                  エラー画面に「GitHub で承認」リンクが出る場合は、その URL から承認フローに進めます。
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">組織管理者の方へ</h2>
              <p className="text-[#A1A1AA]">
                ポリシーによっては、メンバーが OAuth アプリや GitHub App を組織のリソースに接続する前に、
                <strong className="text-white">管理者の承認</strong> が必要です。Sooner を社内で使う場合は、セキュリティ担当と
                GitHub の Organization 設定（インストール制限・OAuth アプリ制限など）を確認してください。
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Sooner が要求するスコープについて</h2>
              <p className="text-[#A1A1AA]">
                現在の連携は、クローン・プッシュ・プル・リポジトリ一覧・組織リポジトリの可視性のために{" "}
                <code className="text-[#38BDF8]">repo</code>、
                <code className="text-[#38BDF8]">read:user</code>、
                <code className="text-[#38BDF8]">read:org</code> を使用します。機能に必要な範囲に絞っていますが、
                組織のポリシーでは追加の審査が必要になることがあります。
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">GitHub 公式ドキュメント</h2>
              <ul className="space-y-2">
                <li>
                  <a
                    href={DOCS_OAUTH_SSO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline"
                  >
                    OAuth アプリと SAML SSO <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
                <li>
                  <a
                    href={DOCS_PAT_SSO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline"
                  >
                    個人アクセストークン（PAT）と SAML SSO <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
              </ul>
            </section>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white">For organizations using SAML SSO</h1>
            <p className="text-[#A1A1AA]">
              Sooner uses the GitHub API and your GitHub token for repository lists, clone, PRs, Issues, and related
              actions. If your company enables <strong className="text-white">SAML single sign-on (SSO)</strong> on an
              organization, GitHub may return <strong className="text-white">403 Forbidden</strong> until you{" "}
              <strong className="text-white">authorize</strong> Sooner’s OAuth token (or PAT) for that organization.
            </p>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">What developers should do</h2>
              <ul className="list-disc pl-5 space-y-1 text-[#A1A1AA]">
                <li>
                  If repositories are missing or the API returns 403 after connecting GitHub in Sooner settings, open
                  GitHub and <strong className="text-white">Authorize</strong> the token / OAuth app for the SAML
                  organization.
                </li>
                <li>
                  When Sooner shows an <strong className="text-white">Authorize on GitHub</strong> link, use it to start
                  the approval flow.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Organization administrators</h2>
              <p className="text-[#A1A1AA]">
                Depending on policy, members may need an admin to approve OAuth apps or GitHub Apps before they can
                access org resources. Review your organization’s GitHub settings (OAuth app restrictions, app
                installs, etc.) when rolling out Sooner.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">OAuth scopes in Sooner</h2>
              <p className="text-[#A1A1AA]">
                Sooner requests <code className="text-[#38BDF8]">repo</code>,{" "}
                <code className="text-[#38BDF8]">read:user</code>, and{" "}
                <code className="text-[#38BDF8]">read:org</code> so it can clone, push/pull, list repositories (including
                org-owned repos you can access), and use the PR/Issues APIs. These are the minimum scopes for the current
                feature set; your org may still require SSO authorization on top of scopes.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">GitHub documentation</h2>
              <ul className="space-y-2">
                <li>
                  <a
                    href={DOCS_OAUTH_SSO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline"
                  >
                    Authorizing an OAuth app for use with SAML SSO <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
                <li>
                  <a
                    href={DOCS_PAT_SSO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline"
                  >
                    Authorizing a PAT for use with SAML SSO <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
