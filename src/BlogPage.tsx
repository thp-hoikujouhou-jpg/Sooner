import React, { useState, useEffect } from "react";
import { Zap, Loader2, X, Menu, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import axios from "axios";
import { applyDocumentSeo, applyArticleSeo } from "./seo";
import { writeStoredLanguage } from "./language";
import { cn, BACKEND_BASE, blogI18n, getInitialLang, type BlogPost } from "./shared";

export default function BlogPage() {
  const [lang, setLang] = useState<"en" | "ja">(getInitialLang);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(() => {
    const p = window.location.pathname.replace(/^\//, "");
    return p || null;
  });
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const t = blogI18n[lang];
  const isProduction = window.location.hostname.endsWith("sooner.sh");

  useEffect(() => { applyDocumentSeo({ lang }); }, [lang]);
  useEffect(() => {
    if (mobileNavOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  useEffect(() => {
    setLoading(true);
    axios.get(`${BACKEND_BASE}/api/blog/posts`).then(r => setPosts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeSlug) { setActivePost(null); return; }
    axios.get(`${BACKEND_BASE}/api/blog/posts/${activeSlug}`).then(r => {
      setActivePost(r.data);
      axios.post(`${BACKEND_BASE}/api/blog/posts/${activeSlug}/view`).catch(() => {});
      const post = r.data;
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
    }).catch(() => setActiveSlug(null));
  }, [activeSlug]);

  const openPost = (slug: string) => { setActiveSlug(slug); window.history.pushState(null, "", `/${slug}`); };
  const goBack = () => { setActiveSlug(null); setActivePost(null); window.history.pushState(null, "", "/"); };

  const goMarketing = () => { setMobileNavOpen(false); if (isProduction) { window.location.href = `${window.location.protocol}//site.sooner.sh${lang !== "en" ? `?lang=${lang}` : ""}`; } else { window.location.href = "/"; } };
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
          <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8] font-semibold mb-8 hover:underline">
              <ArrowRight className="w-3 h-3 rotate-180" /> {t.backToList}
            </button>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1A1A1A] border border-white/[0.06] text-[10px] font-medium text-[#71717A]">{formatDate(activePost.publishAt)}</span>
              <span className="text-[10px] text-[#52525B]">{activePost.author}</span>
              <span className="text-[10px] text-[#3F3F46]">{lang === "ja" ? activePost.readingTime_ja : activePost.readingTime_en}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-8">{lang === "ja" ? activePost.title_ja : activePost.title_en}</h1>
            <div className="prose prose-invert max-w-none text-[#E4E3E0] leading-[1.8] text-sm sm:text-base [&_h2]:text-xl [&_h2]:font-black [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:mb-4 [&_a]:text-[#38BDF8] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_code]:bg-[#1A1A1A] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[#38BDF8] [&_code]:text-xs [&_pre]:bg-[#0F0F0F] [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:mb-6 [&_img]:rounded-xl [&_img]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-[#38BDF8]/30 [&_blockquote]:pl-4 [&_blockquote]:text-[#8E9299] [&_blockquote]:italic"
              dangerouslySetInnerHTML={{ __html: lang === "ja" ? activePost.content_ja : activePost.content_en }}
            />
          </motion.article>
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

      <footer className="relative z-10 px-4 sm:px-8 py-8 border-t border-white/[0.06] text-center">
        <p className="text-xs text-[#52525B]">{t.footer}</p>
        <p className="mt-2 text-[10px] text-[#3F3F46]">{t.copyright}</p>
      </footer>
    </div>
  );
}
