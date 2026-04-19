/**
 * Per-host SEO: title, description, Open Graph, Twitter, canonical, hreflang.
 * Call after mount and when language / route context changes.
 *
 * `index.html` injects the same canonical + `og:url` as `canonicalUrl()` via an inline
 * script so non-React crawlers do not see every host pointing at `lp.sooner.sh`.
 */

import { readStoredLanguage } from "./language";

const OG_IMAGE = "https://lp.sooner.sh/og-image.png";

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
      "Sooner is an AI-native IDE in your browser. Describe what you want — AI builds, previews, and ships your code in seconds. Monaco editor, Gemini AI, Git, terminal, and cloud sync included. No install needed.",
    ogTitle: "Sooner — Build sooner, ship faster | AI-native IDE",
    ogDescription: "AI-native IDE in your browser. Describe what you want — AI builds, previews, and ships your code in seconds. No install needed.",
    keywords: "Sooner, AI IDE, AI-native IDE, browser IDE, online code editor, AI coding assistant, web development, Monaco editor, Gemini AI, cloud IDE, code generation, live preview, Git integration, free IDE",
  },
  app: {
    title: "Sooner — AI-native IDE | Build, preview, ship",
    description:
      "Sign in to Sooner: multi-file projects, AI agent, terminal, live preview, Git, and cloud storage — all in one tab. The AI-native IDE.",
    ogTitle: "Sooner — AI-native IDE",
    ogDescription: "Build, preview, and ship in the browser. AI-native IDE with cloud sync.",
    keywords: "Sooner, AI IDE, online code editor, browser IDE, code preview, cloud projects, AI coding, Sooner app",
  },
  signup: {
    title: "Sooner — Create your free account | AI-native IDE",
    description: "Create your free Sooner account. Sign up with email, Google, or GitHub. Start building with the AI-native IDE in seconds.",
    ogTitle: "Sooner — Get started free",
    ogDescription: "Create a free Sooner account and start building with AI.",
    keywords: "Sooner sign up, create account, free AI IDE, browser code editor, AI coding tool",
  },
  signin: {
    title: "Sooner — Sign in | AI-native IDE",
    description: "Sign in to Sooner to open your projects. AI-native IDE with live preview, Git, and cloud sync.",
    ogTitle: "Sooner — Sign in",
    ogDescription: "Access your Sooner AI-native IDE and projects.",
    keywords: "Sooner login, sign in, AI IDE access, cloud projects, online editor",
  },
  blog: {
    title: "Sooner Blog — News, tutorials & updates | AI-native IDE",
    description: "Product updates, tips, and tutorials from the Sooner team. Learn about the AI-native IDE, web development, and how to ship faster.",
    ogTitle: "Sooner Blog — News & tutorials",
    ogDescription: "Product updates and tutorials from the Sooner team. AI-native IDE insights.",
    keywords: "Sooner blog, AI IDE tutorials, web development tips, browser IDE updates, coding tutorials, Sooner news",
  },
};

