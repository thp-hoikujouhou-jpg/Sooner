/**
 * Per-host SEO: title, description, Open Graph, Twitter, canonical, hreflang.
 * Call after mount and when language / route context changes.
 */

import { readStoredLanguage } from "./language";

const OG_IMAGE = "https://site.sooner.sh/sooner-icon.svg";

export type SeoLang = "en" | "ja";

function getLangForSeo(): SeoLang {
  if (typeof window === "undefined") return "en";
  const p = new URLSearchParams(window.location.search);
  if (p.get("lang") === "ja") return "ja";
  if (p.get("lang") === "en") return "en";
  const h = window.location.hostname;
  if (h === "sooner.sh" || h.startsWith("blog.")) {
    return readStoredLanguage();
  }
  return "en";
}

type Pack = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string;
};

const en: Record<string, Pack> = {
  site: {
    title: "Sooner — Build sooner, ship faster | AI-native IDE in the browser",
    description:
      "Sooner is an AI-native IDE in your browser: describe what you want, get production-ready code, live preview, Git, terminal, and Firebase sync.",
    ogTitle: "Sooner — Build sooner, ship faster",
    ogDescription: "AI-native IDE with Monaco editor, Gemini, live preview, and cloud projects.",
    keywords: "AI IDE, browser IDE, online code editor, AI coding assistant, web development, Monaco editor, Gemini AI, cloud IDE, Sooner, code generation",
  },
  app: {
    title: "Sooner — AI-native IDE | Code, preview, ship",
    description:
      "Sign in to Sooner: multi-file projects, AI agent, terminal, preview, and cloud storage — all in one tab.",
    ogTitle: "Sooner — AI-native IDE",
    ogDescription: "Build and preview in the browser. AI-native IDE with cloud sync.",
    keywords: "AI IDE, online code editor, browser IDE, code preview, cloud projects, Sooner app",
  },
  signup: {
    title: "Sooner — Create account",
    description: "Create your Sooner account. Email, Google, or GitHub sign-in.",
    ogTitle: "Sooner — Sign up",
    ogDescription: "Create a free Sooner account to start building.",
    keywords: "Sooner sign up, create account, free AI IDE, browser code editor",
  },
  signin: {
    title: "Sooner — Sign in",
    description: "Sign in to Sooner to open your projects and AI-native IDE.",
    ogTitle: "Sooner — Sign in",
    ogDescription: "Access your Sooner AI-native IDE.",
    keywords: "Sooner login, sign in, AI IDE access, cloud projects",
  },
  blog: {
    title: "Sooner Blog — News & tutorials",
    description: "Updates, tips, and tutorials from the Sooner team — AI-native IDE, web dev, and shipping faster.",
    ogTitle: "Sooner Blog",
    ogDescription: "News and tutorials from Sooner.",
    keywords: "Sooner blog, AI IDE tutorials, web development tips, browser IDE updates, coding tutorials",
  },
};

const ja: Record<string, Pack> = {
  site: {
    title: "Sooner — もっと早く作り、早く届ける | ブラウザ上のAIネイティブIDE",
    description:
      "Soonerはブラウザ上のAIネイティブIDE。自然言語で指示し、本番向けコード、ライブプレビュー、Git・ターミナル、Firebase同期まで。",
    ogTitle: "Sooner — Build sooner, ship faster",
    ogDescription: "Monaco・Gemini・ライブプレビュー・クラウドプロジェクト。",
    keywords: "AI IDE, ブラウザIDE, オンラインコードエディタ, AIコーディング, Web開発, Monaco, Gemini AI, クラウドIDE, Sooner",
  },
  app: {
    title: "Sooner — AIネイティブIDE | コード・プレビュー・公開",
    description:
      "Soonerにログイン: 複数ファイル、AIエージェント、ターミナル、プレビュー、クラウドストレージをひとつのタブで。",
    ogTitle: "Sooner — AIネイティブIDE",
    ogDescription: "ブラウザでビルド＆プレビュー。AIネイティブIDEとクラウド同期。",
    keywords: "AI IDE, オンラインエディタ, ブラウザIDE, コードプレビュー, クラウドプロジェクト, Sooner",
  },
  signup: {
    title: "Sooner — アカウント作成",
    description: "Soonerのアカウントを作成。メール、Google、またはGitHubでサインアップ。",
    ogTitle: "Sooner — サインアップ",
    ogDescription: "無料でSoonerを始める。",
    keywords: "Sooner アカウント作成, 無料AI IDE, ブラウザエディタ登録",
  },
  signin: {
    title: "Sooner — ログイン",
    description: "SoonerにログインしてプロジェクトとAIネイティブIDEを開く。",
    ogTitle: "Sooner — ログイン",
    ogDescription: "SoonerのAIネイティブIDEにアクセス。",
    keywords: "Sooner ログイン, サインイン, AI IDEアクセス",
  },
  blog: {
    title: "Sooner ブログ — ニュースとチュートリアル",
    description: "Soonerチームからの更新・Tips・チュートリアル。AIネイティブIDEとWeb開発。",
    ogTitle: "Sooner ブログ",
    ogDescription: "Soonerからのニュースとチュートリアル。",
    keywords: "Sooner ブログ, AI IDEチュートリアル, Web開発Tips, ブラウザIDE更新情報",
  },
};

