import React, { useState, useEffect, useRef } from "react";
import { Zap, Loader2, FileCode, Trash2, ArrowRight, Eye } from "lucide-react";
import { motion } from "motion/react";
import axios from "axios";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { writeStoredLanguage } from "./language";
import { cn, BACKEND_BASE, cmsI18n, getInitialLang, isBlogPostPublicVisibleClient, type BlogPost } from "./shared";

function cmsPublicBlogOrigin(): string {
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return window.location.origin;
  if (h === "blog.sooner.sh") return window.location.origin;
  if (h.endsWith("sooner.sh")) return "https://blog.sooner.sh";
  return window.location.origin;
}

function cmsPublicBlogHint(post: Pick<BlogPost, "status" | "publishAt">, nowMs: number, t: typeof cmsI18n.en): string {
  if (isBlogPostPublicVisibleClient(post, nowMs)) return t.blogOnPublicBlog;
  if (post.status === "draft") return t.blogDraftHidden;
  if (post.status === "scheduled") return t.blogScheduledHidden;
  return t.blogDraftHidden;
}

export default function CmsPage() {
  const [lang, setLang] = useState<"en" | "ja">(getInitialLang);
  const [token, setToken] = useState(() => localStorage.getItem("cms_token") || "");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [saving, setSaving] = useState(false);
  const [contentTab, setContentTab] = useState<"en" | "ja">("en");
  const [viewMode, setViewMode] = useState<"editor" | "preview">("editor");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const t = cmsI18n[lang];

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!token) return;
    axios.get(`${BACKEND_BASE}/api/cms/posts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setPosts(r.data); setLoggedIn(true); })
      .catch(() => { setToken(""); localStorage.removeItem("cms_token"); });
  }, [token]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const r = await axios.post(`${BACKEND_BASE}/api/cms/login`, { user: loginUser, password: loginPass });
      const tk = r.data.token;
      setToken(tk);
      localStorage.setItem("cms_token", tk);
    } catch { setLoginError(t.loginError); }
  };

  const logout = () => { setToken(""); setLoggedIn(false); localStorage.removeItem("cms_token"); };

  const fetchPosts = async () => {
    setLoading(true);
    try { const r = await axios.get(`${BACKEND_BASE}/api/cms/posts`, { headers }); setPosts(r.data); } catch {}
    setLoading(false);
  };

  /** datetime-local is interpreted in the browser's local TZ; send UTC ISO so the API stores the intended instant. */
  const publishAtAsIso = (raw: unknown): string => {
    if (raw == null || raw === "") return new Date().toISOString();
    if (typeof raw === "string") {
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }
    if (typeof raw === "object" && raw !== null && "_seconds" in raw) {
      return new Date((raw as { _seconds: number })._seconds * 1000).toISOString();
    }
    return new Date().toISOString();
  };

  const savePost = async () => {
    if (!editingPost) return;
    setSaving(true);
    try {
      const payload = {
        slug: editingPost.slug,
        title_en: editingPost.title_en,
        title_ja: editingPost.title_ja,
        content_en: editingPost.content_en,
        content_ja: editingPost.content_ja,
        excerpt_en: editingPost.excerpt_en,
        excerpt_ja: editingPost.excerpt_ja,
        author: editingPost.author,
        readingTime_en: editingPost.readingTime_en,
        readingTime_ja: editingPost.readingTime_ja,
        tags: editingPost.tags,
        status: editingPost.status,
        publishAt: publishAtAsIso(editingPost.publishAt),
      };
      if (editingPost.id) {
        await axios.put(`${BACKEND_BASE}/api/cms/posts/${editingPost.id}`, payload, { headers });
      } else {
        await axios.post(`${BACKEND_BASE}/api/cms/posts`, payload, { headers });
      }
      await fetchPosts();
      setEditingPost(null);
    } catch {}
    setSaving(false);
  };

  const deletePost = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    try { await axios.delete(`${BACKEND_BASE}/api/cms/posts/${id}`, { headers }); await fetchPosts(); } catch {}
  };

  const newPost = () => {
    setEditingPost({
      slug: "", title_en: "", title_ja: "", content_en: "", content_ja: "",
      excerpt_en: "", excerpt_ja: "", author: "Sooner Team",
      readingTime_en: "3 min read", readingTime_ja: "3分で読める",
      tags: [], status: "draft", publishAt: new Date().toISOString().slice(0, 16),
    });
    setContentTab("en");
    setViewMode("editor");
  };

  const editPost = (post: BlogPost) => {
    const pubDate = post.publishAt?._seconds
      ? new Date(post.publishAt._seconds * 1000).toISOString().slice(0, 16)
      : typeof post.publishAt === "string" ? post.publishAt.slice(0, 16) : new Date().toISOString().slice(0, 16);
    setEditingPost({ ...post, publishAt: pubDate });
    setContentTab("en");
    setViewMode("editor");
  };

  const updateField = (field: string, value: any) => setEditingPost(prev => prev ? { ...prev, [field]: value } : prev);

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { draft: "bg-[#3F3F46] text-[#A1A1AA]", scheduled: "bg-yellow-500/20 text-yellow-400", published: "bg-green-500/20 text-green-400" };
    const labels: Record<string, string> = { draft: t.draft, scheduled: t.scheduled, published: t.published };
    return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", colors[s] || colors.draft)}>{labels[s] || s}</span>;
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Zap className="w-7 h-7 text-[#38BDF8]" />
            <span className="font-black text-xl">{t.title}</span>
          </div>
          <form onSubmit={doLogin} className="space-y-4">
            <input value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder={t.username} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#38BDF8]" />
            <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder={t.password} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#38BDF8]" />
            {loginError && <p className="text-xs text-red-400">{loginError}</p>}
            <button type="submit" className="w-full py-2.5 bg-[#38BDF8] text-white rounded-xl font-bold text-sm hover:bg-[#0EA5E9] transition-colors">{t.login}</button>
          </form>
          <button type="button" onClick={() => { const n = lang === "en" ? "ja" : "en"; writeStoredLanguage(n); setLang(n); }} className="w-full text-center mt-6 text-xs text-[#52525B] hover:text-[#8E9299] transition-colors">{t.langToggle}</button>
        </motion.div>
      </div>
    );
  }

  if (editingPost) {
    return <CmsEditor post={editingPost} lang={lang} t={t} nowTick={nowTick} contentTab={contentTab} setContentTab={setContentTab} viewMode={viewMode} setViewMode={setViewMode} updateField={updateField} onSave={savePost} onCancel={() => setEditingPost(null)} saving={saving} token={token} />;
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#38BDF8]" />
          <span className="font-black text-sm">{t.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { const n = lang === "en" ? "ja" : "en"; writeStoredLanguage(n); setLang(n); }} className="px-3 py-1 text-xs text-[#71717A] hover:text-white border border-white/[0.08] rounded-lg">{t.langToggle}</button>
          <button type="button" onClick={newPost} className="px-4 py-1.5 text-xs font-bold bg-[#38BDF8] text-white rounded-lg hover:bg-[#0EA5E9] transition-colors">{t.newPost}</button>
          <button type="button" onClick={logout} className="px-3 py-1.5 text-xs text-[#8E9299] hover:text-white border border-white/[0.08] rounded-lg">{t.logout}</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#38BDF8]">{t.posts}</h2>
          <button type="button" onClick={() => fetchPosts()} className="px-3 py-1.5 text-[10px] font-semibold text-[#8E9299] hover:text-white border border-white/[0.08] rounded-lg shrink-0">{t.refreshPosts}</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#38BDF8] animate-spin" /></div>
        ) : posts.length === 0 ? (
          <p className="text-[#52525B] text-sm text-center py-20">{lang === "ja" ? "記事がありません" : "No posts yet"}</p>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-[#38BDF8]/20 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(post.status)}
                    <span className="text-[10px] text-[#52525B]">{post.author}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#52525B]"><Eye className="w-3 h-3" />{post.viewCount ?? 0} {t.views}</span>
                  </div>
                  <h3 className="text-sm font-bold truncate">{lang === "ja" ? post.title_ja || post.title_en : post.title_en || post.title_ja}</h3>
                  <p className="text-[10px] text-[#52525B] truncate">{post.slug}</p>
                  <p className="text-[10px] text-[#71717A] mt-1">{cmsPublicBlogHint(post, nowTick, t)}</p>
                  {isBlogPostPublicVisibleClient(post, nowTick) && post.slug ? (
                    <a href={`${cmsPublicBlogOrigin()}/${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#38BDF8] hover:underline mt-1 inline-block">{t.viewOnBlog}</a>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => editPost(post)} className="p-1.5 hover:bg-[#1A1A1A] rounded text-[#8E9299]"><FileCode className="w-4 h-4" /></button>
                  <button type="button" onClick={() => deletePost(post.id)} className="p-1.5 hover:bg-[#1A1A1A] rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CmsEditor({ post, lang, t, nowTick, contentTab, setContentTab, viewMode, setViewMode, updateField, onSave, onCancel, saving, token }: {
  post: Partial<BlogPost>; lang: "en" | "ja"; t: typeof cmsI18n.en; nowTick: number; contentTab: "en" | "ja";
  setContentTab: (t: "en" | "ja") => void; viewMode: "editor" | "preview"; setViewMode: (v: "editor" | "preview") => void;
  updateField: (f: string, v: any) => void; onSave: () => void; onCancel: () => void; saving: boolean; token: string;
}) {
  const [uploading, setUploading] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const editorEn = useEditor({
    extensions: [StarterKit, TiptapImage, TiptapLink.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Write your article..." })],
    content: post.content_en || "",
    onUpdate: ({ editor }) => updateField("content_en", editor.getHTML()),
  });
  const editorJa = useEditor({
    extensions: [StarterKit, TiptapImage, TiptapLink.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "記事を書いてください..." })],
    content: post.content_ja || "",
    onUpdate: ({ editor }) => updateField("content_ja", editor.getHTML()),
  });

  const activeEditor = contentTab === "en" ? editorEn : editorJa;

  const handleImageUpload = async (file: File) => {
    if (!activeEditor) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });
      const res = await axios.post(`${BACKEND_BASE}/api/cms/upload-image`, {
        data: base64,
        filename: file.name,
        contentType: file.type,
      }, { headers: { Authorization: `Bearer ${token}` } });
      activeEditor.chain().focus().setImage({ src: res.data.url }).run();
    } catch (e) {
      const url = prompt(lang === "ja" ? "アップロード失敗。画像URLを直接入力:" : "Upload failed. Enter image URL directly:");
      if (url) activeEditor.chain().focus().setImage({ src: url }).run();
    }
    setUploading(false);
  };

  const toolbarBtn = (label: string, action: () => void, isActive?: boolean) => (
    <button type="button" onClick={action} className={cn("px-2 py-1 rounded text-xs font-bold transition-colors", isActive ? "bg-[#38BDF8]/20 text-[#38BDF8]" : "text-[#8E9299] hover:text-white hover:bg-[#1A1A1A]")}>{label}</button>
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#1A1A1A] shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="p-1.5 hover:bg-[#1A1A1A] rounded text-[#8E9299]"><ArrowRight className="w-4 h-4 rotate-180" /></button>
          <span className="text-sm font-bold">{post.id ? t.editPost : t.newPost}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setViewMode(viewMode === "editor" ? "preview" : "editor")} className="px-3 py-1 text-xs border border-white/[0.08] rounded-lg text-[#8E9299] hover:text-white">
            {viewMode === "editor" ? t.preview : t.editor}
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="px-4 py-1.5 text-xs font-bold bg-[#38BDF8] text-white rounded-lg hover:bg-[#0EA5E9] disabled:opacity-50">
            {saving ? t.saving : t.save}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-[#1A1A1A] p-4 overflow-y-auto shrink-0 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.slug}</label>
            <input value={post.slug || ""} onChange={e => updateField("slug", e.target.value)} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8]" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.titleEn}</label>
            <input value={post.title_en || ""} onChange={e => updateField("title_en", e.target.value)} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8]" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.titleJa}</label>
            <input value={post.title_ja || ""} onChange={e => updateField("title_ja", e.target.value)} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8]" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.excerptEn}</label>
            <textarea value={post.excerpt_en || ""} onChange={e => updateField("excerpt_en", e.target.value)} rows={2} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8] resize-none" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.excerptJa}</label>
            <textarea value={post.excerpt_ja || ""} onChange={e => updateField("excerpt_ja", e.target.value)} rows={2} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.author}</label>
              <input value={post.author || ""} onChange={e => updateField("author", e.target.value)} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.status}</label>
              <select value={post.status || "draft"} onChange={e => updateField("status", e.target.value)} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8]">
                <option value="draft">{t.draft}</option>
                <option value="scheduled">{t.scheduled}</option>
                <option value="published">{t.published}</option>
              </select>
              <p className="text-[10px] text-[#71717A] mt-1.5 leading-snug">{cmsPublicBlogHint({ status: post.status || "draft", publishAt: post.publishAt }, nowTick, t)}</p>
              {isBlogPostPublicVisibleClient({ status: post.status || "draft", publishAt: post.publishAt }, nowTick) && post.slug ? (
                <a href={`${cmsPublicBlogOrigin()}/${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#38BDF8] hover:underline mt-1 inline-block">{t.viewOnBlog}</a>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.readingTimeEn}</label>
              <input value={post.readingTime_en || ""} onChange={e => updateField("readingTime_en", e.target.value)} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.readingTimeJa}</label>
              <input value={post.readingTime_ja || ""} onChange={e => updateField("readingTime_ja", e.target.value)} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8]" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.publishDate}</label>
            <input type="datetime-local" value={typeof post.publishAt === "string" ? post.publishAt : ""} onChange={e => updateField("publishAt", e.target.value)} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8]" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1 block">{t.tags}</label>
            <input value={(post.tags || []).join(", ")} onChange={e => updateField("tags", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} className="w-full bg-[#1A1A1A] border border-[#252525] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#38BDF8]" />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1A1A1A] shrink-0">
            <button type="button" onClick={() => setContentTab("en")} className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-colors", contentTab === "en" ? "bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30" : "text-[#8E9299] hover:text-white")}>EN</button>
            <button type="button" onClick={() => setContentTab("ja")} className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-colors", contentTab === "ja" ? "bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30" : "text-[#8E9299] hover:text-white")}>JA</button>
            {viewMode === "editor" && activeEditor && (
              <div className="flex items-center gap-1 ml-4 border-l border-[#1A1A1A] pl-4">
                {toolbarBtn("B", () => activeEditor.chain().focus().toggleBold().run(), activeEditor.isActive("bold"))}
                {toolbarBtn("I", () => activeEditor.chain().focus().toggleItalic().run(), activeEditor.isActive("italic"))}
                {toolbarBtn("H2", () => activeEditor.chain().focus().toggleHeading({ level: 2 }).run(), activeEditor.isActive("heading", { level: 2 }))}
                {toolbarBtn("H3", () => activeEditor.chain().focus().toggleHeading({ level: 3 }).run(), activeEditor.isActive("heading", { level: 3 }))}
                {toolbarBtn("•", () => activeEditor.chain().focus().toggleBulletList().run(), activeEditor.isActive("bulletList"))}
                {toolbarBtn("1.", () => activeEditor.chain().focus().toggleOrderedList().run(), activeEditor.isActive("orderedList"))}
                {toolbarBtn("<>", () => activeEditor.chain().focus().toggleCodeBlock().run(), activeEditor.isActive("codeBlock"))}
                {toolbarBtn("\"", () => activeEditor.chain().focus().toggleBlockquote().run(), activeEditor.isActive("blockquote"))}
                {toolbarBtn("Link", () => {
                  const url = prompt("URL:");
                  if (url) activeEditor.chain().focus().setLink({ href: url }).run();
                })}
                {toolbarBtn(uploading ? "..." : "Img", () => imgInputRef.current?.click())}
                <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === "editor" ? (
              <div className="min-h-[400px] [&_.tiptap]:outline-none [&_.tiptap]:min-h-[400px] [&_.tiptap_p]:mb-3 [&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-black [&_.tiptap_h2]:mt-6 [&_.tiptap_h2]:mb-3 [&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-bold [&_.tiptap_h3]:mt-4 [&_.tiptap_h3]:mb-2 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_li]:mb-1 [&_.tiptap_a]:text-[#38BDF8] [&_.tiptap_a]:underline [&_.tiptap_blockquote]:border-l-2 [&_.tiptap_blockquote]:border-[#38BDF8]/30 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:text-[#8E9299] [&_.tiptap_pre]:bg-[#0F0F0F] [&_.tiptap_pre]:p-3 [&_.tiptap_pre]:rounded-lg [&_.tiptap_pre]:my-3 [&_.tiptap_code]:bg-[#1A1A1A] [&_.tiptap_code]:px-1 [&_.tiptap_code]:rounded [&_.tiptap_img]:rounded-xl [&_.tiptap_img]:my-4 [&_.tiptap_.is-editor-empty:first-child::before]:text-[#3F3F46] [&_.tiptap_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_.is-editor-empty:first-child::before]:float-left [&_.tiptap_.is-editor-empty:first-child::before]:h-0 [&_.tiptap_.is-editor-empty:first-child::before]:pointer-events-none">
                {contentTab === "en" ? <EditorContent editor={editorEn} /> : <EditorContent editor={editorJa} />}
              </div>
            ) : (
              <div className="prose prose-invert max-w-none text-[#E4E3E0] leading-[1.8] text-sm [&_h2]:text-xl [&_h2]:font-black [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_a]:text-[#38BDF8] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_code]:bg-[#1A1A1A] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[#38BDF8] [&_pre]:bg-[#0F0F0F] [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:mb-6 [&_img]:rounded-xl [&_img]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-[#38BDF8]/30 [&_blockquote]:pl-4 [&_blockquote]:text-[#8E9299]"
                dangerouslySetInnerHTML={{ __html: contentTab === "en" ? (post.content_en || "") : (post.content_ja || "") }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
