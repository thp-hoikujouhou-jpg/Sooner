import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { readStoredLanguage } from "./language";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || "";

export type BlogPost = {
  id: string;
  slug: string;
  title_en: string;
  title_ja: string;
  content_en: string;
  content_ja: string;
  excerpt_en: string;
  excerpt_ja: string;
  author: string;
  readingTime_en: string;
  readingTime_ja: string;
  tags: string[];
  status: string;
  publishAt: any;
  createdAt: any;
  updatedAt: any;
  viewCount?: number;
};

export const blogI18n = {
  en: {
    title: "Sooner Blog",
    subtitle: "Product updates, tutorials, and notes from the team.",
    navMarketing: "Marketing site",
    navApp: "Open app",
    langToggle: "日本語",
    postsHeading: "Latest posts",
    readMore: "Read more",
    loading: "Loading...",
    noPosts: "No posts yet. Stay tuned!",
    backToList: "Back to all posts",
    footer: "Sooner beta — Build sooner, ship faster",
    copyright: "© 2026 Sooner. All rights reserved.",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
  },
  ja: {
    title: "Sooner ブログ",
    subtitle: "プロダクトのアップデート、チュートリアル、チームからのメモ。",
    navMarketing: "マーケサイト",
    navApp: "アプリを開く",
    langToggle: "EN",
    postsHeading: "最新の記事",
    readMore: "続きを読む",
    loading: "読み込み中...",
    noPosts: "まだ記事はありません。お楽しみに！",
    backToList: "記事一覧に戻る",
    footer: "Sooner ベータ — Build sooner, ship faster",
    copyright: "© 2026 Sooner. All rights reserved.",
    terms: "利用規約",
    privacy: "プライバシーポリシー",
  },
};

export const cmsI18n = {
  en: {
    title: "Sooner CMS",
    login: "Log in",
    username: "Username",
    password: "Password",
    loginError: "Invalid credentials",
    dashboard: "Dashboard",
    newPost: "New Post",
    editPost: "Edit Post",
    posts: "Posts",
    save: "Save",
    publish: "Publish",
    delete: "Delete",
    cancel: "Cancel",
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
    slug: "Slug",
    titleEn: "Title (EN)",
    titleJa: "Title (JA)",
    contentEn: "Content (EN)",
    contentJa: "Content (JA)",
    excerptEn: "Excerpt (EN)",
    excerptJa: "Excerpt (JA)",
    author: "Author",
    readingTimeEn: "Reading time (EN)",
    readingTimeJa: "Reading time (JA)",
    tags: "Tags (comma separated)",
    status: "Status",
    publishDate: "Publish date",
    preview: "Preview",
    editor: "Editor",
    confirmDelete: "Delete this post?",
    saving: "Saving...",
    logout: "Log out",
    langToggle: "日本語",
    views: "views",
    uploadImage: "Upload Image",
    uploading: "Uploading...",
  },
  ja: {
    title: "Sooner CMS",
    login: "ログイン",
    username: "ユーザー名",
    password: "パスワード",
    loginError: "認証情報が無効です",
    dashboard: "ダッシュボード",
    newPost: "新規記事",
    editPost: "記事を編集",
    posts: "記事一覧",
    save: "保存",
    publish: "公開",
    delete: "削除",
    cancel: "キャンセル",
    draft: "下書き",
    scheduled: "予約済み",
    published: "公開済み",
    slug: "スラッグ",
    titleEn: "タイトル（英語）",
    titleJa: "タイトル（日本語）",
    contentEn: "本文（英語）",
    contentJa: "本文（日本語）",
    excerptEn: "抜粋（英語）",
    excerptJa: "抜粋（日本語）",
    author: "著者",
    readingTimeEn: "読了時間（英語）",
    readingTimeJa: "読了時間（日本語）",
    tags: "タグ（カンマ区切り）",
    status: "ステータス",
    publishDate: "公開日",
    preview: "プレビュー",
    editor: "エディタ",
    confirmDelete: "この記事を削除しますか？",
    saving: "保存中...",
    logout: "ログアウト",
    langToggle: "EN",
    views: "閲覧",
    uploadImage: "画像アップロード",
    uploading: "アップロード中...",
  },
};

export function getInitialLang(): "en" | "ja" {
  const params = new URLSearchParams(window.location.search);
  const paramLang = params.get("lang");
  if (paramLang === "ja" || paramLang === "en") return paramLang;
  return readStoredLanguage();
}

/** Contact for legal / privacy inquiries (shown on legal pages). */
export const LEGAL_CONTACT_EMAIL = "soonerutingna@gmail.com";

/**
 * Sign-in and sign-up use the same origin as the IDE (sooner.sh) so Firebase Auth persists.
 * Legacy signin.* / signup.* hostnames should redirect to /signin and /signup on sooner.sh.
 */
export function navigateToAuthPage(mode: "signin" | "signup", lang?: "en" | "ja") {
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  const path = mode === "signin" ? "/signin" : "/signup";
  const h = typeof window !== "undefined" ? window.location.hostname : "";
  if (h === "localhost" || h === "127.0.0.1") {
    window.location.href = `${window.location.origin}${path}${langParam}`;
  } else {
    window.location.href = `https://sooner.sh${path}${langParam}`;
  }
}

export function navigateToSubdomain(sub: "site" | "signup" | "signin", lang?: "en" | "ja") {
  const proto = window.location.protocol;
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  if (sub === "site") {
    window.location.href = `${proto}//lp.sooner.sh${langParam}`;
    return;
  }
  navigateToAuthPage(sub === "signin" ? "signin" : "signup", lang);
}

export function navigateToBlog(lang: "en" | "ja") {
  const langParam = lang !== "en" ? `?lang=${lang}` : "";
  const proto =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "https:"
      : window.location.protocol;
  window.location.href = `${proto}//blog.sooner.sh${langParam}`;
}

/** Legal pages: https://sooner.sh/legal/{en|ja}/{terms|privacy} */
export function legalDocHref(locale: "en" | "ja", doc: "terms" | "privacy"): string {
  const path = `/legal/${locale}/${doc}`;
  if (typeof window === "undefined") return `https://sooner.sh${path}`;
  const h = window.location.hostname;
  if (h === "sooner.sh" || h === "localhost" || h === "127.0.0.1") {
    return path;
  }
  if (h.endsWith("sooner.sh")) {
    return `${window.location.protocol}//sooner.sh${path}`;
  }
  return path;
}
