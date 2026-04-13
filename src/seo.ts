/**
 * Per-host SEO: title, description, Open Graph, Twitter, canonical, hreflang.
 * Call after mount and when language / route context changes.
 */

const OG_IMAGE = "https://site.sooner.sh/sooner-icon.svg";

export type SeoLang = "en" | "ja";

function getLangForSeo(): SeoLang {
  if (typeof window === "undefined") return "en";
  const p = new URLSearchParams(window.location.search);
  if (p.get("lang") === "ja") return "ja";
  if (p.get("lang") === "en") return "en";
  const h = window.location.hostname;
  if (h === "sooner.sh" || h === "www.sooner.sh") {
    const s = localStorage.getItem("aether_language");
    if (s === "ja" || s === "en") return s;
  }
  return "en";
}

type Pack = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
};

const en: Record<string, Pack> = {
  site: {
    title: "Sooner — Build sooner, ship faster | AI workspace in the browser",
    description:
      "Sooner is an AI workspace in your browser: describe what you want, get production-ready code, live preview, Git, terminal, and Firebase sync.",
    ogTitle: "Sooner — Build sooner, ship faster",
    ogDescription: "AI workspace with Monaco editor, Gemini, live preview, and cloud projects.",
  },
  app: {
    title: "Sooner — Workspace | Code, preview, ship",
    description:
      "Sign in to Sooner: multi-file projects, AI agent, terminal, preview, and cloud storage — all in one tab.",
    ogTitle: "Sooner — Workspace",
    ogDescription: "Build and preview in the browser. AI-assisted coding with cloud sync.",
  },
  signup: {
    title: "Sooner — Create account",
    description: "Create your Sooner account. Email, Google, or GitHub sign-in.",
    ogTitle: "Sooner — Sign up",
    ogDescription: "Create a free Sooner account to start building.",
  },
  signin: {
    title: "Sooner — Sign in",
    description: "Sign in to Sooner to open your projects and workspace.",
    ogTitle: "Sooner — Sign in",
    ogDescription: "Access your Sooner workspace.",
  },
  blog: {
    title: "Sooner Blog — News & tutorials",
    description: "Updates, tips, and tutorials from the Sooner team — AI workspace, web dev, and shipping faster.",
    ogTitle: "Sooner Blog",
    ogDescription: "News and tutorials from Sooner.",
  },
};

const ja: Record<string, Pack> = {
  site: {
    title: "Sooner — もっと早く作り、早く届ける | ブラウザ上のAIワークスペース",
    description:
      "Soonerはブラウザ上のAIワークスペース。自然言語で指示し、本番向けコード、ライブプレビュー、Git・ターミナル、Firebase同期まで。",
    ogTitle: "Sooner — Build sooner, ship faster",
    ogDescription: "Monaco・Gemini・ライブプレビュー・クラウドプロジェクト。",
  },
  app: {
    title: "Sooner — ワークスペース | コード・プレビュー・公開",
    description:
      "Soonerにログイン: 複数ファイル、AIエージェント、ターミナル、プレビュー、クラウドストレージをひとつのタブで。",
    ogTitle: "Sooner — ワークスペース",
    ogDescription: "ブラウザでビルド＆プレビュー。AI支援とクラウド同期。",
  },
  signup: {
    title: "Sooner — アカウント作成",
    description: "Soonerのアカウントを作成。メール、Google、またはGitHubでサインアップ。",
    ogTitle: "Sooner — サインアップ",
    ogDescription: "無料でSoonerを始める。",
  },
  signin: {
    title: "Sooner — ログイン",
    description: "Soonerにログインしてプロジェクトとワークスペースを開く。",
    ogTitle: "Sooner — ログイン",
    ogDescription: "Soonerワークスペースにアクセス。",
  },
  blog: {
    title: "Sooner ブログ — ニュースとチュートリアル",
    description: "Soonerチームからの更新・Tips・チュートリアル。AIワークスペースとWeb開発。",
    ogTitle: "Sooner ブログ",
    ogDescription: "Soonerからのニュースとチュートリアル。",
  },
};

function hostKey(hostname: string): string {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return "site";
  if (h.startsWith("site.")) return "site";
  if (h.startsWith("blog.")) return "blog";
  if (h.startsWith("signup.")) return "signup";
  if (h.startsWith("signin.") || h.startsWith("login.")) return "signin";
  if (h === "sooner.sh" || h === "www.sooner.sh") return "app";
  return "app";
}

function canonicalUrl(): string {
  const { protocol, hostname, pathname, search } = window.location;
  const path = pathname === "" ? "/" : pathname;
  return `${protocol}//${hostname}${path}${search}`;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  const sel = attr === "name" ? `meta[name="${key}"]` : `meta[property="${key}"]`;
  let el = document.head.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string, extra?: Record<string, string>) {
  const sel = `link[rel="${rel}"]`;
  let el = document.head.querySelector(sel) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
  }
}

function removeOldHreflang() {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
}

function injectHreflangForLanding() {
  removeOldHreflang();
  const host = window.location.hostname.toLowerCase();
  if (!host.startsWith("site.") && !host.startsWith("blog.")) return;
  try {
    const proto = window.location.protocol;
    const path = window.location.pathname || "/";
    const base = `${proto}//${host}${path}`;
    const u = new URL(base);
    const enU = new URL(u.toString());
    enU.searchParams.set("lang", "en");
    const jaU = new URL(u.toString());
    jaU.searchParams.set("lang", "ja");
    const defU = new URL(`${proto}//${host}/`);

    for (const [code, href] of [
      ["en", enU.toString()],
      ["ja", jaU.toString()],
      ["x-default", defU.toString()],
    ] as const) {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", code);
      link.setAttribute("href", href);
      document.head.appendChild(link);
    }
  } catch {
    /* ignore */
  }
}

export type SeoOverrides = { lang?: SeoLang };

/** Call on mount and when language or host context changes. Pass `lang` from React state when URL does not carry `?lang=`. */
export function applyDocumentSeo(override?: SeoOverrides): void {
  if (typeof document === "undefined") return;

  const hostname = window.location.hostname;
  const key = hostKey(hostname);
  const lang = override?.lang ?? getLangForSeo();
  const table = lang === "ja" ? ja : en;
  const pack = table[key] ?? table.app;

  const url = canonicalUrl();
  document.title = pack.title;
  setMeta("name", "description", pack.description);
  setMeta("property", "og:title", pack.ogTitle);
  setMeta("property", "og:description", pack.ogDescription);
  setMeta("property", "og:url", url);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", "Sooner");
  setMeta("property", "og:image", OG_IMAGE);
  setMeta("property", "og:locale", lang === "ja" ? "ja_JP" : "en_US");
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", pack.ogTitle);
  setMeta("name", "twitter:description", pack.ogDescription);
  setMeta("name", "twitter:image", OG_IMAGE);
  setLink("canonical", url);

  document.documentElement.lang = lang === "ja" ? "ja" : "en";

  injectHreflangForLanding();

  let ld = document.getElementById("sooner-ld-json");
  if (!ld) {
    ld = document.createElement("script");
    ld.id = "sooner-ld-json";
    ld.type = "application/ld+json";
    document.head.appendChild(ld);
  }
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sooner",
    url: "https://site.sooner.sh/",
    description: en.site.description,
    inLanguage: ["en", "ja"],
  });
}