const ja: Record<string, Pack> = {
  site: {
    title: "Sooner — もっと早く作り、早く届ける | ブラウザ上のAIネイティブIDE",
    description:
      "Soonerはブラウザ上のAIネイティブIDEです。自然言語で指示するだけで、本番品質のコードを生成、プレビュー、デプロイ。Monaco、Gemini AI、Git、ターミナル、クラウド同期を搭載。インストール不要。",
    ogTitle: "Sooner — Build sooner, ship faster | AIネイティブIDE",
    ogDescription: "ブラウザ上のAIネイティブIDE。指示するだけでコードを生成、プレビュー、公開。インストール不要。",
    keywords: "Sooner, AI IDE, AIネイティブIDE, ブラウザIDE, オンラインコードエディタ, AIコーディング, Web開発, Monaco, Gemini AI, クラウドIDE, コード生成, ライブプレビュー",
  },
  app: {
    title: "Sooner — AIネイティブIDE | ビルド・プレビュー・公開",
    description:
      "Soonerにログイン：複数ファイル、AIエージェント、ターミナル、ライブプレビュー、Git、クラウドストレージをひとつのタブで。AIネイティブIDE。",
    ogTitle: "Sooner — AIネイティブIDE",
    ogDescription: "ブラウザでビルド、プレビュー、公開。AIネイティブIDEとクラウド同期。",
    keywords: "Sooner, AI IDE, オンラインエディタ, ブラウザIDE, コードプレビュー, クラウドプロジェクト, AIコーディング",
  },
  signup: {
    title: "Sooner — 無料アカウント作成 | AIネイティブIDE",
    description: "Soonerの無料アカウントを作成。メール、Google、GitHubで登録。AIネイティブIDEで今すぐ開発を始めましょう。",
    ogTitle: "Sooner — 無料で始める",
    ogDescription: "Soonerの無料アカウントを作成してAIで開発を始める。",
    keywords: "Sooner アカウント作成, 無料AI IDE, ブラウザエディタ登録, AIコーディングツール",
  },
  signin: {
    title: "Sooner — ログイン | AIネイティブIDE",
    description: "Soonerにログインしてプロジェクトを開く。ライブプレビュー、Git、クラウド同期のAIネイティブIDE。",
    ogTitle: "Sooner — ログイン",
    ogDescription: "SoonerのAIネイティブIDEとプロジェクトにアクセス。",
    keywords: "Sooner ログイン, サインイン, AI IDEアクセス, クラウドプロジェクト, オンラインエディタ",
  },
  blog: {
    title: "Sooner ブログ — ニュース・チュートリアル・更新情報 | AIネイティブIDE",
    description: "Soonerチームからのプロダクト更新、Tips、チュートリアル。AIネイティブIDE、Web開発、効率的な開発について。",
    ogTitle: "Sooner ブログ — ニュースとチュートリアル",
    ogDescription: "Soonerチームからのプロダクト更新とチュートリアル。AIネイティブIDEの最新情報。",
    keywords: "Sooner ブログ, AI IDEチュートリアル, Web開発Tips, ブラウザIDE更新情報, Soonerニュース",
  },
};

function hostKey(hostname: string, pathname: string): string {
  const h = hostname.toLowerCase();
  const path = (pathname || "/").split("?")[0].replace(/\/$/, "") || "/";
  if (h === "localhost" || h === "127.0.0.1") {
    if (path === "/signin") return "signin";
    if (path === "/signup") return "signup";
    return "site";
  }
  if (h.startsWith("lp.")) return "site";
  if (h.startsWith("blog.")) return "blog";
  if (h.startsWith("signup.")) return "signup";
  if (h.startsWith("signin.") || h.startsWith("login.")) return "signin";
  if (h === "sooner.sh") {
    if (path === "/signin") return "signin";
    if (path === "/signup") return "signup";
    return "app";
  }
  return "app";
}

