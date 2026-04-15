import React, { useState, useEffect, useCallback } from "react";
import { Zap, Loader2, X, Menu, BookOpen, ArrowRight, Clock, User } from "lucide-react";
import { motion } from "motion/react";
import axios from "axios";
import { applyDocumentSeo, applyArticleSeo } from "./seo";
import { writeStoredLanguage } from "./language";
import { cn, BACKEND_BASE, blogI18n, getInitialLang, legalDocHref, type BlogPost } from "./shared";

function pathSegmentToSlug(pathname: string): string | null {
  const raw = pathname.replace(/^\/+/, "").split("/")[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function BlogPage() {
  const [lang, setLang] = useState<"en" | "ja">(getInitialLang);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(() => pathSegmentToSlug(window.location.pathname));
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<"notfound" | "network" | null>(null);
  const t = blogI18n[lang];
  const isProduction = window.location.hostname.endsWith("sooner.sh");

  useEffect(() => { applyDocumentSeo({ lang }); }, [lang]);
  useEffect(() => {
    if (mobileNavOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  const fetchPostList = useCallback((opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    axios
      .get(`${BACKEND_BASE}/api/blog/posts`)
      .then((r) => setPosts(r.data))
      .catch(() => {})
      .finally(() => {
        if (!opts?.silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchPostList();
  }, [fetchPostList]);

  useEffect(() => {
    if (activeSlug != null) return;
    const id = window.setInterval(() => fetchPostList({ silent: true }), 45_000);
    return () => window.clearInterval(id);
  }, [activeSlug, fetchPostList]);

  useEffect(() => {
    const onPop = () => setActiveSlug(pathSegmentToSlug(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!activeSlug) {
      setActivePost(null);
      setPostError(null);
      setPostLoading(false);
      return;
    }
    setActivePost(null);
    setPostError(null);
    setPostLoading(true);
    const enc = encodeURIComponent(activeSlug);
    axios
      .get(`${BACKEND_BASE}/api/blog/posts/${enc}`)
      .then((r) => {
        setActivePost(r.data);
        axios.post(`${BACKEND_BASE}/api/blog/posts/${enc}/view`).catch(() => {});
      })
      .catch((err) => {
        const st = err?.response?.status;
        setPostError(st === 404 ? "notfound" : "network");
      })
      .finally(() => setPostLoading(false));
  }, [activeSlug]);

  useEffect(() => {
    if (!activePost || !activeSlug) return;
    const post = activePost;
    const pubDate = post.publishAt?._seconds
      ? new Date(post.publishAt._seconds * 1000).toISOString()
      : typeof post.publishAt === "string" ? post.publishAt : new Date().toISOString();
    applyArticleSeo({
      title: lang === "ja" ? (post.title_ja || post.title_en) : (post.title_en || post.title_ja),
      description: lang === "ja" ? (post.excerpt_ja || post.excerpt_en) : (post.excerpt_en || post.excerpt_ja),
      slug: post.slug,
      author: post.author,
      publishedAt: pubDate,
      lang,
    });
  }, [activePost, activeSlug, lang]);

  const openPost = (slug: string) => {
    setPostError(null);
    setActiveSlug(slug);
    window.history.pushState(null, "", `/${encodeURIComponent(slug)}`);
  };
  const goBack = () => {
    setActiveSlug(null);
    setActivePost(null);
    setPostError(null);
    window.history.pushState(null, "", "/");
  };

  const retryArticle = () => {
    if (!activeSlug) return;
    setPostError(null);
    setPostLoading(true);
    const enc = encodeURIComponent(activeSlug);
    axios
      .get(`${BACKEND_BASE}/api/blog/posts/${enc}`)
      .then((r) => {
        setActivePost(r.data);
        axios.post(`${BACKEND_BASE}/api/blog/posts/${enc}/view`).catch(() => {});
      })
      .catch((err) => {
        const st = err?.response?.status;
        setPostError(st === 404 ? "notfound" : "network");
      })
      .finally(() => setPostLoading(false));
  };

  const goMarketing = () => { setMobileNavOpen(false); if (isProduction) { window.location.href = `${window.location.protocol}//lp.sooner.sh${lang !== "en" ? `?lang=${lang}` : ""}`; } else { window.location.href = "/"; } };
  const goApp = () => { setMobileNavOpen(false); if (isProduction) { window.location.href = `${window.location.protocol}//sooner.sh`; } else { window.location.href = "/"; } };
  const toggleLang = () => { const next = lang === "en" ? "ja" : "en"; writeStoredLanguage(next); setLang(next); };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return lang === "ja" ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const navButtons = (
    <>
      <button type="button" onClick={() => { toggleLang(); setMobileNavOpen(false); }} className="w-full md:w-auto px-3 py-1.5 text-xs font-semibold text-[#71717A] hover:text-white border border-white/[0.08] rounded-lg transition-colors text-left md:text-center">{t.langToggle}</button>
      <button type="button" onClick={goMarketing} className="w-full md:w-auto px-3 py-1.5 text-xs font-semibold text-[#8E9299] hover:text-white border border-white/[0.08] rounded-lg transition-colors text-left md:text-center">{t.navMarketing}</button>
      <button type="button" onClick={goApp} className="w-full md:w-auto px-4 py-2 text-sm font-bold bg-[#38BDF8] text-white rounded-xl hover:bg-[#0EA5E9] transition-colors text-center">{t.navApp}</button>
    </>
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#38BDF8]/[0.03] blur-[120px]" />
      </div>

      <header className="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-4 md:py-5 border-b border-white/[0.06] backdrop-blur-sm bg-[#09090B]/80">
        <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={goBack}>
          <div className="relative shrink-0"><Zap className="w-6 h-6 text-[#38BDF8]" /><div className="absolute inset-0 w-6 h-6 bg-[#38BDF8]/20 blur-md rounded-full" /></div>
          <span className="font-black text-base sm:text-lg tracking-tight truncate">{t.title}</span>
        </div>
        <nav className="hidden md:flex flex-wrap items-center justify-end gap-2 lg:gap-3">{navButtons}</nav>
        <button type="button" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(o => !o)} className="md:hidden p-2 rounded-lg border border-white/[0.08] text-[#E4E4E7] hover:bg-white/[0.04]">
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {mobileNavOpen && (
        <>
          <button type="button" aria-hidden className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={() => setMobileNavOpen(false)} />
          <div className="fixed top-[57px] right-0 left-0 z-50 md:hidden border-b border-white/[0.06] bg-[#0c0c0e]/95 backdrop-blur-md shadow-xl px-4 py-4 flex flex-col gap-3">{navButtons}</div>
        </>
      )}

      <main className="relative z-10 flex-1 px-4 sm:px-6 md:px-8 py-8 sm:py-14 max-w-3xl mx-auto w-full">
        {activePost ? (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto"
          >
            <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8] font-semibold mb-8 hover:underline group">
              <ArrowRight className="w-3 h-3 rotate-180 transition-transform group-hover:-translate-x-0.5" /> {t.backToList}
            </button>

            <div
              className={cn(
                "rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01]",
                "shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_24px_48px_-12px_rgba(0,0,0,0.5)]",
                "overflow-hidden"
              )}
            >
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#38BDF8]/40 to-transparent" />
              <div className="px-6 sm:px-10 pt-8 sm:pt-10 pb-10 sm:pb-12">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6 text-[11px] text-[#71717A]">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141416] border border-white/[0.08] text-[#A1A1AA]">
                    <Clock className="w-3 h-3 text-[#38BDF8]/80 shrink-0" />
                    {formatDate(activePost.publishAt)}
                  </span>
                  <span className="text-[#3F3F46] select-none" aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[#52525B] shrink-0" />
                    {activePost.author}
                  </span>
                  <span className="text-[#3F3F46] select-none" aria-hidden>·</span>
                  <span>{lang === "ja" ? activePost.readingTime_ja : activePost.readingTime_en}</span>
                </div>

                <h1 className="text-[1.75rem] sm:text-4xl md:text-[2.35rem] font-black tracking-tight text-white leading-[1.15] mb-8">
                  {lang === "ja" ? activePost.title_ja : activePost.title_en}
                </h1>

                {activePost.tags && activePost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-10">
                    {activePost.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#38BDF8]/[0.08] text-[#7dd3fc] border border-[#38BDF8]/15"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="h-px w-full bg-gradient-to-r from-[#38BDF8]/20 via-white/[0.08] to-transparent mb-10" />

                <div
                  className={cn(
                    "prose prose-invert max-w-none text-[#D4D4D8] leading-[1.85] text-[15px] sm:text-base",
                    "[&_h2]:text-xl [&_h2]:font-black [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-white [&_h2]:tracking-tight",
                    "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-[#E4E4E7]",
                    "[&_p]:mb-5 [&_p]:text-[#C4C4CC]",
                    "[&_a]:text-[#38BDF8] [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[#38BDF8]/40 hover:[&_a]:decoration-[#38BDF8]",
                    "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1.5 [&_li]:text-[#C4C4CC]",
                    "[&_code]:bg-[#141416] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[#7dd3fc] [&_code]:text-[0.85em] [&_code]:border [&_code]:border-white/[0.06]",
                    "[&_pre]:bg-[#0a0a0c] [&_pre]:p-5 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:mb-8 [&_pre]:border [&_pre]:border-white/[0.07] [&_pre]:shadow-inner",
                    "[&_img]:rounded-xl [&_img]:my-8 [&_img]:border [&_img]:border-white/[0.06] [&_img]:shadow-lg",
                    "[&_blockquote]:border-l-[3px] [&_blockquote]:border-[#38BDF8]/50 [&_blockquote]:pl-5 [&_blockquote]:text-[#9CA3AF] [&_blockquote]:italic [&_blockquote]:bg-white/[0.02] [&_blockquote]:py-3 [&_blockquote]:pr-4 [&_blockquote]:rounded-r-lg"
                  )}
                  dangerouslySetInnerHTML={{ __html: lang === "ja" ? activePost.content_ja : activePost.content_en }}
                />
              </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-8 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white/[0.04] border border-white/[0.08] text-[#E4E4E7] hover:border-[#38BDF8]/30 hover:bg-[#38BDF8]/[0.06] transition-all"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                {t.backToList}
              </button>
            </div>
          </motion.article>
        ) : activeSlug ? (
          <div className="max-w-2xl mx-auto py-12">
            <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8] font-semibold mb-8 hover:underline group">
              <ArrowRight className="w-3 h-3 rotate-180 transition-transform group-hover:-translate-x-0.5" /> {t.backToList}
            </button>
            {postLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
                <p className="text-sm text-[#71717A]">{t.articleLoading}</p>
              </div>
            ) : postError ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-10 text-center">
                <p className="text-[#A1A1AA] text-sm mb-6">{postError === "notfound" ? t.articleNotFound : t.articleLoadError}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={retryArticle} className="px-4 py-2 rounded-xl text-xs font-bold bg-[#38BDF8] text-white hover:bg-[#0EA5E9] transition-colors">
                    {t.retryArticle}
                  </button>
                  <button type="button" onClick={goBack} className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/[0.12] text-[#E4E4E7] hover:bg-white/[0.04] transition-colors">
                    {t.backToList}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <div className="mb-10 sm:mb-14 pb-8 sm:pb-10 border-b border-white/[0.06]">
                <div className="inline-flex items-center gap-2 bg-[#38BDF8]/[0.06] border border-[#38BDF8]/15 rounded-full px-3 py-1 mb-5">
                  <BookOpen className="w-3 h-3 text-[#38BDF8]" />
                  <span className="text-[10px] text-[#38BDF8] font-semibold uppercase tracking-wider">Blog</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">{t.title}</h1>
                <p className="text-[#71717A] text-sm sm:text-base max-w-xl leading-relaxed">{t.subtitle}</p>
              </div>
            </motion.div>

            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#38BDF8] mb-8">{t.postsHeading}</h2>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#38BDF8] animate-spin" /></div>
            ) : posts.length === 0 ? (
              <p className="text-[#52525B] text-sm text-center py-20">{t.noPosts}</p>
            ) : (
              <ul className="space-y-6">
                {posts.map((post, i) => (
                  <motion.li key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}>
                    <button type="button" onClick={() => openPost(post.slug)} className="w-full text-left group relative rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:border-[#38BDF8]/20 hover:bg-[#38BDF8]/[0.02] transition-all duration-300 overflow-hidden">
                      <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-[#38BDF8]/60 via-[#38BDF8]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="p-6 sm:p-8">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1A1A1A] border border-white/[0.06] text-[10px] font-medium text-[#71717A]">{formatDate(post.publishAt)}</span>
                          <span className="text-[10px] text-[#52525B]">{post.author}</span>
                          <span className="text-[10px] text-[#3F3F46]">{lang === "ja" ? post.readingTime_ja : post.readingTime_en}</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-[#38BDF8] transition-colors duration-300">{lang === "ja" ? post.title_ja : post.title_en}</h3>
                        <p className="text-[#A1A1AA] text-sm leading-[1.7] mb-4">{lang === "ja" ? post.excerpt_ja : post.excerpt_en}</p>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38BDF8] opacity-0 group-hover:opacity-100 transition-opacity duration-300">{t.readMore} <ArrowRight className="w-3 h-3" /></span>
                      </div>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <footer className="relative z-10 px-4 sm:px-8 py-8 border-t border-white/[0.06] text-center space-y-3">
        <p className="text-xs text-[#52525B]">{t.footer}</p>
        <p className="text-[10px] text-[#3F3F46]">{t.copyright}</p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] pt-1">
          <a href={legalDocHref(lang, "terms")} className="text-[#71717A] hover:text-[#38BDF8] transition-colors">{t.terms}</a>
          <span className="text-[#3F3F46]">·</span>
          <a href={legalDocHref(lang, "privacy")} className="text-[#71717A] hover:text-[#38BDF8] transition-colors">{t.privacy}</a>
        </div>
      </footer>
    </div>
  );
}