function hostKey(hostname: string): string {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return "site";
  if (h.startsWith("site.")) return "site";
  if (h.startsWith("blog.")) return "blog";
  if (h.startsWith("signup.")) return "signup";
  if (h.startsWith("signin.") || h.startsWith("login.")) return "signin";
  if (h === "sooner.sh") return "app";
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

function buildJsonLd(key: string, lang: SeoLang): object[] {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sooner",
    url: "https://site.sooner.sh/",
    logo: OG_IMAGE,
    sameAs: [],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sooner",
    url: "https://site.sooner.sh/",
    description: en.site.description,
    inLanguage: ["en", "ja"],
    publisher: { "@type": "Organization", name: "Sooner" },
  };

  if (key === "site" || key === "app") {
    const softwareApp = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Sooner",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: "https://sooner.sh/",
      description: (lang === "ja" ? ja : en).site.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Organization", name: "Sooner" },
    };
    return [org, website, softwareApp];
  }

  if (key === "blog") {
    const blog = {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: lang === "ja" ? "Sooner ブログ" : "Sooner Blog",
      url: "https://blog.sooner.sh/",
      description: (lang === "ja" ? ja : en).blog.description,
      publisher: { "@type": "Organization", name: "Sooner", logo: { "@type": "ImageObject", url: OG_IMAGE } },
      blogPost: [
        {
          "@type": "BlogPosting",
          headline: lang === "ja" ? "Sooner（ベータ）へようこそ" : "Welcome to Sooner (beta)",
          datePublished: "2026-04-14",
          author: { "@type": "Organization", name: "Sooner" },
          description: lang === "ja"
            ? "Sooner はブラウザ上の AI ネイティブ IDE です。"
            : "Sooner is an AI-native IDE in the browser.",
        },
        {
          "@type": "BlogPosting",
          headline: lang === "ja" ? "なぜブラウザで作ったか" : "Why we built in the browser",
          datePublished: "2026-04-10",
          author: { "@type": "Organization", name: "Sooner" },
          description: lang === "ja"
            ? "インストール不要、揃った環境、アイデアから動くコードまでを一か所に。"
            : "Zero install, consistent environments, and a path from idea to running code in one place.",
        },
      ],
    };
    return [org, blog];
  }

  return [org, website];
}

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
  setMeta("name", "keywords", pack.keywords);
  setMeta("name", "robots", "index, follow");
  setMeta("name", "author", "Sooner");
  setMeta("property", "og:title", pack.ogTitle);
  setMeta("property", "og:description", pack.ogDescription);
  setMeta("property", "og:url", url);
  setMeta("property", "og:type", key === "blog" ? "blog" : "website");
  setMeta("property", "og:site_name", "Sooner");
  setMeta("property", "og:image", OG_IMAGE);
  setMeta("property", "og:locale", lang === "ja" ? "ja_JP" : "en_US");
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", pack.ogTitle);
  setMeta("name", "twitter:description", pack.ogDescription);
  setMeta("name", "twitter:image", OG_IMAGE);

  if (key === "blog") {
    setMeta("property", "article:author", "Sooner Team");
    setMeta("property", "article:published_time", "2026-04-14");
  }

  setLink("canonical", url);

  document.documentElement.lang = lang === "ja" ? "ja" : "en";

  injectHreflangForLanding();

  const schemas = buildJsonLd(key, lang);
  document.querySelectorAll('script[data-sooner-ld]').forEach((n) => n.remove());
  schemas.forEach((schema, i) => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-sooner-ld", String(i));
    el.textContent = JSON.stringify(schema);
    document.head.appendChild(el);
  });

  const oldLd = document.getElementById("sooner-ld-json");
  if (oldLd) oldLd.remove();
}