function canonicalUrl(): string {
  const { protocol, hostname, pathname, search } = window.location;
  const path = pathname === "" ? "/" : pathname;
  const h = hostname.toLowerCase();
  // Blog / LP: one canonical per pathname; language variants use hreflang (?lang=…). Avoids
  // Search Console treating https://blog.sooner.sh/?lang=en as the "canonical" tagged URL for duplicates.
  if (h.startsWith("blog.") || h.startsWith("lp.")) {
    return `${protocol}//${hostname}${path}`;
  }
  // Main app: apex host + path only (no ?lang=) so / and /?lang=ja are not competing canonicals;
  // www → apex to fix "Google chose a different canonical than the user" duplicate clusters.
  const appApex = "sooner.sh";
  if (h === appApex || h === `www.${appApex}`) {
    return `https://${appApex}${path}`;
  }
  if (h.startsWith("signup.") && h.endsWith(".sooner.sh")) {
    return `https://${appApex}/signup`;
  }
  if ((h.startsWith("signin.") || h.startsWith("login.")) && h.endsWith(".sooner.sh")) {
    return `https://${appApex}/signin`;
  }
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
  if (!host.startsWith("lp.") && !host.startsWith("blog.")) return;
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

export type SeoOverrides = {
  lang?: SeoLang;
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  keywords?: string;
};

function buildJsonLd(key: string, lang: SeoLang): object[] {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sooner",
    url: "https://sooner.sh/",
    logo: OG_IMAGE,
    sameAs: [],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sooner",
    url: "https://sooner.sh/",
    description: (lang === "ja" ? ja : en).site.description,
    inLanguage: ["en", "ja"],
    publisher: { "@type": "Organization", name: "Sooner", url: "https://sooner.sh/" },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://sooner.sh/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  if (key === "site" || key === "app" || key === "signin" || key === "signup") {
    const navItems = lang === "ja" ? [
      { name: "Sooner — AIネイティブIDE", url: "https://sooner.sh/" },
      { name: "新規登録", url: "https://sooner.sh/signup" },
      { name: "ログイン", url: "https://sooner.sh/signin" },
      { name: "ブログ", url: "https://blog.sooner.sh/" },
      { name: "ランディングページ", url: "https://lp.sooner.sh/" },
    ] : [
      { name: "Sooner — AI-native IDE", url: "https://sooner.sh/" },
      { name: "Sign Up", url: "https://sooner.sh/signup" },
      { name: "Sign In", url: "https://sooner.sh/signin" },
      { name: "Blog", url: "https://blog.sooner.sh/" },
      { name: "About Sooner", url: "https://lp.sooner.sh/" },
    ];
    const siteNav = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Sooner primary navigation",
      itemListElement: navItems.map((item, i) => ({
        "@type": "SiteNavigationElement",
        position: i + 1,
        name: item.name,
        url: item.url,
      })),
    };

    const out: object[] = [org, website];

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
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          ratingCount: "12",
        },
      };

      const faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: lang === "ja" ? [
          { "@type": "Question", name: "Soonerとは何ですか？", acceptedAnswer: { "@type": "Answer", text: "SoonerはブラウザベースのAIネイティブIDEです。自然言語で指示するだけで、AIがコードを生成、プレビュー、デプロイまで行います。インストール不要で、ブラウザだけで開発が完結します。" } },
          { "@type": "Question", name: "Soonerは無料ですか？", acceptedAnswer: { "@type": "Answer", text: "はい、Soonerは無料で利用できます。メール、Google、またはGitHubアカウントでサインアップするだけで始められます。" } },
          { "@type": "Question", name: "どのプログラミング言語に対応していますか？", acceptedAnswer: { "@type": "Answer", text: "JavaScript、TypeScript、Python、Go、Rust、HTML/CSSなど、幅広い言語とフレームワーク（React、Vue、Next.js、Three.jsなど）に対応しています。" } },
        ] : [
          { "@type": "Question", name: "What is Sooner?", acceptedAnswer: { "@type": "Answer", text: "Sooner is a browser-based AI-native IDE. Describe what you want in natural language and AI builds, previews, and ships your code in seconds. No installation required." } },
          { "@type": "Question", name: "Is Sooner free?", acceptedAnswer: { "@type": "Answer", text: "Yes, Sooner is free to use. Sign up with email, Google, or GitHub and start building immediately." } },
          { "@type": "Question", name: "What programming languages does Sooner support?", acceptedAnswer: { "@type": "Answer", text: "Sooner supports JavaScript, TypeScript, Python, Go, Rust, HTML/CSS, and popular frameworks like React, Vue, Next.js, and Three.js." } },
        ],
      };
      out.push(softwareApp);
      out.push(faq);
    } else {
      const table = lang === "ja" ? ja : en;
      const pack = key === "signin" ? table.signin : table.signup;
      out.push({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: pack.title,
        url: key === "signin" ? "https://sooner.sh/signin" : "https://sooner.sh/signup",
        description: pack.description,
        isPartOf: { "@type": "WebSite", name: "Sooner", url: "https://sooner.sh/" },
      });
    }

    out.push(siteNav);
    return out;
  }

  if (key === "blog") {
    const blogDesc = (lang === "ja" ? ja : en).blog.description;
    const blogName = lang === "ja" ? "Sooner ブログ" : "Sooner Blog";
    const blogSite = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: blogName,
      url: "https://blog.sooner.sh/",
      description: blogDesc,
      inLanguage: ["en", "ja"],
      publisher: org,
    };
    const blog = {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: blogName,
      url: "https://blog.sooner.sh/",
      description: blogDesc,
      publisher: { "@type": "Organization", name: "Sooner", logo: { "@type": "ImageObject", url: OG_IMAGE } },
      mainEntityOfPage: { "@type": "WebPage", "@id": "https://blog.sooner.sh/" },
    };
    return [org, blogSite, blog];
  }

  return [org, website];
}

/** Call on mount and when language or host context changes. Pass `lang` from React state when URL does not carry `?lang=`. */
export function applyDocumentSeo(override?: SeoOverrides): void {
  if (typeof document === "undefined") return;

  const hostname = window.location.hostname;
  const key = hostKey(hostname, window.location.pathname);
  const lang = override?.lang ?? getLangForSeo();
  const table = lang === "ja" ? ja : en;
  const pack = table[key] ?? table.app;
  const title = override?.title ?? pack.title;
  const description = override?.description ?? pack.description;
  const ogTitle = override?.ogTitle ?? pack.ogTitle;
  const ogDescription = override?.ogDescription ?? pack.ogDescription;
  const keywords = override?.keywords ?? pack.keywords;

  const url = canonicalUrl();
  document.title = title;
  setMeta("name", "description", description);
  setMeta("name", "keywords", keywords);
  setMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1");
  setMeta("name", "author", "Sooner");
  setMeta("property", "og:title", ogTitle);
  setMeta("property", "og:description", ogDescription);
  setMeta("property", "og:url", url);
  setMeta("property", "og:type", key === "blog" ? "blog" : "website");
  setMeta("property", "og:site_name", "Sooner");
  setMeta("property", "og:image", OG_IMAGE);
  setMeta("property", "og:locale", lang === "ja" ? "ja_JP" : "en_US");
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", ogTitle);
  setMeta("name", "twitter:description", ogDescription);
  setMeta("name", "twitter:image", OG_IMAGE);

  setLink("canonical", url);

  document.documentElement.lang = lang === "ja" ? "ja" : "en";

  injectHreflangForLanding();

  const schemas = buildJsonLd(key, lang);
  document.querySelectorAll('script[data-sooner-ld], script[data-sooner-inline-ld]').forEach((n) => n.remove());
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

/** Inject Article-level JSON-LD + per-article OG tags when viewing a blog post. */
export function applyArticleSeo(article: {
  title: string;
  description: string;
  slug: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  imageUrl?: string;
  lang: SeoLang;
}): void {
  if (typeof document === "undefined") return;

  const url = `https://blog.sooner.sh/${article.slug}`;
  const img = article.imageUrl || OG_IMAGE;

  document.title = `${article.title} — Sooner Blog`;
  setMeta("name", "description", article.description);
  setMeta("property", "og:title", article.title);
  setMeta("property", "og:description", article.description);
  setMeta("property", "og:url", url);
  setMeta("property", "og:type", "article");
  setMeta("property", "og:image", img);
  setMeta("property", "article:author", article.author);
  setMeta("property", "article:published_time", article.publishedAt);
  if (article.updatedAt) setMeta("property", "article:modified_time", article.updatedAt);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", article.title);
  setMeta("name", "twitter:description", article.description);
  setMeta("name", "twitter:image", img);
  setLink("canonical", url);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url,
    image: img,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: { "@type": "Person", name: article.author },
    publisher: {
      "@type": "Organization",
      name: "Sooner",
      logo: { "@type": "ImageObject", url: OG_IMAGE },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  document.querySelectorAll("script[data-sooner-ld], script[data-sooner-inline-ld]").forEach((n) => n.remove());
  const el = document.createElement("script");
  el.type = "application/ld+json";
  el.setAttribute("data-sooner-ld", "article");
  el.textContent = JSON.stringify(articleLd);
  document.head.appendChild(el);
}
