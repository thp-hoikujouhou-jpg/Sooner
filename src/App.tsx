import React, { useState, useEffect, useRef, Component, type ErrorInfo, type ReactNode } from "react";
import { 
  FolderTree, 
  Terminal as TerminalIcon, 
  Play, 
  Save, 
  Plus, 
  MessageSquare, 
  Settings as SettingsIcon, 
  Zap, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  ChevronRight,
  ChevronDown,
  FileCode,
  Folder,
  Send,
  Loader2,
  X,
  Globe,
  Upload,
  Key,
  History,
  RefreshCw,
  Eye,
  Download,
  Trash2,
  MoreVertical,
  Square,
  Package,
  Star,
  Lock,
  Search,
  GitBranch,
  GitMerge,
  Menu,
  BookOpen,
  Rocket,
  Sparkles,
  Cloud,
  ArrowRight,
  Volume2,
  VolumeX,
} from "lucide-react";

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" />
    </svg>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; retries: number }> {
  state = { hasError: false, retries: 0 };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("ErrorBoundary caught (auto-recovering):", error.message);
    if (this.state.retries < 3) {
      setTimeout(() => this.setState(prev => ({ hasError: false, retries: prev.retries + 1 })), 50);
    }
  }
  render() {
    if (this.state.hasError && this.state.retries >= 3) {
      return (
        <div style={{ padding: 40, color: "#E4E3E0", background: "#0A0A0A", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <h1 style={{ color: "#38BDF8", marginBottom: 16 }}>Something went wrong</h1>
          <button onClick={() => this.setState({ hasError: false, retries: 0 })} style={{ padding: "8px 24px", background: "#38BDF8", color: "black", borderRadius: 8, fontWeight: "bold", border: "none", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { motion, AnimatePresence } from "motion/react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import html2canvas from "html2canvas";
import { GoogleGenAI, Type } from "@google/genai";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FileNode, Project, AgentStep, ChatMessage } from "./types";
import { applyDocumentSeo } from "./seo";
import { readStoredLanguage, writeStoredLanguage } from "./language";
import { clsx, type ClassValue } from "clsx";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { twMerge } from "tailwind-merge";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import BlogPage from "./BlogPage";
import CmsPage from "./CmsPage";
import LegalPage from "./LegalPage";
import { legalDocHref } from "./shared";
import {
  auth,
  isConfigured as firebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
  storageListProjects,
  storageCreateProject,
  storageListFiles,
  storageUploadFile,
  storageDownloadFile,
  storageDeleteFile,
  storageDeleteProject,
  storageSaveChatHistory,
  storageLoadChatHistory,
  type User,
} from "./firebase";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Landing: ~80% left cyan→white, ~20% right gray (professional headline accents) */
function LandingGradientText({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="bg-clip-text text-transparent"
      style={{
        backgroundImage: "linear-gradient(90deg, #38BDF8 0%, #f8fafc 42%, #ffffff 68%, #a1a1aa 85%, #3f3f46 100%)",
      }}
    >
      {children}
    </span>
  );
}

const landingI18n = {
  en: {
    signIn: "Sign In",
    getStarted: "Get Started",
    launchApp: "Launch app",
    betaBadge: "Beta Now Available",
    heroTitle1: "Ship ",
    heroHighlight: "faster",
    heroTitle2: "than ever",
    heroDesc: "Sooner is an AI-native IDE: the fastest way from idea to production. Describe what you want — AI builds, previews, and ships your code in seconds.",
    getStartedFree: "Get Started Free",
    tagline: "Build sooner, ship faster.",
    taglineSub: "The AI-native IDE.",
    feat1: { icon: "⚡", title: "Instant Generation", desc: "Describe your idea. AI writes production-ready code in seconds, not hours." },
    feat2: { icon: "🚀", title: "Real-time Preview", desc: "See your app come alive instantly. React, Vue, Flutter, Three.js — it just works." },
    feat3: { icon: "🔧", title: "Zero Setup", desc: "Frontend, backend, full-stack. Node.js, Python, Go, Rust — no config needed." },
    secWorkflowTitle: "From prompt to production",
    secWorkflowSub: "A linear path — no local toolchain roulette.",
    workflow1: { title: "Describe", desc: "Natural language, specs, or pasted errors. Sooner understands context across your files." },
    workflow2: { title: "Generate & edit", desc: "Multi-file edits, refactors, and fixes with preview-ready output." },
    workflow3: { title: "Preview & ship", desc: "Run in-browser preview, iterate fast, then push to Git when you are ready." },
    secStackTitle: "Built on tools you trust",
    secStackSub: "Editor, models, and identity — composed into one flow.",
    stackMonaco: "Monaco editor core",
    stackAi: "Gemini & extensible AI",
    stackFirebase: "Auth & cloud storage",
    secMonacoEditorTitle: "Built on Monaco Editor",
    secMonacoEditorDesc:
      "Sooner's editor is developed on Monaco Editor — the same engine that powers VS Code. You get familiar shortcuts, syntax highlighting, and multi-file editing directly in the browser.",
    navBlog: "Blog",
    navBlogAria: "Blog",
    secMetricsTitle: "Built for velocity",
    metric1: { value: "<60s", label: "idea → runnable preview" },
    metric2: { value: "1×", label: "one AI-native IDE, no repo sync drama" },
    metric3: { value: "∞", label: "stacks & frameworks" },
    secCtaTitle: "Ready to build?",
    secCtaDesc: "Create an account and open the AI-native IDE from any device.",
    footer: "Sooner Beta — Build sooner, ship faster",
    copyright: "© 2026 Sooner. All rights reserved.",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    legalAgreeCombined:
      "By continuing, you agree to the Terms of Service and Privacy Policy. Links are at the bottom of this page.",
    welcomeBack: "Welcome back",
    createAccount: "Create account",
    signInDesc: "Sign in to your Sooner account",
    signUpDesc: "Start building with Sooner",
    or: "or",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    noAccount: "Don't have an account? ",
    hasAccount: "Already have an account? ",
    signUp: "Sign up",
    backToHome: "Back to home",
    startJourney: "Start Journey",
    skipJourney: "Skip",
    scrollToTop: "Back to top",
    muteSound: "Mute",
    unmuteSound: "Unmute",
    leafCta: "Get Started Free",
    stageBuildNum: "01",
    stageBuildTitle: "Build",
    stageBuildDesc: "Describe your idea. AI writes and debugs production-ready code across multiple files in seconds.",
    stagePreviewNum: "02",
    stagePreviewTitle: "Preview",
    stagePreviewDesc: "See your app live in the browser. React, Vue, Three.js — instant, no config.",
    stageShipNum: "03",
    stageShipTitle: "Ship",
    stageShipDesc: "Push to Git and deploy. From thought to production in one flow.",
    poemLines: [
      "In the storm of creation,",
      "a single drop carries your vision.",
      "",
      "Build — thought becomes code.",
      "Preview — watch it breathe.",
      "Ship — it's already live.",
      "",
      "Faster than thunder follows lightning,",
      "your idea reaches the world.",
      "",
      "Build sooner. Ship faster.",
      "The AI-native IDE.",
      "",
      "Sooner.",
    ],
  },
  ja: {
    signIn: "ログイン",
    getStarted: "始める",
    launchApp: "アプリを起動",
    betaBadge: "ベータ版公開中",
    heroTitle1: "もっと",
    heroHighlight: "速く",
    heroTitle2: "届けよう",
    heroDesc: "SoonerはAIネイティブIDE。アイデアからプロダクションまで最速の道。作りたいものを伝えるだけ — AIがビルド、プレビュー、数秒でデプロイします。",
    getStartedFree: "無料で始める",
    tagline: "Build sooner, ship faster.",
    taglineSub: "AIネイティブIDE。",
    feat1: { icon: "⚡", title: "瞬時にコード生成", desc: "アイデアを伝えるだけ。AIが本番品質のコードを数秒で書き上げます。" },
    feat2: { icon: "🚀", title: "リアルタイムプレビュー", desc: "アプリが即座に動く。React, Vue, Flutter, Three.js — すべて対応。" },
    feat3: { icon: "🔧", title: "セットアップ不要", desc: "フロント、バックエンド、フルスタック。Node.js, Python, Go, Rust — 設定なしで。" },
    secWorkflowTitle: "プロンプトから本番まで",
    secWorkflowSub: "迷子にならない一本道です。",
    workflow1: { title: "指示", desc: "自然言語、仕様、エラー貼り付け。ファイル横断の文脈を理解します。" },
    workflow2: { title: "生成・編集", desc: "複数ファイルの編集やリファクタ、プレビュー可能な出力。" },
    workflow3: { title: "プレビュー・公開", desc: "ブラウザ内で検証し、準備ができたらGitへ。" },
    secStackTitle: "信頼のツールを束ねる",
    secStackSub: "エディタ、モデル、認証を一つの流れに。",
    stackMonaco: "Monaco エディタ基盤",
    stackAi: "Gemini ＆ 拡張可能なAI",
    stackFirebase: "認証とクラウドストレージ",
    secMonacoEditorTitle: "Monaco Editor を基盤に開発",
    secMonacoEditorDesc:
      "コード編集体験は Monaco Editor（VS Code と同じエディタエンジン）を土台にしています。おなじみのショートカット、シンタックスハイライト、複数ファイル編集をブラウザで利用できます。",
    navBlog: "ブログ",
    navBlogAria: "ブログ",
    secMetricsTitle: "スピードのための設計",
    metric1: { value: "<60秒", label: "アイデア→動くプレビュー" },
    metric2: { value: "1つ", label: "迷わない単一のAIネイティブIDE" },
    metric3: { value: "∞", label: "対応スタックとフレームワーク" },
    secCtaTitle: "始めますか？",
    secCtaDesc: "アカウントを作成し、どの端末からでもAIネイティブIDEを開けます。",
    footer: "Sooner ベータ — Build sooner, ship faster",
    copyright: "© 2026 Sooner. All rights reserved.",
    terms: "利用規約",
    privacy: "プライバシーポリシー",
    legalAgreeCombined:
      "続行により、ページ下部の利用規約およびプライバシーポリシーに同意したものとみなされます。",
    welcomeBack: "おかえりなさい",
    createAccount: "アカウント作成",
    signInDesc: "Soonerアカウントにログイン",
    signUpDesc: "Soonerで開発を始めよう",
    or: "または",
    emailPlaceholder: "メールアドレス",
    passwordPlaceholder: "パスワード",
    noAccount: "アカウントがない？ ",
    hasAccount: "既にアカウントがある？ ",
    signUp: "新規登録",
    backToHome: "ホームに戻る",
    startJourney: "旅を始める",
    skipJourney: "スキップ",
    scrollToTop: "トップへ戻る",
    muteSound: "ミュート",
    unmuteSound: "ミュート解除",
    leafCta: "無料で始める",
    stageBuildNum: "01",
    stageBuildTitle: "Build",
    stageBuildDesc: "アイデアを伝えるだけ。AIが数秒で本番品質のコードを書き上げ、デバッグまで完了します。",
    stagePreviewNum: "02",
    stagePreviewTitle: "Preview",
    stagePreviewDesc: "ブラウザ上でアプリが動く。React, Vue, Three.js — 即座に、設定なしで。",
    stageShipNum: "03",
    stageShipTitle: "Ship",
    stageShipDesc: "Gitにプッシュしてデプロイ。思考からプロダクションまで一つの流れで。",
    poemLines: [
      "創造の嵐の中、",
      "一滴のしずくがビジョンを運ぶ。",
      "",
      "Build — 思考がコードになる。",
      "Preview — 息づくのを見よ。",
      "Ship — もう、世界に届いている。",
      "",
      "雷鳴より速く、",
      "あなたのアイデアは世界へ。",
      "",
      "Build sooner. Ship faster.",
      "AIネイティブIDE。",
      "",
      "Sooner.",
    ],
  },
};

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function getInitialLang(): "en" | "ja" {
  const params = new URLSearchParams(window.location.search);
  const paramLang = params.get("lang");
  if (paramLang === "ja" || paramLang === "en") return paramLang;
  return readStoredLanguage();
}

function navigateToSubdomain(sub: "site" | "signup" | "signin", lang?: "en" | "ja") {
  const proto = window.location.protocol;
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  window.location.href = `${proto}//${sub}.sooner.sh${langParam}`;
}

function navigateToBlog(lang: "en" | "ja") {
  const langParam = lang !== "en" ? `?lang=${lang}` : "";
  const proto =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "https:"
      : window.location.protocol;
  window.location.href = `${proto}//blog.sooner.sh${langParam}`;
}


type JourneyPhase = "idle" | "thunder" | "detach" | "build" | "preview" | "ship" | "impact" | "poem" | "done";

function useAmbientAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  const startedRef = useRef(false);
  const mutedRef = useRef(false);

  const ensureCtx = () => {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const bufLen = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800;
    bp.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    rainGainRef.current = gain;

    src.connect(bp).connect(gain).connect(ctx.destination);
    src.start();
    return ctx;
  };

  const start = useRef(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const ctx = ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    if (rainGainRef.current) {
      rainGainRef.current.gain.setTargetAtTime(0.06, ctx.currentTime, 0.5);
    }
  }).current;

  const setRainVolume = useRef((vol: number) => {
    if (!ctxRef.current || !rainGainRef.current || mutedRef.current) return;
    rainGainRef.current.gain.setTargetAtTime(vol, ctxRef.current.currentTime, 0.3);
  }).current;

  const triggerThunder = useRef(() => {
    const ctx = ctxRef.current;
    if (!ctx || mutedRef.current) return;
    const bufLen = ctx.sampleRate * 1.2;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.25));

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 200;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    g.gain.setTargetAtTime(0, ctx.currentTime + 0.05, 0.3);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + 1.2);
  }).current;

  const setMuted = (m: boolean) => {
    mutedRef.current = m;
    if (!ctxRef.current || !rainGainRef.current) return;
    rainGainRef.current.gain.setTargetAtTime(m ? 0 : 0.06, ctxRef.current.currentTime, 0.2);
  };

  useEffect(() => {
    return () => {
      if (ctxRef.current) ctxRef.current.close();
    };
  }, []);

  return { start, setRainVolume, triggerThunder, setMuted };
}

function RainCanvas({ intensity, flash }: { intensity: number; flash: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<{ x: number; y: number; l: number; v: number; o: number }[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const count = window.innerWidth < 768 ? 100 : 220;
    dropsRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      l: 10 + Math.random() * 20,
      v: 4 + Math.random() * 8,
      o: 0.1 + Math.random() * 0.25,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const drops = dropsRef.current;
      const eff = intensity;
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.y += d.v * eff;
        d.x -= 0.8 * eff;
        if (d.y > canvas.height) { d.y = -d.l; d.x = Math.random() * canvas.width; }
        if (d.x < 0) d.x = canvas.width;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 0.5, d.y + d.l * eff);
        ctx.strokeStyle = `rgba(174,214,241,${d.o * eff})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, [intensity]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" style={{ opacity: flash ? 0.15 : 1 }} />;
}

function LeafSVG({ trembling, onClick, ctaText }: { trembling: boolean; onClick: () => void; ctaText: string }) {
  return (
    <div className={`relative inline-block ${trembling ? "animate-[tremble_0.08s_ease-in-out_infinite]" : "animate-[sway_5s_ease-in-out_infinite]"}`}>
      <svg width="140" height="180" viewBox="0 0 140 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_30px_rgba(56,189,248,0.15)]">
        <path
          d="M70 10 C30 50, 10 90, 20 130 C25 150, 45 170, 70 175 C95 170, 115 150, 120 130 C130 90, 110 50, 70 10Z"
          fill="url(#leafGrad)" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.4"
        />
        <path d="M70 30 L70 160" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.2" />
        <path d="M70 60 C50 55, 35 70, 30 90" stroke="#38BDF8" strokeWidth="0.5" strokeOpacity="0.15" fill="none" />
        <path d="M70 80 C90 75, 105 90, 110 110" stroke="#38BDF8" strokeWidth="0.5" strokeOpacity="0.15" fill="none" />
        <defs>
          <radialGradient id="leafGrad" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.03" />
          </radialGradient>
        </defs>
      </svg>
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 flex items-center justify-center group"
      >
        <span className="text-[11px] sm:text-xs font-bold text-[#38BDF8]/80 group-hover:text-[#38BDF8] transition-colors tracking-wide mt-4">
          {ctaText}
        </span>
      </button>
    </div>
  );
}

function DropletShape({ children, phase, isMobile }: { children: React.ReactNode; phase: JourneyPhase; isMobile: boolean }) {
  const stagePhases: JourneyPhase[] = ["build", "preview", "ship"];
  const isActive = stagePhases.includes(phase);
  const stageIndex = stagePhases.indexOf(phase);
  const isLeft = stageIndex % 2 === 0;

  const getPosition = () => {
    if (!isActive) return { x: 0, y: 0, scale: 0, opacity: 0 };
    if (isMobile) return { x: 0, y: 0, scale: 1, opacity: 1 };
    return { x: isLeft ? -40 : 40, y: 0, scale: 1, opacity: 1 };
  };

  const pos = getPosition();

  return (
    <motion.div
      animate={{ x: pos.x, y: pos.y, scale: pos.scale, opacity: pos.opacity }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-[300px] h-[380px] sm:w-[340px] sm:h-[420px] mx-auto"
      style={{ clipPath: "ellipse(50% 48% at 50% 52%)" }}
    >
      <div className="absolute inset-0 rounded-full animate-[iridescent_8s_ease-in-out_infinite]"
        style={{
          background: "linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(168,85,247,0.06) 25%, rgba(236,72,153,0.05) 50%, rgba(34,211,238,0.07) 75%, rgba(56,189,248,0.08) 100%)",
        }}
      />
      <div className="absolute inset-0 border border-white/[0.06] rounded-full" style={{ clipPath: "ellipse(50% 48% at 50% 52%)" }} />
      <div className="absolute inset-[2px] backdrop-blur-[1px]" style={{ clipPath: "ellipse(50% 48% at 50% 52%)" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 py-10 text-center">
        {children}
      </div>
    </motion.div>
  );
}

function StageContent({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-3"
    >
      <span className="text-[10px] font-mono text-[#38BDF8]/50 tracking-widest">{num}</span>
      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed max-w-[240px]">{desc}</p>
    </motion.div>
  );
}

function GroundImpact({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="relative w-full flex justify-center">
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute w-20 h-10 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(56,189,248,0.3) 0%, transparent 70%)" }}
      />
      <motion.div
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: 5, opacity: 0 }}
        transition={{ duration: 2.5, ease: "easeOut", delay: 0.2 }}
        className="absolute w-16 h-8 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(168,85,247,0.15) 0%, transparent 70%)" }}
      />
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-1 h-32 origin-top"
        style={{ background: "linear-gradient(to bottom, rgba(56,189,248,0.2) 0%, transparent 100%)" }}
      />
    </div>
  );
}

function PoemSection({ lines, ctaText, onCta, onSkipToApp }: { lines: string[]; ctaText: string; onCta: () => void; onSkipToApp: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1 mt-16 px-4">
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: i * 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "text-center leading-relaxed",
            line === "" ? "h-3" : "",
            line === "Sooner." ? "text-2xl sm:text-3xl font-black text-white mt-4" : "",
            line.startsWith("Build sooner") ? "text-sm sm:text-base font-bold text-[#38BDF8] mt-2" : "",
            !line.startsWith("Build sooner") && line !== "Sooner." && line !== "" ? "text-xs sm:text-sm text-[#8E9299] italic" : "",
          )}
        >
          {line || "\u00A0"}
        </motion.p>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: lines.length * 0.35 + 0.5 }}
        className="mt-10 flex flex-col items-center gap-3"
      >
        <button
          type="button"
          onClick={onCta}
          className="group px-10 py-3.5 text-base font-bold bg-[#38BDF8] text-white rounded-xl hover:bg-[#0EA5E9] transition-all shadow-xl shadow-[#38BDF8]/25 hover:scale-[1.02] inline-flex items-center gap-2"
        >
          {ctaText} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
        <button type="button" onClick={onSkipToApp} className="text-xs text-[#52525B] hover:text-[#8E9299] transition-colors">
          Launch app →
        </button>
      </motion.div>
    </div>
  );
}

function CloudyFooter({ text, copyright, footerLinks }: { text: string; copyright: string; footerLinks?: React.ReactNode }) {
  return (
    <footer className="relative z-10 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-[#0c0c10] via-[#0c0c10]/80 to-transparent" />
        <div className="absolute bottom-[40%] left-[10%] w-[60%] h-[30%] rounded-full bg-[#1a1a2e]/40 blur-[60px] animate-[cloud-drift_20s_ease-in-out_infinite_alternate]" />
        <div className="absolute bottom-[30%] right-[5%] w-[45%] h-[25%] rounded-full bg-[#1a1a2e]/30 blur-[50px] animate-[cloud-drift_25s_ease-in-out_infinite_alternate-reverse]" />
        <div className="absolute inset-0 animate-[lightning-distant_8s_ease-in-out_infinite]" style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(56,189,248,0.08), transparent 60%)" }} />
      </div>
      <div className="relative z-10 px-4 sm:px-8 py-10 text-center">
        <p className="text-xs text-[#52525B]">{text}</p>
        <p className="mt-2 text-[10px] text-[#3F3F46]">{copyright}</p>
        {footerLinks ? <div className="mt-4 flex justify-center">{footerLinks}</div> : null}
      </div>
    </footer>
  );
}

function LandingPage({ onSkip, initialMode }: { onSkip: () => void; initialMode?: "landing" | "login" | "signup" }) {
  const [mode, setMode] = useState<"landing" | "login" | "signup">(initialMode ?? "landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"en" | "ja">(getInitialLang);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const t = landingI18n[lang];
  const isProduction = window.location.hostname.endsWith("sooner.sh");

  useEffect(() => {
    applyDocumentSeo({ lang });
  }, [lang, mode]);

  /** Keep URL ?lang= in sync with landing UI so legal links and refreshes match the selected language. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (lang === "ja") u.searchParams.set("lang", "ja");
    else u.searchParams.delete("lang");
    const qs = u.searchParams.toString();
    const next = qs ? `${u.pathname}?${qs}` : u.pathname;
    const cur = window.location.pathname + window.location.search;
    if (next !== cur) window.history.replaceState(null, "", next);
  }, [lang]);

  /** Browser back/forward: restore landing language from ?lang= (pushState entries). */
  useEffect(() => {
    const onPop = () => {
      const q = new URLSearchParams(window.location.search).get("lang");
      const next = q === "ja" ? "ja" : "en";
      writeStoredLanguage(next);
      setLang(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (mobileNavOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const redirectToApp = () => {
    if (isProduction) {
      const langParam = lang !== "en" ? `?lang=${lang}` : "";
      window.location.href = `${window.location.protocol}//sooner.sh${langParam}`;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      redirectToApp();
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "") || "Authentication failed");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    if (!auth) return;
    try { await signInWithPopup(auth, new GoogleAuthProvider()); redirectToApp(); } catch (err: any) { setError(err.message || "Google sign-in failed"); }
  };

  const handleGithub = async () => {
    if (!auth) return;
    try {
      const provider = new GithubAuthProvider();
      provider.addScope("repo");
      provider.addScope("read:user");
      const result = await signInWithPopup(auth, provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem("github_token", credential.accessToken);
      }
      redirectToApp();
    } catch (err: any) { setError(err.message || "GitHub sign-in failed"); }
  };

  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>("idle");
  const [lightningFlash, setLightningFlash] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const bottomRef = useRef<HTMLDivElement>(null);
  const audio = useAmbientAudio();

  const doFlash = () => {
    setLightningFlash(true);
    setTimeout(() => setLightningFlash(false), 150);
    audio.triggerThunder();
  };

  useEffect(() => {
    if (journeyPhase === "idle") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)); };

    if (journeyPhase === "thunder") {
      schedule(doFlash, 300);
      schedule(doFlash, 800);
      schedule(() => setJourneyPhase("detach"), 1800);
    } else if (journeyPhase === "detach") {
      schedule(() => setJourneyPhase("build"), 1500);
    } else if (journeyPhase === "build") {
      schedule(doFlash, 5000);
      schedule(() => setJourneyPhase("preview"), 10000);
    } else if (journeyPhase === "preview") {
      schedule(doFlash, 4000);
      schedule(() => setJourneyPhase("ship"), 10000);
    } else if (journeyPhase === "ship") {
      schedule(doFlash, 3000);
      schedule(doFlash, 3500);
      schedule(() => setJourneyPhase("impact"), 8000);
    } else if (journeyPhase === "impact") {
      schedule(doFlash, 200);
      schedule(() => setJourneyPhase("poem"), 2500);
    } else if (journeyPhase === "poem") {
      schedule(() => setJourneyPhase("done"), 18000);
    }
    return () => timers.forEach(clearTimeout);
  }, [journeyPhase]);

  useEffect(() => {
    const vol: Record<string, number> = { idle: 0.03, thunder: 0.1, detach: 0.08, build: 0.06, preview: 0.06, ship: 0.08, impact: 0.04, poem: 0.02, done: 0.01 };
    audio.setRainVolume(vol[journeyPhase] ?? 0.03);
  }, [journeyPhase]);

  useEffect(() => {
    if (journeyPhase !== "done") { setShowScrollTop(false); return; }
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
      setShowScrollTop(nearBottom);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [journeyPhase]);

  const startJourney = () => { audio.start(); setJourneyPhase("thunder"); };
  const skipJourney = () => setJourneyPhase("done");
  const goApp = () => {
    if (!firebaseConfigured) return onSkip();
    if (isProduction) {
      const langQ = lang !== "en" ? `?lang=${lang}` : "";
      window.location.href = `${window.location.protocol}//signup.sooner.sh${langQ}`;
    } else setMode("signup");
  };
  const scrollToTopFn = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const stagePhases: JourneyPhase[] = ["build", "preview", "ship"];
  const isInJourney = journeyPhase !== "idle" && journeyPhase !== "done";
  const showDroplet = stagePhases.includes(journeyPhase);
  const showImpact = journeyPhase === "impact" || journeyPhase === "poem" || journeyPhase === "done";
  const showPoem = journeyPhase === "poem" || journeyPhase === "done";

  const stageData = [
    { num: t.stageBuildNum, title: t.stageBuildTitle, desc: t.stageBuildDesc },
    { num: t.stagePreviewNum, title: t.stagePreviewTitle, desc: t.stagePreviewDesc },
    { num: t.stageShipNum, title: t.stageShipTitle, desc: t.stageShipDesc },
  ];
  const activeStageIndex = stagePhases.indexOf(journeyPhase);

  if (mode === "landing") {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex flex-col overflow-hidden relative">
        <RainCanvas intensity={journeyPhase === "idle" ? 0.6 : 1} flash={lightningFlash} />

        <AnimatePresence>
          {lightningFlash && (
            <motion.div
              key="flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.12 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="fixed inset-0 z-50 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        <header className="relative z-30 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-4 md:py-5 border-b border-white/[0.04] backdrop-blur-sm bg-[#09090B]/60">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <Zap className="w-6 h-6 text-[#38BDF8]" />
              <div className="absolute inset-0 w-6 h-6 bg-[#38BDF8]/20 blur-md rounded-full" />
            </div>
            <span className="font-black text-base sm:text-lg tracking-tight truncate">Sooner</span>
          </div>

          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <button type="button" onClick={() => navigateToBlog(lang)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#8E9299] hover:text-white border border-white/[0.06] rounded-lg transition-colors" aria-label={t.navBlogAria}>
              <BookOpen className="w-4 h-4 text-[#38BDF8]" />
              <span>{t.navBlog}</span>
            </button>
            <button type="button" onClick={() => { const next = lang === "en" ? "ja" : "en"; writeStoredLanguage(next); setLang(next); }} className="px-3 py-1.5 text-xs font-semibold text-[#71717A] hover:text-white border border-white/[0.06] rounded-lg transition-colors">
              {lang === "en" ? "日本語" : "EN"}
            </button>
            {firebaseConfigured ? (
              <>
                <button type="button" onClick={() => (isProduction ? navigateToSubdomain("signin", lang) : setMode("login"))} className="px-4 py-2 text-sm font-semibold text-[#8E9299] hover:text-white transition-colors">{t.signIn}</button>
                <button type="button" onClick={goApp} className="px-4 py-2 text-sm font-bold bg-[#38BDF8] text-white rounded-xl hover:bg-[#0EA5E9] transition-all shadow-lg shadow-[#38BDF8]/20">{t.getStarted}</button>
              </>
            ) : (
              <button type="button" onClick={onSkip} className="px-4 py-2 text-sm font-bold bg-[#38BDF8] text-white rounded-xl hover:bg-[#0EA5E9] transition-all shadow-lg shadow-[#38BDF8]/20">{t.launchApp}</button>
            )}
          </div>

          <button type="button" aria-expanded={mobileNavOpen} aria-label={lang === "ja" ? "メニュー" : "Menu"} onClick={() => setMobileNavOpen((o) => !o)} className="md:hidden p-2 rounded-lg border border-white/[0.06] text-[#E4E4E7] hover:bg-white/[0.04]">
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileNavOpen && (
          <>
            <button type="button" aria-hidden className="fixed inset-0 z-20 bg-black/70 md:hidden" onClick={() => setMobileNavOpen(false)} />
            <div className="fixed top-[57px] left-0 right-0 z-30 md:hidden border-b border-white/[0.06] bg-[#0c0c0e]/95 backdrop-blur-md shadow-xl px-4 py-4 flex flex-col gap-3">
              <button type="button" onClick={() => { setMobileNavOpen(false); navigateToBlog(lang); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-left text-[#E4E4E7] border border-white/[0.08] rounded-lg">
                <BookOpen className="w-4 h-4 text-[#38BDF8] shrink-0" />{t.navBlog}
              </button>
              <button type="button" onClick={() => { const next = lang === "en" ? "ja" : "en"; writeStoredLanguage(next); setLang(next); }} className="w-full px-3 py-2 text-xs font-semibold text-[#71717A] border border-white/[0.08] rounded-lg text-left">
                {lang === "en" ? "日本語" : "EN"}
              </button>
              {firebaseConfigured ? (
                <>
                  <button type="button" onClick={() => { setMobileNavOpen(false); isProduction ? navigateToSubdomain("signin", lang) : setMode("login"); }} className="w-full py-2 text-sm font-semibold text-[#8E9299] text-left">{t.signIn}</button>
                  <button type="button" onClick={() => { setMobileNavOpen(false); goApp(); }} className="w-full py-2.5 text-sm font-bold bg-[#38BDF8] text-white rounded-xl">{t.getStarted}</button>
                </>
              ) : (
                <button type="button" onClick={() => { setMobileNavOpen(false); onSkip(); }} className="w-full py-2.5 text-sm font-bold bg-[#38BDF8] text-white rounded-xl">{t.launchApp}</button>
              )}
              <div className="pt-2 mt-1 border-t border-white/[0.06] flex flex-col gap-2">
                <a href={legalDocHref(lang, "terms")} onClick={() => setMobileNavOpen(false)} className="w-full px-3 py-2 text-xs font-semibold text-left text-[#71717A] hover:text-[#E4E4E7] transition-colors">
                  {t.terms}
                </a>
                <a href={legalDocHref(lang, "privacy")} onClick={() => setMobileNavOpen(false)} className="w-full px-3 py-2 text-xs font-semibold text-left text-[#71717A] hover:text-[#E4E4E7] transition-colors">
                  {t.privacy}
                </a>
              </div>
            </div>
          </>
        )}

        <main className="relative z-20 flex-1 flex flex-col items-center">
          {/* Hero: idle state with leaf */}
          <AnimatePresence mode="wait">
            {journeyPhase === "idle" && (
              <motion.div
                key="hero-idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center pt-16 sm:pt-24 md:pt-32 pb-12 px-4"
              >
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="text-[10px] uppercase tracking-[0.3em] text-[#38BDF8]/60 font-semibold mb-6">
                  The AI-native IDE
                </motion.p>
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }} className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-4">
                  <span className="text-white">Build </span>
                  <LandingGradientText>sooner</LandingGradientText>
                  <span className="text-white">, ship </span>
                  <LandingGradientText>faster</LandingGradientText>
                  <span className="text-[#38BDF8]">.</span>
                </motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }} className="text-sm sm:text-base text-[#71717A] max-w-md mb-10 leading-relaxed">
                  {t.taglineSub}
                </motion.p>

                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, duration: 0.8 }}>
                  <LeafSVG trembling={false} onClick={goApp} ctaText={t.leafCta} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.6 }} className="mt-10 flex flex-col items-center gap-3">
                  <button type="button" onClick={startJourney} className="group px-8 py-3 text-sm font-bold text-white border border-white/[0.1] rounded-xl hover:border-[#38BDF8]/40 hover:bg-[#38BDF8]/[0.05] transition-all inline-flex items-center gap-2">
                    {t.startJourney} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#38BDF8]" />
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thunder + detach phase: leaf shaking */}
          <AnimatePresence>
            {(journeyPhase === "thunder" || journeyPhase === "detach") && (
              <motion.div
                key="thunder-leaf"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center pt-24 sm:pt-32 pb-12"
              >
                <LeafSVG trembling={journeyPhase === "thunder"} onClick={goApp} ctaText={t.leafCta} />
                {journeyPhase === "detach" && (
                  <motion.div
                    initial={{ opacity: 1, y: 0, scale: 0.5 }}
                    animate={{ opacity: 0, y: 120, scale: 0.3 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-2 w-3 h-4 rounded-full animate-[iridescent_3s_ease-in-out_infinite]"
                    style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(56,189,248,0.6), rgba(168,85,247,0.3), rgba(236,72,153,0.2), transparent)" }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stage droplet */}
          <AnimatePresence mode="wait">
            {showDroplet && (
              <motion.div
                key={`stage-${journeyPhase}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: journeyPhase === "ship" ? 80 : -20, scale: journeyPhase === "ship" ? 0.3 : 0.9 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center pt-10 sm:pt-16 pb-12 px-4"
              >
                <DropletShape phase={journeyPhase} isMobile={isMobile}>
                  <AnimatePresence mode="wait">
                    <StageContent
                      key={journeyPhase}
                      num={stageData[activeStageIndex]?.num ?? ""}
                      title={stageData[activeStageIndex]?.title ?? ""}
                      desc={stageData[activeStageIndex]?.desc ?? ""}
                    />
                  </AnimatePresence>
                </DropletShape>

                {/* Stage indicator dots */}
                <div className="flex items-center gap-2 mt-8">
                  {stagePhases.map((sp, i) => (
                    <div key={sp} className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", i === activeStageIndex ? "bg-[#38BDF8] w-4" : "bg-[#3F3F46]")} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Impact + Poem */}
          <AnimatePresence>
            {showImpact && (
              <motion.div
                key="impact-poem"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="flex flex-col items-center pt-8 pb-20 px-4"
              >
                <GroundImpact active={journeyPhase === "impact" || journeyPhase === "poem"} />
                {showPoem && (
                  <PoemSection
                    lines={t.poemLines}
                    ctaText={t.getStartedFree}
                    onCta={goApp}
                    onSkipToApp={onSkip}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detailed sections revealed after journey completes */}
          {journeyPhase === "done" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="w-full flex flex-col items-center px-4 sm:px-6 md:px-8 pb-16"
            >
              {/* Feature cards */}
              <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full">
                {([
                  { feat: t.feat1, Icon: Zap },
                  { feat: t.feat2, Icon: Rocket },
                  { feat: t.feat3, Icon: Package },
                ] as const).map(({ feat: f, Icon }, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 text-left hover:border-[#38BDF8]/25 hover:bg-[#38BDF8]/[0.02] hover:-translate-y-1 transition-all duration-300 group">
                    <div className="w-11 h-11 rounded-xl bg-[#38BDF8]/[0.08] border border-[#38BDF8]/20 flex items-center justify-center mb-4 group-hover:bg-[#38BDF8]/[0.15] group-hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all duration-300">
                      <Icon className="w-5 h-5 text-[#38BDF8]" />
                    </div>
                    <h3 className="font-bold text-base mb-2 group-hover:text-[#38BDF8] transition-colors">{f.title}</h3>
                    <p className="text-sm text-[#71717A] leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Workflow */}
              <motion.section initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="mt-20 sm:mt-28 w-full max-w-5xl text-left px-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#38BDF8] font-semibold mb-3">{lang === "ja" ? "ワークフロー" : "Workflow"}</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2">{t.secWorkflowTitle}</h2>
                <p className="text-[#71717A] mb-10 max-w-2xl">{t.secWorkflowSub}</p>
                <div className="grid md:grid-cols-3 gap-4">
                  {[t.workflow1, t.workflow2, t.workflow3].map((w, i) => (
                    <div key={i} className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6 overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-[#38BDF8]/50 to-transparent" />
                      <span className="text-xs font-mono text-[#52525b] mb-4 block">0{i + 1}</span>
                      <h3 className="font-bold text-lg text-white mb-2">{w.title}</h3>
                      <p className="text-sm text-[#a1a1aa] leading-relaxed">{w.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* Stack */}
              <motion.section initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="mt-20 sm:mt-24 w-full max-w-5xl px-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#38BDF8] font-semibold mb-3 text-center">{lang === "ja" ? "スタック" : "Stack"}</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 text-center">{t.secStackTitle}</h2>
                <p className="text-[#71717A] text-center mb-10 max-w-xl mx-auto">{t.secStackSub}</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { k: "monaco", label: t.stackMonaco, Icon: FileCode },
                    { k: "ai", label: t.stackAi, Icon: Sparkles },
                    { k: "fb", label: t.stackFirebase, Icon: Cloud },
                  ].map((s) => (
                    <div key={s.k} className="group relative rounded-2xl border border-white/[0.06] bg-[#0c0c0e] px-6 py-8 text-center text-sm font-medium text-[#e4e4e7] hover:border-[#38BDF8]/30 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                      <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-[#38BDF8]/0 via-[#38BDF8]/0 to-transparent group-hover:from-[#38BDF8]/60 group-hover:via-[#38BDF8]/20 transition-all duration-500" />
                      <s.Icon className="w-8 h-8 text-[#38BDF8]/30 mx-auto mb-3 group-hover:text-[#38BDF8]/60 transition-colors duration-300" />
                      {s.label}
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* Monaco Editor */}
              <motion.section initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="mt-16 sm:mt-20 w-full max-w-5xl text-left px-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#38BDF8] font-semibold mb-2">{lang === "ja" ? "エディタ" : "Editor"}</p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 sm:mb-4">{t.secMonacoEditorTitle}</h3>
                <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed max-w-3xl mb-6">{t.secMonacoEditorDesc}</p>
                <div className="rounded-xl border border-white/[0.08] bg-[#0c0c0e] overflow-hidden max-w-2xl shadow-xl shadow-black/20">
                  <div className="flex items-center px-4 py-2.5 border-b border-white/[0.06] gap-2 bg-[#111113]">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]/50" />
                    </div>
                    <span className="text-[10px] text-[#52525b] font-mono ml-2">App.tsx</span>
                  </div>
                  <pre className="p-5 text-[13px] font-mono leading-[1.7] overflow-x-auto"><code><span className="text-[#C586C0]">import</span> <span className="text-[#D4D4D4]">{"{"}</span> <span className="text-[#9CDCFE]">createApp</span> <span className="text-[#D4D4D4]">{"}"}</span> <span className="text-[#C586C0]">from</span> <span className="text-[#CE9178]">"sooner"</span><span className="text-[#D4D4D4]">;</span>{"\n"}{"\n"}<span className="text-[#C586C0]">const</span> <span className="text-[#4FC1FF]">app</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#DCDCAA]">createApp</span><span className="text-[#D4D4D4]">({"{"}</span>{"\n"}  <span className="text-[#9CDCFE]">editor</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"monaco"</span><span className="text-[#D4D4D4]">,</span>{"\n"}  <span className="text-[#9CDCFE]">ai</span><span className="text-[#D4D4D4]">:</span>     <span className="text-[#CE9178]">"gemini"</span><span className="text-[#D4D4D4]">,</span>{"\n"}  <span className="text-[#9CDCFE]">deploy</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#569CD6]">true</span><span className="text-[#D4D4D4]">,</span>{"\n"}<span className="text-[#D4D4D4]">{"}"});"</span></code></pre>
                </div>
              </motion.section>

              {/* Metrics */}
              <motion.section initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="mt-24 w-full max-w-5xl">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-10 text-center">{t.secMetricsTitle}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[t.metric1, t.metric2, t.metric3].map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="rounded-2xl border border-white/[0.06] p-8 text-center bg-white/[0.02] hover:border-[#38BDF8]/20 hover:bg-[#38BDF8]/[0.01] transition-all duration-300">
                      <p className="text-4xl md:text-5xl font-black tracking-tight mb-2"><LandingGradientText>{m.value}</LandingGradientText></p>
                      <p className="text-xs text-[#71717A] uppercase tracking-wider">{m.label}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              {/* Final CTA */}
              <motion.section initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="mt-24 mb-8 w-full max-w-3xl relative">
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-[#38BDF8]/40 via-[#38BDF8]/10 to-[#38BDF8]/40 bg-[length:200%_100%] animate-[shimmer_4s_linear_infinite]" />
                <div className="relative rounded-3xl bg-[#09090B] px-6 sm:px-10 py-10 sm:py-14 text-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#38BDF8]/[0.06] to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3">{t.secCtaTitle}</h2>
                    <p className="text-[#a1a1aa] mb-8">{t.secCtaDesc}</p>
                    <button type="button" onClick={goApp} className="group px-10 py-3.5 text-base font-bold bg-[#38BDF8] text-white rounded-xl hover:bg-[#0EA5E9] transition-all shadow-xl shadow-[#38BDF8]/25 hover:shadow-[#38BDF8]/40 hover:scale-[1.02] inline-flex items-center gap-2">
                      {t.getStartedFree} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}

          {/* Skip + mute buttons during journey */}
          {isInJourney && (
            <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2">
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={skipJourney}
                className="px-4 py-2 text-[10px] font-semibold text-[#52525B] hover:text-[#8E9299] border border-white/[0.06] rounded-lg backdrop-blur-sm bg-[#09090B]/50 transition-colors"
              >
                {t.skipJourney}
              </motion.button>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                onClick={() => { const next = !audioMuted; setAudioMuted(next); audio.setMuted(next); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.06] backdrop-blur-sm bg-[#09090B]/50 text-[#52525B] hover:text-[#8E9299] transition-colors"
                aria-label={audioMuted ? t.unmuteSound : t.muteSound}
              >
                {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </motion.button>
            </div>
          )}

          {/* Scroll to top button -- appears only near the bottom */}
          <AnimatePresence>
            {showScrollTop && (
              <motion.button
                key="scroll-top"
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                onClick={scrollToTopFn}
                className="fixed bottom-6 right-6 z-40 w-10 h-10 flex items-center justify-center rounded-full border border-white/[0.08] bg-[#09090B]/80 backdrop-blur-sm text-[#8E9299] hover:text-white hover:border-[#38BDF8]/30 transition-all"
                aria-label={t.scrollToTop}
              >
                <ChevronRight className="w-4 h-4 -rotate-90" />
              </motion.button>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </main>

        <CloudyFooter
          text={t.footer}
          copyright={t.copyright}
          footerLinks={
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-[#71717A]">
              <a href={legalDocHref(lang, "terms")} className="hover:text-[#38BDF8] transition-colors">{t.terms}</a>
              <span className="text-[#3F3F46]">·</span>
              <a href={legalDocHref(lang, "privacy")} className="hover:text-[#38BDF8] transition-colors">{t.privacy}</a>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col relative overflow-hidden px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#38BDF8]/[0.04] blur-[100px]" />
      </div>
      <div className="relative z-10 flex-1 flex items-center justify-center w-full">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="relative">
            <Zap className="w-7 h-7 text-[#38BDF8]" />
            <div className="absolute inset-0 w-7 h-7 bg-[#38BDF8]/20 blur-md rounded-full" />
          </div>
          <span className="font-black text-xl tracking-tight">Sooner</span>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-1 text-center">{mode === "login" ? t.welcomeBack : t.createAccount}</h2>
          <p className="text-sm text-[#71717A] mb-6 text-center">{mode === "login" ? t.signInDesc : t.signUpDesc}</p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button onClick={handleGoogle} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] border border-[#252525] rounded-xl text-sm hover:border-[#38BDF8]/50 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button onClick={handleGithub} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] border border-[#252525] rounded-xl text-sm hover:border-[#38BDF8]/50 transition-colors">
              <GitHubIcon className="w-4 h-4" />
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#252525]" />
            <span className="text-xs text-[#555]">{t.or}</span>
            <div className="flex-1 h-px bg-[#252525]" />
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} required
              className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#38BDF8]" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} required minLength={6}
              className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#38BDF8]" />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#38BDF8] text-white rounded-xl font-bold text-sm hover:bg-[#0EA5E9] transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : mode === "login" ? t.signIn : t.createAccount}
            </button>
          </form>

          <p className="text-[10px] text-[#52525B] text-center mt-4 leading-relaxed px-1">
            {t.legalAgreeCombined}
          </p>

          <p className="text-xs text-[#8E9299] text-center mt-4">
            {mode === "login" ? t.noAccount : t.hasAccount}
            <button onClick={() => { if (isProduction) { navigateToSubdomain(mode === "login" ? "signup" : "signin", lang); } else { setMode(mode === "login" ? "signup" : "login"); setError(""); }}} className="text-[#38BDF8] hover:underline font-bold">
              {mode === "login" ? t.signUp : t.signIn}
            </button>
          </p>
        </div>
        <button onClick={() => isProduction ? navigateToSubdomain("site", lang) : setMode("landing")} className="w-full text-center mt-4 text-xs text-[#555] hover:text-[#8E9299]">{t.backToHome}</button>
      </motion.div>
      </div>
      <footer className="relative z-10 w-full shrink-0 py-8 text-center border-t border-white/[0.06] bg-[#09090B]/80 backdrop-blur-sm">
        <p className="text-[10px] text-[#3F3F46] mb-3">{t.copyright}</p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-[#71717A]">
          <a href={legalDocHref(lang, "terms")} className="hover:text-[#38BDF8] transition-colors">{t.terms}</a>
          <span className="text-[#3F3F46]">·</span>
          <a href={legalDocHref(lang, "privacy")} className="hover:text-[#38BDF8] transition-colors">{t.privacy}</a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(firebaseConfigured);
  const [skipAuth, setSkipAuth] = useState(!firebaseConfigured);
  const [wwwRedirecting] = useState(() => typeof window !== "undefined" && window.location.hostname === "www.sooner.sh");
  const [, setHistoryTick] = useState(0);

  useEffect(() => {
    const onPop = () => setHistoryTick((n) => n + 1);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const host = window.location.hostname;
  const isMainDomain = host === "sooner.sh";
  const isLandingSite = host.startsWith("site.");
  const isBlogSite = host.startsWith("blog.");
  const isCmsSite = host.startsWith("cms.");
  const isSignupSite = host.startsWith("signup.");
  const isSigninSite = host.startsWith("signin.") || host.startsWith("login.");

  useEffect(() => {
    if (window.location.hostname === "www.sooner.sh") {
      window.location.replace(window.location.href.replace("//www.sooner.sh", "//sooner.sh"));
    }
  }, []);

  useEffect(() => {
    if (!auth || !firebaseConfigured) { setAuthLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (user) => { setAuthUser(user); setAuthLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authLoading) applyDocumentSeo();
  }, [authLoading, authUser]);

  if (wwwRedirecting) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
      </div>
    );
  }

  const pathParts = window.location.pathname.replace(/\/$/, "").split("/").filter(Boolean);

  if (pathParts.length === 1 && (pathParts[0] === "terms" || pathParts[0] === "privacy")) {
    const locale = new URLSearchParams(window.location.search).get("lang") === "ja" ? "ja" : "en";
    const doc = pathParts[0];
    let target = `/legal/${locale}/${doc}`;
    const h0 = window.location.hostname;
    if (h0.endsWith("sooner.sh") && h0 !== "sooner.sh" && h0 !== "www.sooner.sh") {
      target = `${window.location.protocol}//sooner.sh${target}`;
    }
    window.location.replace(target);
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
      </div>
    );
  }

  if (pathParts[0] === "legal") {
    const locale = pathParts[1];
    const doc = pathParts[2];
    if (
      pathParts.length === 3 &&
      (locale === "en" || locale === "ja") &&
      (doc === "terms" || doc === "privacy")
    ) {
      return <LegalPage kind={doc} pathLang={locale} />;
    }
    let target = "/legal/en/terms";
    const h1 = window.location.hostname;
    if (h1.endsWith("sooner.sh") && h1 !== "sooner.sh" && h1 !== "www.sooner.sh") {
      target = `${window.location.protocol}//sooner.sh${target}`;
    }
    window.location.replace(target);
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
      </div>
    );
  }

  if (isSignupSite || isSigninSite) {
    if (authUser) {
      window.location.href = `${window.location.protocol}//sooner.sh`;
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
        </div>
      );
    }
    return <LandingPage onSkip={() => setSkipAuth(true)} initialMode={isSignupSite ? "signup" : "login"} />;
  }

  if (isCmsSite) {
    return <CmsPage />;
  }

  if (isBlogSite) {
    return <BlogPage />;
  }

  if (isLandingSite) {
    return <LandingPage onSkip={() => setSkipAuth(true)} initialMode="landing" />;
  }

  if (isMainDomain) {
    if (firebaseConfigured && !authUser && !skipAuth) {
      const langQ = readStoredLanguage() !== "en" ? `?lang=${readStoredLanguage()}` : "";
      window.location.href = `${window.location.protocol}//signin.sooner.sh${langQ}`;
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
        </div>
      );
    }
    return <Sooner user={authUser} onSignOut={() => {
      if (auth) firebaseSignOut(auth);
      setSkipAuth(false);
      window.location.href = `${window.location.protocol}//site.sooner.sh`;
    }} />;
  }

  if (firebaseConfigured && !authUser && !skipAuth) {
    return <LandingPage onSkip={() => setSkipAuth(true)} initialMode="landing" />;
  }

  return <Sooner user={authUser} onSignOut={() => { if (auth) firebaseSignOut(auth); setSkipAuth(false); }} />;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

function apiUrl(path: string): string {
  return `${BACKEND_URL}${path}`;
}

function Sooner({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(async (config) => {
      if (user && auth) {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) config.headers.Authorization = `Bearer ${token}`;
        } catch {}
      }
      return config;
    });
    return () => { axios.interceptors.request.eject(interceptor); };
  }, [user]);

  const [projects, setProjects] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [terminalMap, setTerminalMap] = useState<Record<string, string[]>>({});
  const terminalOutput = activeProject ? (terminalMap[activeProject] || []) : [];
  const setTerminalOutput = (updater: string[] | ((prev: string[]) => string[])) => {
    if (!activeProject) return;
    setTerminalMap(prev => {
      const current = prev[activeProject] || [];
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [activeProject]: next };
    });
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [isMobileLayout, setIsMobileLayout] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [isChatOpen, setIsChatOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => {
      setIsMobileLayout(mq.matches);
      if (!mq.matches) { setIsSidebarOpen(true); setIsChatOpen(true); }
      else setIsChatOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setShowSplash(false), 2000);
    return () => window.clearTimeout(id);
  }, []);

  // New States
  const [geminiKey, setGeminiKey] = useState(() => {
    const saved = localStorage.getItem("gemini_key");
    if (saved) return saved;
    return process.env.GEMINI_API_KEY || "";
  });
  const [githubToken, setGithubToken] = useState(localStorage.getItem("github_token") || "");
  const [githubRepos, setGithubRepos] = useState<{ name: string; full_name: string; clone_url: string; html_url: string; description: string | null; private: boolean; updated_at: string; stargazers_count: number; language: string | null }[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [githubRepoSearch, setGithubRepoSearch] = useState("");
  const [cloneTab, setCloneTab] = useState<"github" | "url">("github");
  const [githubUsername, setGithubUsername] = useState(localStorage.getItem("github_username") || "");
  const [apiProvider, setApiProvider] = useState<"gemini" | "vercel-ai-gateway" | "custom">(() => {
    return (localStorage.getItem("aether_api_provider") as any) || "gemini";
  });
  const [apiBaseUrl, setApiBaseUrl] = useState(localStorage.getItem("aether_api_base_url") || "");
  const [vercelKey, setVercelKey] = useState(localStorage.getItem("aether_vercel_key") || "");
  const [customKey, setCustomKey] = useState(localStorage.getItem("aether_custom_key") || "");
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem("aether_selected_model") || "gemini-2.5-flash");
  const [runningPort, setRunningPort] = useState<number | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloneOpen, setIsCloneOpen] = useState(false);
  const [isGitOpen, setIsGitOpen] = useState(false);
  const [gitStatusData, setGitStatusData] = useState<{
    isRepo?: boolean;
    branch?: string;
    tracking?: string;
    ahead?: number;
    behind?: number;
    files?: { path: string; status: string }[];
    message?: string;
  } | null>(null);
  const [gitDiffText, setGitDiffText] = useState("");
  const [gitDiffStaged, setGitDiffStaged] = useState(false);
  const [gitCommitMessage, setGitCommitMessage] = useState("");
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState("");
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [agentMode, setAgentMode] = useState<"chat" | "plan" | "code" | "fix" | "auto-preview">("chat");
  const [language, setLanguage] = useState<"en" | "ja">(() => {
    const paramLang = new URLSearchParams(window.location.search).get("lang");
    if (paramLang === "ja" || paramLang === "en") {
      writeStoredLanguage(paramLang);
      return paramLang;
    }
    return readStoredLanguage();
  });

  useEffect(() => {
    applyDocumentSeo({ lang: language });
  }, [language]);

  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [isPackagesOpen, setIsPackagesOpen] = useState(false);
  const [packages, setPackages] = useState<{ dependencies: Record<string, string>; devDependencies: Record<string, string> }>({ dependencies: {}, devDependencies: {} });
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgVersion, setNewPkgVersion] = useState("");
  const [projectRunning, setProjectRunning] = useState(false);
  const [projectType, setProjectType] = useState<string>("static");
  const abortControllerRef = useRef<AbortController | null>(null);

  const toggleFolder = (path: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const translations = {
    en: {
      projects: "Projects",
      files: "Files",
      settings: "Settings",
      save: "Save",
      preview: "Preview",
      editor: "Editor",
      chat: "Chat",
      plan: "Plan",
      code: "Code",
      fix: "Fix",
      autoPreview: "Auto-Preview",
      clear: "Clear",
      placeholderChat: "Ask a question...",
      placeholderPlan: "Describe a feature to plan...",
      placeholderCode: "Describe code to write...",
      placeholderFix: "Describe a bug to fix...",
      placeholderAuto: "Build and preview automatically...",
      agentTitle: "AI Developer Agent",
      pipeline: "Execution Pipeline",
      idle: "Idle",
      active: "Active",
      noProjects: "No projects found",
      noFiles: "No files yet. Create a project or upload files.",
      apiKey: "Gemini API Key",
      githubToken: "GitHub Personal Access Token",
      language: "Language",
      saveChanges: "Save Changes",
      testConnection: "Test Connection",
      testing: "Testing...",
      missingKey: "Missing Key",
      download: "Download Project",
      delete: "Delete",
      stop: "Stop",
      confirmDelete: "Are you sure you want to delete this file?",
      confirmDeleteProject: "Are you sure you want to delete this project and all its files?",
      uploadProject: "Upload Project (ZIP)",
      editMode: "Edit Mode",
      suggestions: "Suggestions",
      executionComplete: "Execution complete.",
      deleteProject: "Delete Project",
      deleteFile: "Delete File",
      usingSettingsKey: "Settings Key",
      usingEnvKey: "Env Key",
      apiProvider: "API Provider",
      apiBaseUrl: "API Base URL",
      apiBaseUrlPlaceholder: "e.g. https://your-gateway-url.vercel.app/api/...",
      model: "Model",
      fetchModels: "Fetch Models",
      fetchingModels: "Fetching...",
      noModels: "Enter API Key and fetch models",
      packages: "Packages",
      addPackage: "Add Package",
      packageName: "Package name",
      version: "Version",
      noPackages: "No packages. Add one above.",
      dependencies: "Dependencies",
      devDependencies: "Dev Dependencies",
      runServer: "Run Server",
      stopServer: "Stop Server",
      serverRunning: "Running",
      importFromGithub: "Import from GitHub",
      manualUrl: "Manual URL",
      searchRepos: "Search repositories...",
      noRepos: "No repositories found.",
      connectGithub: "Connect your GitHub account to browse repositories.",
      connectGithubBtn: "Connect GitHub",
      cloneRepo: "Clone",
      privateRepo: "Private",
      loadingRepos: "Loading repositories...",
      githubConnected: "Connected as",
      disconnectGithub: "Disconnect",
      repoStars: "stars",
      gitPanel: "Git",
      gitStatusTitle: "Status & diff",
      gitBranch: "Branch",
      gitTracking: "Tracking",
      gitAheadBehind: "Ahead / behind",
      gitChangedFiles: "Changed files",
      gitDiff: "Diff",
      gitStaged: "Staged",
      gitRefresh: "Refresh",
      gitCommitMsg: "Commit message",
      gitCommit: "Commit all",
      gitPull: "Pull from origin",
      gitPush: "Push to origin",
      gitNoBackend: "Set VITE_BACKEND_URL to use Git (Railway).",
      gitNoProject: "Select a project first.",
      gitNoRepo: "Not a git repository. Clone from GitHub to enable push.",
      gitPushNeedToken: "Connect GitHub in Settings (or paste a PAT) to push.",
      brandTagline: "AI-native IDE",
      copyrightFooter: "© 2026 Sooner. All rights reserved.",
      newProject: "New Project",
      projectName: "Project Name",
      createProject: "Create Project",
      uploadFile: "Upload File",
      refreshPreview: "Refresh Preview",
      projectPreview: "Project Preview",
      cancel: "Cancel",
      confirm: "Confirm",
      signOut: "Sign out",
      filesPanel: "Files panel",
      aiChat: "AI Chat",
      closeChat: "Close chat",
      closeSidebar: "Close sidebar",
      cloneFromGithub: "Clone from GitHub",
      cloneRepository: "Clone Repository",
      connectedAs: "Connected",
      scopeInfo: "Scopes: repo, read:user",
      githubAutoConnect: "Sign in with GitHub to auto-connect, or enter a token manually.",
      noDiff: "No diff",
    },
    ja: {
      projects: "プロジェクト",
      files: "ファイル",
      settings: "設定",
      save: "保存",
      preview: "プレビュー",
      editor: "エディタ",
      chat: "チャット",
      plan: "プラン",
      code: "コード",
      fix: "修正",
      autoPreview: "自動プレビュー",
      clear: "クリア",
      placeholderChat: "質問を入力...",
      placeholderPlan: "機能を計画...",
      placeholderCode: "コードを生成...",
      placeholderFix: "バグを修正...",
      placeholderAuto: "自動ビルド＆プレビュー...",
      agentTitle: "AI開発エージェント",
      pipeline: "実行パイプライン",
      idle: "待機中",
      active: "実行中",
      noProjects: "プロジェクトが見つかりません",
      noFiles: "ファイルがありません。プロジェクトを作成するかアップロードしてください。",
      apiKey: "Gemini APIキー",
      githubToken: "GitHubアクセストークン",
      language: "言語",
      saveChanges: "変更を保存",
      testConnection: "接続テスト",
      testing: "テスト中...",
      missingKey: "キーがありません",
      download: "プロジェクトをダウンロード",
      delete: "削除",
      stop: "停止",
      confirmDelete: "このファイルを削除してもよろしいですか？",
      confirmDeleteProject: "このプロジェクトとすべてのファイルを削除してもよろしいですか？",
      uploadProject: "プロジェクトをアップロード (ZIP)",
      editMode: "編集モード",
      suggestions: "提案",
      executionComplete: "実行が完了しました。",
      deleteProject: "プロジェクトを削除",
      deleteFile: "ファイルを削除",
      usingSettingsKey: "設定キー使用中",
      usingEnvKey: "環境変数キー使用中",
      apiProvider: "APIプロバイダー",
      apiBaseUrl: "APIベースURL",
      apiBaseUrlPlaceholder: "例: https://your-gateway-url.vercel.app/api/...",
      model: "モデル",
      fetchModels: "モデル取得",
      fetchingModels: "取得中...",
      noModels: "APIキーを入力してモデルを取得",
      packages: "パッケージ",
      addPackage: "パッケージ追加",
      packageName: "パッケージ名",
      version: "バージョン",
      noPackages: "パッケージがありません。上のフォームから追加してください。",
      dependencies: "依存関係",
      devDependencies: "開発用依存関係",
      runServer: "サーバー起動",
      stopServer: "サーバー停止",
      serverRunning: "実行中",
      importFromGithub: "GitHubからインポート",
      manualUrl: "URL入力",
      searchRepos: "リポジトリを検索...",
      noRepos: "リポジトリが見つかりません。",
      connectGithub: "GitHubアカウントを連携して、リポジトリを参照できます。",
      connectGithubBtn: "GitHub連携",
      cloneRepo: "クローン",
      privateRepo: "非公開",
      loadingRepos: "リポジトリを読み込み中...",
      githubConnected: "接続中：",
      disconnectGithub: "連携解除",
      repoStars: "スター",
      gitPanel: "Git",
      gitStatusTitle: "状態と差分",
      gitBranch: "ブランチ",
      gitTracking: "追跡先",
      gitAheadBehind: "先行 / 遅れ",
      gitChangedFiles: "変更ファイル",
      gitDiff: "差分",
      gitStaged: "ステージ済み",
      gitRefresh: "更新",
      gitCommitMsg: "コミットメッセージ",
      gitCommit: "すべてコミット",
      gitPull: "origin からプル",
      gitPush: "origin にプッシュ",
      gitNoBackend: "Git 機能には VITE_BACKEND_URL（Railway）が必要です。",
      gitNoProject: "先にプロジェクトを選択してください。",
      gitNoRepo: "Git リポジトリではありません。GitHub からクローンすると push できます。",
      gitPushNeedToken: "プッシュには設定で GitHub を接続するか PAT を入力してください。",
      brandTagline: "AIネイティブIDE",
      copyrightFooter: "© 2026 Sooner. All rights reserved.",
      newProject: "新規プロジェクト",
      projectName: "プロジェクト名",
      createProject: "プロジェクト作成",
      uploadFile: "ファイルをアップロード",
      refreshPreview: "プレビューを更新",
      projectPreview: "プロジェクトプレビュー",
      cancel: "キャンセル",
      confirm: "確認",
      signOut: "ログアウト",
      filesPanel: "ファイルパネル",
      aiChat: "AIチャット",
      closeChat: "チャットを閉じる",
      closeSidebar: "サイドバーを閉じる",
      cloneFromGithub: "GitHubからクローン",
      cloneRepository: "リポジトリをクローン",
      connectedAs: "接続済み",
      scopeInfo: "repo, read:user スコープ付き",
      githubAutoConnect: "GitHubでサインインすると自動接続されます。手動でトークンを入力することもできます。",
      noDiff: "差分なし",
    }
  };

  const t = translations[language];

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearChat = () => {
    setMessages([]);
    if (activeProject && uid) {
      storageSaveChatHistory(uid, activeProject, []).catch(() => {});
    }
  };

  useEffect(() => {
    if (geminiKey) {
      localStorage.setItem("gemini_key", geminiKey);
    } else {
      localStorage.removeItem("gemini_key");
    }
  }, [geminiKey]);

  useEffect(() => {
    localStorage.setItem("github_token", githubToken);
  }, [githubToken]);

  useEffect(() => {
    localStorage.setItem("aether_api_provider", apiProvider);
  }, [apiProvider]);

  useEffect(() => {
    if (apiBaseUrl) localStorage.setItem("aether_api_base_url", apiBaseUrl);
    else localStorage.removeItem("aether_api_base_url");
  }, [apiBaseUrl]);
  useEffect(() => {
    if (vercelKey) localStorage.setItem("aether_vercel_key", vercelKey);
    else localStorage.removeItem("aether_vercel_key");
  }, [vercelKey]);
  useEffect(() => {
    if (customKey) localStorage.setItem("aether_custom_key", customKey);
    else localStorage.removeItem("aether_custom_key");
  }, [customKey]);

  useEffect(() => {
    localStorage.setItem("aether_selected_model", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    writeStoredLanguage(language);
  }, [language]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeProject && uid) {
      fetchFiles();
      storageLoadChatHistory(uid, activeProject)
        .then(data => setMessages(Array.isArray(data) ? data as ChatMessage[] : []))
        .catch(() => setMessages([]));
      if (BACKEND_URL) {
        axios.get(apiUrl(`/api/projects/${activeProject}/detect-type`))
          .then(res => {
            setProjectType(res.data.detected || "static");
            setProjectRunning(!!res.data.running);
            if (res.data.port) setRunningPort(res.data.port);
            else setRunningPort(null);
          })
          .catch(() => { setProjectType("static"); setProjectRunning(false); setRunningPort(null); });
      } else {
        setProjectType("static");
        setProjectRunning(false);
        setRunningPort(null);
      }
    } else {
      setFiles([]);
      setMessages([]);
      setProjectType("static");
      setProjectRunning(false);
    }
  }, [activeProject]);

  useEffect(() => {
    if (!activeProject || activeTab !== "preview" || !BACKEND_URL) return;
    let cancelled = false;
    const autoSetup = async () => {
      await buildAndPreview();
      if (cancelled) return;
      try {
        const res = await axios.get(apiUrl(`/api/projects/${activeProject}/detect-type`));
        if (cancelled) return;
        if ((res.data.detected === "devserver" || res.data.detected === "node") && !res.data.running) {
          setTerminalOutput(prev => [...prev, language === "ja"
            ? "> 依存関係のインストール・サーバー起動中..."
            : "> Installing dependencies & starting server..."]);
          await startProject();
        }
      } catch {}
    };
    autoSetup();
    return () => { cancelled = true; };
  }, [activeProject, activeTab]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!activeProject || !uid || messages.length === 0) return;
    const timer = setTimeout(() => {
      storageSaveChatHistory(uid, activeProject, messages)
        .catch(err => console.error("Failed to save chat", err));
    }, 500);
    return () => clearTimeout(timer);
  }, [messages, activeProject]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalOutput]);

  const uid = user?.uid || null;

  function buildFileTree(paths: string[]): FileNode[] {
    const root: FileNode[] = [];
    for (const filePath of paths) {
      const parts = filePath.split("/");
      let current = root;
      let currentPath = "";
      for (let i = 0; i < parts.length; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        const isFile = i === parts.length - 1;
        let existing = current.find((n) => n.name === parts[i]);
        if (!existing) {
          existing = { name: parts[i], path: currentPath, type: isFile ? "file" : "directory", ...(isFile ? {} : { children: [] }) };
          current.push(existing);
        }
        if (!isFile) current = existing.children!;
      }
    }
    return root;
  }

  const fetchProjects = async () => {
    if (!uid) return;
    try {
      const data = await storageListProjects(uid);
      setProjects(data);
      if (data.length > 0 && !activeProject) {
        setActiveProject(data[0]);
      }
    } catch (e) {
      console.error("Failed to fetch projects", e);
    }
  };

  const fetchFiles = async () => {
    if (!activeProject || !uid) return;
    try {
      const paths = await storageListFiles(uid, activeProject);
      setFiles(buildFileTree(paths));
    } catch (e) {
      console.error("Failed to fetch files", e);
    }
  };

  const createProject = async () => {
    if (!newProjectName || !uid) return;
    try {
      await storageCreateProject(uid, newProjectName);
      await fetchProjects();
      setActiveProject(newProjectName);
      setIsNewProjectOpen(false);
      setNewProjectName("");
    } catch (e) {
      console.error("Failed to create project", e);
      alert("Failed to create project");
    }
  };

  const openFile = async (filePath: string) => {
    if (!activeProject || !uid) return;
    try {
      const content = await storageDownloadFile(uid, activeProject, filePath);
      setActiveFile(filePath);
      setFileContent(content ?? "");
    } catch (e) {
      console.error("Failed to open file", e);
    }
  };

  const saveFile = async () => {
    if (!activeProject || !activeFile || !uid) return;
    try {
      await storageUploadFile(uid, activeProject, activeFile, fileContent);
    } catch (e) {
      alert("Failed to save file");
    }
  };

  const runCommand = async (command: string) => {
    if (!activeProject) return;
    setTerminalOutput(prev => [...prev, `> ${command}`]);
    if (!BACKEND_URL) {
      setTerminalOutput(prev => [...prev, language === "ja" ? "バックエンドが設定されていません。" : "Backend not configured."]);
      return;
    }
    try {
      const res = await axios.post(apiUrl(`/api/projects/${activeProject}/terminal`), { command });
      if (res.data.stdout) setTerminalOutput(prev => [...prev, res.data.stdout]);
      if (res.data.stderr) setTerminalOutput(prev => [...prev, `Error: ${res.data.stderr}`]);
    } catch (e) {
      setTerminalOutput(prev => [...prev, "Failed to execute command"]);
    }
  };

  const fetchPackages = async () => {
    if (!activeProject || !uid) return;
    try {
      const content = await storageDownloadFile(uid, activeProject, "package.json");
      if (content) {
        const pkg = JSON.parse(content);
        setPackages({ dependencies: pkg.dependencies || {}, devDependencies: pkg.devDependencies || {} });
      } else {
        setPackages({ dependencies: {}, devDependencies: {} });
      }
    } catch {
      setPackages({ dependencies: {}, devDependencies: {} });
    }
  };

  const addPackage = async () => {
    if (!activeProject || !newPkgName.trim() || !uid) return;
    try {
      const content = await storageDownloadFile(uid, activeProject, "package.json");
      const pkg = content ? JSON.parse(content) : { dependencies: {}, devDependencies: {} };
      if (!pkg.dependencies) pkg.dependencies = {};
      pkg.dependencies[newPkgName.trim()] = newPkgVersion.trim() || "latest";
      await storageUploadFile(uid, activeProject, "package.json", JSON.stringify(pkg, null, 2));
      setNewPkgName("");
      setNewPkgVersion("");
      fetchPackages();
      fetchFiles();
    } catch (e) {
      alert("Failed to add package");
    }
  };

  const removePackage = async (name: string) => {
    if (!activeProject || !uid) return;
    try {
      const content = await storageDownloadFile(uid, activeProject, "package.json");
      if (content) {
        const pkg = JSON.parse(content);
        delete pkg.dependencies?.[name];
        delete pkg.devDependencies?.[name];
        await storageUploadFile(uid, activeProject, "package.json", JSON.stringify(pkg, null, 2));
      }
      fetchPackages();
      fetchFiles();
    } catch (e) {
      alert("Failed to remove package");
    }
  };

  const startProject = async () => {
    if (!activeProject) return;
    if (!BACKEND_URL) {
      setTerminalOutput(prev => [...prev, language === "ja" ? "バックエンドが設定されていません。" : "Backend not configured."]);
      return;
    }
    setTerminalOutput(prev => [...prev, `> Starting ${projectType} server...`]);
    try {
      const res = await axios.post(apiUrl(`/api/projects/${activeProject}/run`));
      if (res.data.status === "install-failed") {
        setTerminalOutput(prev => [...prev, ...(res.data.lines || []), "npm install failed."]);
        return;
      }
      if (res.data.status === "started" || res.data.status === "already-running" || res.data.status === "installing") {
        setProjectRunning(true);
        if (res.data.port) setRunningPort(res.data.port);
        setTerminalOutput(prev => [...prev, `Server running on port ${res.data.port} (${res.data.type})`]);
        let seen = 0;
        const poll = async () => {
          if (!activeProject) return;
          try {
            const logRes = await axios.get(apiUrl(`/api/projects/${activeProject}/run-logs?since=${seen}`));
            if (logRes.data.lines?.length > 0) {
              setTerminalOutput(prev => [...prev, ...logRes.data.lines]);
            }
            seen = logRes.data.total || seen;
            if (logRes.data.status === "running") {
              setTimeout(poll, 2000);
            } else {
              setProjectRunning(false);
            }
          } catch {}
        };
        setTimeout(poll, 1000);
      } else if (res.data.status === "static") {
        setTerminalOutput(prev => [...prev, language === "ja" ? "バックエンドは検出されませんでした。" : "No backend detected."]);
      }
    } catch (e) {
      setTerminalOutput(prev => [...prev, "Failed to start project server."]);
    }
  };

  const stopProject = async () => {
    if (!activeProject || !BACKEND_URL) return;
    try {
      await axios.post(apiUrl(`/api/projects/${activeProject}/stop`));
      setProjectRunning(false);
      setRunningPort(null);
      setTerminalOutput(prev => [...prev, language === "ja" ? "サーバーを停止しました。" : "Server stopped."]);
    } catch {
      setTerminalOutput(prev => [...prev, "Failed to stop server."]);
    }
  };

  const isFlutterProject = () => {
    const hasFile = (name: string): boolean => {
      const check = (nodes: FileNode[]): boolean => nodes.some(n => n.name === name || (n.children && check(n.children)));
      return check(files);
    };
    return hasFile("pubspec.yaml");
  };

  const pollBuildStatus = (project: string): Promise<boolean> => {
    return new Promise((resolve) => {
      let seen = 0;
      const poll = async () => {
        try {
          const res = await axios.get(apiUrl(`/api/projects/${project}/build-status?since=${seen}`));
          const { status, lines, total } = res.data;
          if (lines && lines.length > 0) {
            setTerminalOutput(prev => [...prev, ...lines]);
          }
          seen = total || seen;
          if (status === "success") { resolve(true); return; }
          if (status === "failed") { resolve(false); return; }
          setTimeout(poll, 1000);
        } catch {
          resolve(false);
        }
      };
      poll();
    });
  };

  const buildAndPreview = async () => {
    if (!activeProject || !BACKEND_URL) return true;
    if (!isFlutterProject()) return true;

    setTerminalOutput(prev => [...prev, "> Flutter project detected. Checking build..."]);
    try {
      const res = await axios.post(apiUrl(`/api/projects/${activeProject}/build-preview`));
      const { status } = res.data;
      if (status === "already-built") {
        setTerminalOutput(prev => [...prev, "Flutter: Build exists, loading preview..."]);
        return true;
      }
      if (status === "build-started" || status === "building") {
        setTerminalOutput(prev => [...prev, "Flutter: Building... (this may take a minute)"]);
        return await pollBuildStatus(activeProject);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProject || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        if (uid && activeProject) await storageUploadFile(uid, activeProject, file.name, content);
        fetchFiles();
        setTerminalOutput(prev => [...prev, `Uploaded file: ${file.name}`]);
      } catch (e) {
        alert("Upload failed");
      }
    };
    reader.readAsText(file);
  };

  const reconnectGitHub = async () => {
    if (!auth) return;
    try {
      const provider = new GithubAuthProvider();
      provider.addScope("repo");
      provider.addScope("read:user");
      const result = await signInWithPopup(auth, provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGithubToken(credential.accessToken);
        localStorage.setItem("github_token", credential.accessToken);
        return credential.accessToken;
      }
    } catch (e) {
      console.error("GitHub reconnect failed", e);
    }
    return null;
  };

  const fetchGitHubRepos = async () => {
    let token = githubToken;
    if (!token) return;
    setIsLoadingRepos(true);
    try {
      const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", {
        headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = await res.json();
      setGithubRepos(data);
      if (!githubUsername) {
        const userRes = await fetch("https://api.github.com/user", {
          headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          setGithubUsername(userData.login || "");
          localStorage.setItem("github_username", userData.login || "");
        }
      }
    } catch (e) {
      console.error("Failed to fetch GitHub repos", e);
      setGithubRepos([]);
    }
    setIsLoadingRepos(false);
  };

  const handleCloneFromGitHub = async (repo: { clone_url: string; name: string }) => {
    const projectName = repo.name;
    if (!BACKEND_URL) {
      setTerminalOutput(prev => [...prev, language === "ja" ? "Git cloneにはバックエンドが必要です。" : "Git clone requires a backend server."]);
      setIsCloneOpen(false);
      return;
    }
    try {
      setTerminalOutput(prev => [...prev, `Cloning ${repo.clone_url}...`]);
      setIsCloneOpen(false);
      await axios.post(apiUrl("/api/projects/clone"), { repoUrl: repo.clone_url, name: projectName, token: githubToken });
      await fetchProjects();
      setActiveProject(projectName);
      setRepoUrl("");
      setCloneName("");
    } catch (e: any) {
      alert(`Clone failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleClone = async () => {
    if (!repoUrl || !cloneName) return;
    if (!BACKEND_URL) {
      setTerminalOutput(prev => [...prev, language === "ja" ? "Git cloneにはバックエンドが必要です。ZIPアップロードをご利用ください。" : "Git clone requires a backend. Please use ZIP upload instead."]);
      setIsCloneOpen(false);
      return;
    }
    try {
      setTerminalOutput(prev => [...prev, `Cloning ${repoUrl}...`]);
      await axios.post(apiUrl("/api/projects/clone"), { repoUrl, name: cloneName, token: githubToken });
      fetchProjects();
      setActiveProject(cloneName);
      setIsCloneOpen(false);
      setRepoUrl("");
      setCloneName("");
    } catch (e: any) {
      alert(`Clone failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const refreshGitPanel = async (stagedOverride?: boolean) => {
    if (!BACKEND_URL || !activeProject) return;
    setGitLoading(true);
    setGitError("");
    try {
      const s = await axios.get(apiUrl(`/api/projects/${encodeURIComponent(activeProject)}/git/status`));
      setGitStatusData(s.data);
      const staged = stagedOverride ?? gitDiffStaged;
      const d = await axios.get(apiUrl(`/api/projects/${encodeURIComponent(activeProject)}/git/diff`), {
        params: { staged: staged ? "1" : "0" },
      });
      setGitDiffText(d.data.diff || "");
    } catch (e: any) {
      setGitError(e.response?.data?.error || e.message || "Git error");
      setGitStatusData(null);
      setGitDiffText("");
    }
    setGitLoading(false);
  };

  const handleGitCommit = async () => {
    if (!BACKEND_URL || !activeProject || !gitCommitMessage.trim()) return;
    setGitLoading(true);
    setGitError("");
    try {
      await axios.post(apiUrl(`/api/projects/${encodeURIComponent(activeProject)}/git/commit`), {
        message: gitCommitMessage.trim(),
      });
      setGitCommitMessage("");
      await refreshGitPanel();
    } catch (e: any) {
      setGitError(e.response?.data?.error || e.response?.data?.details || e.message);
    }
    setGitLoading(false);
  };

  const handleGitPush = async () => {
    if (!BACKEND_URL || !activeProject) return;
    if (!githubToken) {
      setGitError(language === "ja" ? t.gitPushNeedToken : t.gitPushNeedToken);
      return;
    }
    setGitLoading(true);
    setGitError("");
    try {
      await axios.post(apiUrl(`/api/projects/${encodeURIComponent(activeProject)}/git/push`), {
        token: githubToken,
      });
      await refreshGitPanel();
    } catch (e: any) {
      setGitError(e.response?.data?.error || e.response?.data?.details || e.message);
    }
    setGitLoading(false);
  };

  const handleGitPull = async () => {
    if (!BACKEND_URL || !activeProject) return;
    if (!githubToken) {
      setGitError(t.gitPushNeedToken);
      return;
    }
    setGitLoading(true);
    setGitError("");
    try {
      await axios.post(apiUrl(`/api/projects/${encodeURIComponent(activeProject)}/git/pull`), {
        token: githubToken,
      });
      await refreshGitPanel();
    } catch (e: any) {
      setGitError(e.response?.data?.error || e.response?.data?.details || e.message);
    }
    setGitLoading(false);
  };

  const getEffectiveBaseUrl = (): string | undefined => {
    if (apiProvider === "vercel-ai-gateway" && apiBaseUrl) return apiBaseUrl;
    if (apiProvider === "custom" && apiBaseUrl) return apiBaseUrl;
    return undefined;
  };

  const getActiveApiKey = (): string => {
    if (apiProvider === "vercel-ai-gateway") return vercelKey || geminiKey;
    if (apiProvider === "custom") return customKey || geminiKey;
    return geminiKey || process.env.GEMINI_API_KEY || "";
  };

  const createAiClient = (key?: string) => {
    const activeKey = key || getActiveApiKey();
    const baseUrl = getEffectiveBaseUrl();
    return new GoogleGenAI(baseUrl ? { apiKey: activeKey, httpOptions: { baseUrl } } : { apiKey: activeKey });
  };

  const fetchModels = async () => {
    const key = getActiveApiKey();
    if (!key) return;
    setIsFetchingModels(true);
    try {
      const ai = createAiClient();
      const result = await ai.models.list();
      const modelNames: string[] = [];
      for await (const model of result) {
        const name = model.name?.replace("models/", "") || "";
        if (name) modelNames.push(name);
      }
      modelNames.sort();
      if (modelNames.length === 0) {
        setAvailableModels(["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"]);
      } else {
        setAvailableModels(modelNames);
      }
    } catch {
      setAvailableModels(["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"]);
    }
    setIsFetchingModels(false);
  };

  const testApiKey = async () => {
    const key = getActiveApiKey();
    if (!key) return;
    setIsTestingKey(true);
    try {
      const testAi = createAiClient();
      await testAi.models.generateContent({
        model: selectedModel || "gemini-2.5-flash",
        contents: "Hi",
      });
      alert("API Key is valid!");
      fetchModels();
    } catch (e: any) {
      alert(`API Key test failed: ${e.message}`);
    } finally {
      setIsTestingKey(false);
    }
  };

  const stopAgent = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAgentRunning(false);
      updateLastStep("failed", "Stopped by user");
    }
  };

  const deleteFile = async (filePath: string) => {
    if (!activeProject) return;
    setConfirmDialog({
      isOpen: true,
      title: t.deleteFile,
      message: t.confirmDelete,
      onConfirm: async () => {
        try {
          if (uid && activeProject) await storageDeleteFile(uid, activeProject, filePath);
          fetchFiles();
          if (activeFile === filePath) {
            setActiveFile(null);
            setFileContent("");
          }
          if (filePath === ".sooner_chat.json" || filePath === ".aether_chat.json") {
            setMessages([]);
          }
          setConfirmDialog(null);
        } catch (error) {
          console.error("Failed to delete file:", error);
          setConfirmDialog(null);
        }
      }
    });
  };

  const downloadProject = async () => {
    if (!activeProject || !uid) return;
    const zip = new JSZip();
    
    const addFilesToZip = async (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === "file") {
          const content = await storageDownloadFile(uid, activeProject, node.path);
          zip.file(node.path, content ?? "");
        } else if (node.children) {
          await addFilesToZip(node.children);
        }
      }
    };

    await addFilesToZip(files);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${activeProject}.zip`);
  };

  const deleteProject = async (projectName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t.deleteProject,
      message: t.confirmDeleteProject,
      onConfirm: async () => {
        try {
          if (uid) await storageDeleteProject(uid, projectName);
          await fetchProjects();
          if (activeProject === projectName) {
            setActiveProject(null);
            setFiles([]);
          }
          setConfirmDialog(null);
        } catch (e) {
          console.error("Failed to delete project", e);
          setConfirmDialog(null);
        }
      }
    });
  };

  const uploadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const projectName = file.name.replace(".zip", "");

    try {
      await storageCreateProject(uid, projectName);
      for (const [filePath, fileData] of Object.entries(contents.files)) {
        if (!fileData.dir) {
          const content = await fileData.async("string");
          await storageUploadFile(uid, projectName, filePath, content);
        }
      }
      await fetchProjects();
      setActiveProject(projectName);
    } catch (e) {
      console.error("Failed to upload project", e);
    }
  };

  const handleAgentAction = async (overrideInput?: string) => {
    const effectiveInput = overrideInput ?? input;
    if (!effectiveInput) return;
    
    const currentKey = getActiveApiKey();
    if (!currentKey) {
      setMessages(prev => [...prev, { role: "assistant", content: language === "ja" ? "APIキーが設定されていません。設定画面でAPIキーを入力してください。" : "API Key is missing. Please set it in Settings." }]);
      setIsSettingsOpen(true);
      return;
    }
    
    const ai = createAiClient();
    const userMsg: ChatMessage = { role: "user", content: effectiveInput };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const currentInput = effectiveInput;
    setInput("");
    setIsAgentRunning(true);
    setAgentSteps([]);
    abortControllerRef.current = new AbortController();

    // Context Selection (Prompt Caching simulation)
    // We pick the last 10 messages + any messages containing keywords from the current input
    // To prevent token limit errors, we strictly limit the total content length
    const keywords = currentInput.toLowerCase().split(/\s+/).filter(k => k.length > 3);
    let totalLength = 0;
    const MAX_HISTORY_LENGTH = 100000; // Safe limit to avoid 1M token error

    const relevantHistory = messages.slice().reverse().filter((m, idx) => {
      if (totalLength > MAX_HISTORY_LENGTH) return false;
      
      const isRelevant = idx < 10 || keywords.some(k => m.content.toLowerCase().includes(k));
      if (isRelevant) {
        totalLength += m.content.length;
        return true;
      }
      return false;
    }).reverse();

    // Also truncate newMessages if they are too long
    const cappedMessages = newMessages.slice(-20); // Keep only last 20 for the direct contents field

    const historyContext = relevantHistory.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");

    // Language instructions
    const langInstruction = language === "ja" ? "回答は日本語で行ってください。ただし技術用語やコード内のコメントは英語でも構いません。" : "Respond in English.";

    try {
      // 1. Decide: Chat or Code?
      addStep("plan", "Analyzing request and history...");
      
      let decisionType = agentMode === "chat" ? "chat" : "code";

      if (decisionType === "chat" || !activeProject) {
        if (decisionType === "code" && !activeProject) {
          setMessages(prev => [...prev, { role: "assistant", content: language === "ja" ? "アクティブなプロジェクトがありません。プロジェクトを作成または選択してください。" : "I can't modify code without an active project. Please create or select a project first." }]);
          updateLastStep("failed", "No active project.");
          return;
        }

        updateLastStep("completed", "Generating response...");
        let chatResponse;
        try {
          chatResponse = await ai.models.generateContent({
            model: selectedModel,
            contents: cappedMessages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
            config: { 
              systemInstruction: `You are Sooner. You are helpful, technical, and concise. 
              ${langInstruction}
              Conversation History Context:
              ${historyContext}
              
              Use this context to maintain continuity. If the user asks about a previous plan, refer to it.`
            }
          });
        } catch (e: any) {
          if (e.message?.includes("429") || e.message?.includes("RESOURCE_EXHAUSTED")) {
            chatResponse = await ai.models.generateContent({
              model: selectedModel,
              contents: newMessages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
              config: { 
                systemInstruction: "You are Sooner. You are helpful, technical, and concise. You MUST use the provided conversation history to maintain context."
              }
            });
          } else {
            throw e;
          }
        }
        if (!abortControllerRef.current?.signal.aborted) {
          setMessages(prev => [...prev, { role: "assistant", content: chatResponse.text || "" }]);
          updateLastStep("completed", "Answered.");
        }
      } else {
        // 2. Plan for Code
        updateLastStep("completed", `Creating execution plan (${agentMode} mode)...`);
        let planResponse;
        const planPrompt = `
        You are an expert developer proficient in ALL programming languages and frameworks including React, Vue, Angular, Flutter, Swift, Kotlin, Python, Go, Rust, and more.
        You MUST follow the conversation history and the user's request to determine the correct language/framework.
        
        CONVERSATION HISTORY:
        ${historyContext}

        CURRENT REQUEST: ${currentInput}
 
        CURRENT PROJECT STATE:
        Files: ${JSON.stringify(files)}
        Active Project: ${activeProject}
        
        MODE: ${agentMode}
        
        FRAMEWORK DETECTION:
        - Detect the framework/language from the user's request and existing project files.
        - Use EXACTLY the framework the user asks for. Do NOT default to React unless the user asks for it.
        - For Flutter: Use Dart, create lib/main.dart, pubspec.yaml, and web/index.html. The web/index.html MUST use the new Flutter loader API: _flutter.loader.load() (NOT the deprecated loadEntrypoint).
        - For React: Use .tsx files, create index.html with <script type="module" src="./src/main.tsx"></script>, use Tailwind CDN.
        - For Vue: Use .vue SFC files with <template>, <script>, <style>. Create index.html with <script type="module" src="./src/main.js"></script>. Import from "vue".
        - For Svelte: Use .svelte files. Create index.html with appropriate setup.
        - For Angular: Use .ts files with standard Angular structure.
        - For Python: Create .py files and appropriate project structure.
        - For plain HTML/CSS/JS: Create standard web files.

        PREVIEW ENVIRONMENT (for web-based projects):
        - The preview serves index.html from the project root (or build/web/, public/, dist/).
        - ON-THE-FLY transpilation is available for .ts, .tsx, .jsx, .vue, .svelte files.
        - IMPORTANT: npm packages are resolved via esm.sh CDN automatically. Any bare import (e.g. "three", "gsap", "chart.js") works in preview without npm install.
        - If using npm packages, create a package.json with dependencies listed so the preview can build an import map.
        - For React projects: ESM imports for react, react-dom are pre-mapped to CDNs. Tailwind CDN is auto-injected.
        - For Vue projects: "vue" is pre-mapped to CDN. Use Vue 3 composition API or options API.
        - For Three.js/GSAP/etc: Just import them normally (e.g. import * as THREE from "three"). They resolve to esm.sh automatically.
        - Always use RELATIVE paths (e.g., './src/main.tsx', not '/src/main.tsx').
        - For Flutter web: create web/index.html as the entry point.
        
        BACKEND PROJECTS:
        - The preview can run backend servers (Node.js, Python, Go, Rust).
        - For Node.js: Create package.json with "scripts": { "start": "node server.js" } or "dev" script. The server MUST listen on the port from process.env.PORT.
        - For Python (Flask/FastAPI): Create app.py or main.py + requirements.txt. Use port from os.environ.get("PORT", 4001).
        - For Go: Create go.mod + main.go. Read port from os.Getenv("PORT").
        - CRITICAL: The server MUST use the PORT environment variable, not a hardcoded port.
        - Backend servers are auto-detected and started when the user clicks Preview.
        
        INSTRUCTIONS FOR MODES:
        - 'plan': Just describe the steps in the JSON 'description' fields.
        - 'code': Provide full, production-ready code in 'content' for 'write_file' actions.
        - 'fix': Analyze the history for errors and provide targeted fixes.
        - 'auto-preview': Build a complete app that works immediately in the preview.
        
        IMPORTANT: 
        1. If the request involves new libraries or dependencies, include a 'run_command' step (e.g., 'npm install <package>', 'flutter pub get', 'pip install <package>').
        2. Check existing files for missing dependencies or imports and fix them.
        3. If the user previously discussed a plan in 'Chat' or 'Plan' mode, EXECUTE that plan now.
        4. Use the language/framework the user explicitly requests. NEVER force React if not asked.
 
        Return a JSON array of actions:
        { action: "write_file" | "run_command", path?: string, content?: string, command?: string, description: string }[]
        
        Return ONLY the JSON array. No markdown, no extra text.`;

        try {
          planResponse = await ai.models.generateContent({
            model: selectedModel,
            contents: planPrompt,
            config: { 
              responseMimeType: "application/json",
              systemInstruction: "You are a world-class software developer. Use the exact language and framework the user requests. For React, use modular .tsx files and Tailwind CSS. For Flutter, use Dart with proper project structure. For other frameworks, follow their best practices. NEVER force a specific framework unless the user asks for it."
            }
          });
        } catch (e: any) {
          planResponse = await ai.models.generateContent({
            model: selectedModel,
            contents: planPrompt,
            config: { 
              responseMimeType: "application/json",
              systemInstruction: "You are a world-class software developer. Use the exact language and framework the user requests. Follow professional project patterns for the chosen technology."
            }
          });
        }
        
        let plan;
        try {
          let text = planResponse.text;
          if (text.includes("```json")) {
            text = text.split("```json")[1].split("```")[0].trim();
          } else if (text.includes("```")) {
            text = text.split("```")[1].split("```")[0].trim();
          }
          plan = JSON.parse(text);
          if (!Array.isArray(plan)) {
            throw new Error("AI plan is not an array");
          }
        } catch (e) {
          console.error("JSON Parse Error", e, planResponse.text);
          throw new Error("Failed to parse AI plan. The response was not valid JSON array.");
        }
        updateLastStep("completed", "Plan generated based on history.");

        if (agentMode === "plan") {
          if (!abortControllerRef.current?.signal.aborted) {
            setMessages(prev => [...prev, { role: "assistant", content: "I've drafted a plan based on our conversation. Switch to 'Code' mode to apply these changes:\n\n" + plan.map((s: any) => `- ${s.description}`).join("\n") }]);
          }
        } else {
          // 3. Execute
          for (const step of plan) {
            if (abortControllerRef.current?.signal.aborted) break;
            addStep(step.action === "write_file" ? "code" : "test", step.description);
            
            if (step.action === "write_file") {
              if (uid && activeProject) await storageUploadFile(uid, activeProject, step.path, step.content);
              if (BACKEND_URL && activeProject) {
                await axios.post(apiUrl(`/api/projects/${activeProject}/file`), { filePath: step.path, content: step.content }).catch(() => {});
              }
              setTerminalOutput(prev => [...prev, `Agent: Wrote ${step.path}`]);
            } else if (step.action === "run_command") {
              if (BACKEND_URL && activeProject) {
                try {
                  const res = await axios.post(apiUrl(`/api/projects/${activeProject}/terminal`), { command: step.command });
                  setTerminalOutput(prev => [...prev, `Agent: Ran ${step.command}`, res.data.stdout, res.data.stderr].filter(Boolean));
                } catch {
                  setTerminalOutput(prev => [...prev, `Agent: Failed to run ${step.command}`]);
                }
              } else {
                setTerminalOutput(prev => [...prev, `Agent: ${step.command} (backend not configured)`]);
              }
            }
            
            updateLastStep("completed", `Done: ${step.description}`);
          }

          fetchFiles();
          
          if (agentMode === "auto-preview") {
            addStep("test", language === "ja" ? "ビルドチェック中..." : "Checking build requirements...");
            const buildOk = await buildAndPreview();
            updateLastStep("completed", language === "ja" ? "ビルドチェック完了" : "Build check complete");

            addStep("test", language === "ja" ? "自動プレビューを起動中..." : "Launching Auto-Preview...");
            setActiveTab("preview");
            
            setTimeout(() => {
              const iframe = document.getElementById("preview-frame") as HTMLIFrameElement;
              if (iframe) iframe.src = iframe.src;
              updateLastStep("completed", language === "ja" ? "プレビューが更新されました。" : "Preview updated.");
            }, 500);
          }
          
          if (!abortControllerRef.current?.signal.aborted) {
            const completionMsg = language === "ja" ? `実行が完了しました。${agentMode === "auto-preview" ? "プレビューが更新されました。" : "結果を確認してください。"}` : `I've executed the changes in ${agentMode} mode. ${agentMode === "auto-preview" ? "The preview has been updated." : "You can check the results now."}`;
            setMessages(prev => [...prev, { role: "assistant", content: completionMsg }]);
          }

          // Automatic Visual Review Loop for auto-preview
          if (agentMode === "auto-preview") {
            const runVisualReview = async (iteration = 1) => {
              if (iteration > 5 || abortControllerRef.current?.signal.aborted) {
                if (iteration > 5) {
                  setMessages(prev => [...prev, { role: "assistant", content: language === "ja" ? "ビジュアルの最適化を完了しました。" : "Visual optimization complete." }]);
                }
                return;
              }

              addStep("test", language === "ja" ? `スクリーンショットを取得して分析中 (回数: ${iteration})...` : `Capturing screenshot and analyzing (Iteration: ${iteration})...`);
              
              const iframe = document.getElementById("preview-frame") as HTMLIFrameElement;
              let screenshotBase64 = "";

              if (iframe && iframe.contentDocument) {
                try {
                  const canvas = await html2canvas(iframe.contentDocument.body);
                  screenshotBase64 = canvas.toDataURL("image/png").split(",")[1];
                } catch (e) {
                  console.error("Screenshot capture failed:", e);
                }
              }

              const collectFiles = async (nodes: FileNode[]): Promise<{ path: string; content: string }[]> => {
                const results: { path: string; content: string }[] = [];
                for (const f of nodes) {
                  if (f.type === "file") {
                    const content = uid && activeProject ? await storageDownloadFile(uid, activeProject, f.path) : "";
                    results.push({ path: f.path, content: content ?? "" });
                  } else if (f.children) {
                    results.push(...await collectFiles(f.children));
                  }
                }
                return results;
              };
              const currentFiles = await collectFiles(files);

              const visualPrompt = `
              You are a world-class UI/UX auditor. Review the provided screenshot and code for visual bugs, layout issues, or design inconsistencies.
              
              FILES:
              ${JSON.stringify(currentFiles)}

              If everything looks perfect and matches professional design standards, return an empty array [].
              If there are issues, return a JSON array of fixes:
              { action: "write_file", path: string, content: string, description: string }[]
              
              Focus on:
              1. Responsive design (mobile/desktop)
              2. Color contrast and accessibility
              3. Spacing and alignment
              4. Professional typography
              5. Visual bugs (broken images, overlapping text, etc.)
              `;
              
              try {
                const parts: any[] = [{ text: visualPrompt }];
                if (screenshotBase64) {
                  parts.push({
                    inlineData: {
                      mimeType: "image/png",
                      data: screenshotBase64
                    }
                  });
                }

                const visualRes = await ai.models.generateContent({
                  model: selectedModel,
                  contents: [{ role: "user", parts }],
                  config: { responseMimeType: "application/json" }
                });
                
                let text = visualRes.text;
                if (text.includes("```json")) {
                  text = text.split("```json")[1].split("```")[0].trim();
                } else if (text.includes("```")) {
                  text = text.split("```")[1].split("```")[0].trim();
                }
                
                const fixes = JSON.parse(text);
                if (fixes.length > 0) {
                  addStep("code", language === "ja" ? `ビジュアルの問題を自動修正中 (${iteration})...` : `Auto-fixing visual issues (${iteration})...`);
                  for (const fix of fixes) {
                    if (uid && activeProject) await storageUploadFile(uid, activeProject, fix.path, fix.content);
                    if (BACKEND_URL && activeProject) {
                      await axios.post(apiUrl(`/api/projects/${activeProject}/file`), { filePath: fix.path, content: fix.content }).catch(() => {});
                    }
                  }
                  fetchFiles();
                  if (iframe) iframe.src = iframe.src;
                  updateLastStep("completed", language === "ja" ? `ビジュアル修正 (${iteration}) を適用しました。` : `Visual fixes (${iteration}) applied.`);
                  
                  // Recursive call for next iteration
                  setTimeout(() => runVisualReview(iteration + 1), 3000);
                } else {
                  updateLastStep("completed", language === "ja" ? "ビジュアルチェック完了（問題なし）" : "Visual check complete (no issues).");
                }
              } catch (e) {
                console.error("Visual review error:", e);
                updateLastStep("failed", "Visual review failed.");
              }
            };

            setTimeout(() => runVisualReview(1), 3000);
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("API key not valid") || error.message?.includes("quota")) {
        updateLastStep("failed", "Paused.");
        if (!abortControllerRef.current?.signal.aborted) {
          setMessages(prev => [...prev, { role: "assistant", content: language === "ja" ? "APIの制限に達しました。しばらくしてから再試行してください。" : "API rate limit reached. Please try again shortly." }]);
        }
        return; 
      }
      
      let errorMsg = "Error occurred.";
      if (error.message?.includes("INVALID_ARGUMENT") || error.message?.includes("token count exceeds")) {
        errorMsg = "The conversation history has become too large for the AI to process. I've attempted to truncate it, but it's still exceeding limits. Please use the 'Clear' button to start a fresh session.";
      }
      updateLastStep("failed", "Execution failed.");
      if (!abortControllerRef.current?.signal.aborted) {
        setMessages(prev => [...prev, { role: "assistant", content: errorMsg }]);
      }
    } finally {
      setIsAgentRunning(false);
    }
  };

  const addStep = (type: AgentStep["type"], message: string) => {
    setAgentSteps(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 11),
      type,
      status: "running",
      message,
      timestamp: Date.now()
    }]);
  };

  const updateLastStep = (status: AgentStep["status"], message: string) => {
    setAgentSteps(prev => {
      const next = [...prev];
      if (next.length > 0) {
        next[next.length - 1] = { ...next[next.length - 1], status, message };
      }
      return next;
    });
  };

  return (
    <ErrorBoundary>
    <AnimatePresence>
      {showSplash && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0A0A] overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#38BDF8]/[0.04] blur-[120px] animate-[pulse-glow_4s_ease-in-out_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[#0EA5E9]/[0.03] blur-[80px] animate-[pulse-glow_3s_ease-in-out_infinite_0.5s]" />
          </div>
          <div className="relative">
            <div className="absolute inset-[-28px] animate-[orbit_6s_linear_infinite]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]/70 shadow-[0_0_8px_2px_rgba(56,189,248,0.4)]" />
            </div>
            <div className="absolute inset-[-28px] animate-[orbit_6s_linear_infinite_reverse]" style={{ animationDirection: "reverse", animationDelay: "3s" }}>
              <div className="w-1 h-1 rounded-full bg-[#38BDF8]/40 shadow-[0_0_6px_2px_rgba(56,189,248,0.2)]" />
            </div>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
              <div className="relative">
                <Zap className="w-16 h-16 text-[#38BDF8] relative z-10" />
                <div className="absolute inset-[-8px] bg-[#38BDF8]/25 blur-2xl rounded-full animate-[pulse-glow_3s_ease-in-out_infinite]" />
              </div>
            </motion.div>
          </div>
          <motion.span initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="mt-7 text-3xl font-black tracking-tight text-white">
            Sooner
          </motion.span>
          <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#52525B]">
            {t.brandTagline}
          </motion.span>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mt-6 w-12 h-px bg-gradient-to-r from-transparent via-[#38BDF8]/40 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
    <div className="flex h-screen w-screen bg-[#0A0A0A] text-[#E4E3E0] font-sans overflow-hidden selection:bg-[#38BDF8] selection:text-black relative pb-7 box-border">
      {isMobileLayout && isSidebarOpen && (
        <button
          type="button"
          aria-label={t.closeSidebar}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <motion.div 
        initial={false}
        animate={{ width: isSidebarOpen ? 300 : 0 }}
        className={cn(
          "flex flex-col border-r border-[#1A1A1A] bg-[#0F0F0F] relative overflow-hidden z-50 md:z-auto",
          isMobileLayout && "fixed left-0 top-0 h-full shadow-2xl md:static md:h-auto md:shadow-none"
        )}
      >
        <div className="p-4 border-bottom border-[#1A1A1A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#38BDF8]" />
            <span className="font-bold tracking-tight text-sm text-white">Sooner</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsCloneOpen(true)} title={t.cloneFromGithub} className="p-1 hover:bg-[#1A1A1A] rounded text-[#8E9299]">
              <GitHubIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsGitOpen(true);
                setGitError("");
                if (activeProject && BACKEND_URL) void refreshGitPanel();
              }}
              title={t.gitPanel}
              className="p-1 hover:bg-[#1A1A1A] rounded text-[#8E9299]"
            >
              <GitMerge className="w-4 h-4" />
            </button>
            <button onClick={() => setIsNewProjectOpen(true)} title={t.newProject} className="p-1 hover:bg-[#1A1A1A] rounded text-[#8E9299]">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Project Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] uppercase tracking-widest text-[#8E9299]">{t.projects}</label>
              <button 
                onClick={() => document.getElementById("project-upload")?.click()}
                className="p-1 hover:bg-[#1A1A1A] rounded text-[#8E9299]"
                title={t.uploadProject}
              >
                <Upload className="w-3 h-3" />
              </button>
              <input type="file" id="project-upload" onChange={uploadProject} className="hidden" accept=".zip" />
            </div>
            {projects.length > 0 ? projects.map(p => (
              <div key={p} className="group relative">
                <button 
                  onClick={() => setActiveProject(p)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2 pr-16",
                    activeProject === p ? "bg-[#1A1A1A] text-[#38BDF8]" : "hover:bg-[#151515] text-[#8E9299]"
                  )}
                >
                  <Folder className="w-4 h-4" />
                  <span className="truncate">{p}</span>
                </button>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); downloadProject(); }}
                    className="p-1 hover:bg-[#252525] rounded text-[#8E9299]"
                    title={t.download}
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteProject(p); }}
                    className="p-1 hover:bg-[#252525] rounded text-red-500"
                    title={t.deleteProject}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="px-3 py-2 text-xs text-[#8E9299] italic">{t.noProjects}</div>
            )}
          </div>

          {/* File Explorer */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] uppercase tracking-widest text-[#8E9299]">{t.files}</label>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => { setIsPackagesOpen(true); fetchPackages(); }}
                  className="p-1 hover:bg-[#1A1A1A] rounded text-[#8E9299]"
                  title={t.packages}
                >
                  <Package className="w-3 h-3" />
                </button>
                <button 
                  onClick={downloadProject}
                  className="p-1 hover:bg-[#1A1A1A] rounded text-[#8E9299]"
                  title={t.download}
                >
                  <Download className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 hover:bg-[#1A1A1A] rounded text-[#8E9299]"
                  title={t.uploadFile}
                >
                  <Upload className="w-3 h-3" />
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>
            <div className="px-1">
              {files.length > 0 ? files.map(node => (
                <FileTreeNode 
                  key={node.path} 
                  node={node} 
                  onSelect={openFile} 
                  activeFile={activeFile} 
                  onDelete={deleteFile}
                  language={language}
                />
              )) : (
                <div className="px-2 py-4 text-[10px] text-[#8E9299] text-center border border-dashed border-[#1A1A1A] rounded">
                  {t.noFiles}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#1A1A1A] bg-[#0A0A0A] space-y-1">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-[#1A1A1A] text-sm text-[#8E9299] transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
            {t.settings}
          </button>
          {user && (
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-[#38BDF8]/20 flex items-center justify-center text-[10px] font-bold text-[#38BDF8]">
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
              <span className="text-xs text-[#8E9299] truncate flex-1">{user.email}</span>
              <button onClick={onSignOut} className="text-[10px] text-red-400 hover:underline">
                {t.signOut}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 border-b border-[#1A1A1A] flex items-center justify-between px-4 bg-[#0F0F0F]">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-[#1A1A1A] rounded text-[#8E9299]"
              aria-expanded={isSidebarOpen}
              aria-label={t.filesPanel}
            >
              <Menu className="w-4 h-4 md:hidden" />
              <FolderTree className="w-4 h-4 hidden md:block" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#8E9299]">
              <span className="opacity-50 truncate max-w-[120px]">{activeProject || "No Project"}</span>
              {activeFile && (
                <>
                  <ChevronRight className="w-3 h-3 opacity-30 shrink-0" />
                  <span className="text-[#E4E3E0] truncate max-w-[150px]">{activeFile}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={saveFile}
              className="flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] hover:bg-[#252525] rounded text-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {t.save}
            </button>
            <button 
              onClick={async () => {
                if (activeTab === "editor") {
                  if (projectType !== "static" && !projectRunning) {
                    await startProject();
                    await new Promise(r => setTimeout(r, 2000));
                  }
                  const ok = await buildAndPreview();
                  if (ok !== false) {
                    setActiveTab("preview");
                    setTimeout(() => {
                      const iframe = document.getElementById("preview-frame") as HTMLIFrameElement;
                      if (iframe) iframe.src = iframe.src;
                    }, 500);
                  }
                } else {
                  setActiveTab("editor");
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded text-xs font-bold transition-colors",
                activeTab === "preview" ? "bg-[#38BDF8] text-white" : "bg-[#1A1A1A] text-[#8E9299] hover:bg-[#252525]"
              )}
            >
              <span style={{ display: activeTab === "preview" ? "inline" : "none" }}><CodeIcon className="w-3.5 h-3.5" /></span>
              <span style={{ display: activeTab !== "preview" ? "inline" : "none" }}><Eye className="w-3.5 h-3.5" /></span>
              {activeTab === "preview" ? t.editor : t.preview}
            </button>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="md:hidden flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] hover:bg-[#252525] rounded text-xs transition-colors"
              aria-label={t.aiChat}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#38BDF8]" />
            </button>
          </div>
        </div>

        {/* Editor & Terminal Split */}
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 relative">
              <Tabs.Content value="editor" className="absolute inset-0 outline-none">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  path={activeFile || "no-file-selected.txt"}
                  defaultLanguage="typescript"
                  value={activeFile ? fileContent : "// Select a file to start editing\n// Or ask Sooner to build something!"}
                  onChange={(v) => setFileContent(v || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    backgroundColor: "#0A0A0A",
                    lineNumbers: activeFile ? "on" : "off",
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: !activeFile,
                    padding: { top: 20 }
                  }}
                />
              </Tabs.Content>

              <Tabs.Content value="preview" className="absolute inset-0 bg-white outline-none">
                {activeProject ? (
                  <>
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                      <button 
                        onClick={() => {
                          const iframe = document.getElementById("preview-frame") as HTMLIFrameElement;
                          if (iframe) iframe.src = iframe.src;
                        }}
                        className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors"
                        title={t.refreshPreview}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <iframe 
                      id="preview-frame"
                      src={`/preview/${activeProject}/`}
                      className="w-full h-full border-none"
                      title={t.projectPreview}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0A0A0A] text-[#8E9299]">
                    Select a project to preview
                  </div>
                )}
              </Tabs.Content>
            </div>

            {/* Terminal */}
            <div className="h-32 md:h-48 border-t border-[#1A1A1A] bg-[#0A0A0A] flex flex-col">
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#1A1A1A] bg-[#0F0F0F]">
                <TerminalIcon className="w-3.5 h-3.5 text-[#8E9299]" />
                <span className="text-[10px] uppercase tracking-widest text-[#8E9299] font-bold">Terminal</span>
                {projectType !== "static" && (
                  <div className="ml-auto flex items-center gap-2">
                    {projectRunning && (
                      <span className="flex items-center gap-1 text-[10px] text-green-400">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        {t.serverRunning}
                      </span>
                    )}
                    {!projectRunning ? (
                      <button
                        onClick={startProject}
                        className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-[10px] hover:bg-green-500/20 transition-colors"
                        title={t.runServer}
                      >
                        <Play className="w-3 h-3" /> {t.runServer}
                      </button>
                    ) : (
                      <button
                        onClick={stopProject}
                        className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[10px] hover:bg-red-500/20 transition-colors"
                        title={t.stopServer}
                      >
                        <Square className="w-3 h-3" /> {t.stopServer}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
                {terminalOutput.map((line, i) => (
                  <div key={i} className={cn(
                    line.startsWith(">") ? "text-[#38BDF8]" : 
                    line.startsWith("Error:") ? "text-red-400" : "text-[#8E9299]"
                  )}>
                    {line}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </Tabs.Root>
        </div>
      </div>

      {/* Mobile chat backdrop */}
      {isMobileLayout && isChatOpen && (
        <button
          type="button"
          aria-label={t.closeChat}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsChatOpen(false)}
        />
      )}

      {/* Right Panel: AI Agent */}
      <div className={cn(
        "border-l border-[#1A1A1A] bg-[#0F0F0F] flex flex-col transition-all",
        isMobileLayout
          ? (isChatOpen ? "fixed inset-0 z-50 w-full border-l-0" : "hidden")
          : "w-[400px]"
      )}>
        <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[10px] uppercase tracking-widest font-bold">{t.agentTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isAgentRunning ? "bg-green-500 animate-pulse" : "bg-[#1A1A1A]"
            )} />
            <span className="text-[10px] text-[#8E9299]">{isAgentRunning ? t.active : t.idle}</span>
            {isAgentRunning && (
              <button 
                onClick={stopAgent}
                className="p-1 hover:bg-[#1A1A1A] rounded text-red-500 ml-2"
                title={t.stop}
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            )}
            {isMobileLayout && (
              <button type="button" onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-[#1A1A1A] rounded text-[#8E9299] ml-2 md:hidden">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chat & Steps */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Chat Messages */}
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <React.Fragment key={i}>
                <div className={cn(
                  "p-3 rounded-lg text-sm break-words",
                  msg.role === "user" ? "bg-[#1A1A1A] ml-4" : "bg-[#151515] mr-4 border border-[#1A1A1A]"
                )}>
                  <div className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-1">
                    {msg.role === "user" ? "You" : "Sooner"}
                  </div>
                  <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                </div>
                
                {/* Render Pipeline after the user message if it's the last one and agent is running */}
                {msg.role === "user" && i === messages.length - 1 && isAgentRunning && agentSteps.length > 0 && (
                  <div className="space-y-3 py-2 ml-4">
                    <label className="text-[10px] uppercase tracking-widest text-[#8E9299] flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t.pipeline}
                    </label>
                    <div className="space-y-2 border-l border-[#1A1A1A] pl-4">
                      {agentSteps.map((step) => (
                        <div key={step.id} className="flex items-start gap-3 group">
                          <div className="mt-1">
                            {step.status === "running" ? (
                              <Loader2 className="w-3 h-3 text-[#38BDF8] animate-spin" />
                            ) : step.status === "completed" ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : step.status === "failed" ? (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            ) : (
                              <Circle className="w-3 h-3 text-[#1A1A1A]" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-[11px] font-medium text-[#E4E3E0]">{step.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions for Auto-Preview */}
                {msg.role === "assistant" && i === messages.length - 1 && agentMode === "auto-preview" && !isAgentRunning && (
                  <div className="ml-4 mt-2 space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#8E9299]">{t.suggestions}</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        language === "ja" ? "デザインを洗練させて" : "Refine the design",
                        language === "ja" ? "レスポンシブ対応にして" : "Make it responsive",
                        language === "ja" ? "ダークモードを追加して" : "Add dark mode support"
                      ].map((suggestion, idx) => (
                        <button 
                          key={idx}
                          onClick={() => { handleAgentAction(suggestion); }}
                          className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#252525] border border-[#252525] rounded-full text-[10px] text-[#8E9299] hover:text-white transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#1A1A1A] bg-[#0A0A0A]">
          <div className="flex flex-wrap gap-1 mb-3">
            {[
              { id: "chat", label: t.chat, icon: MessageSquare },
              { id: "plan", label: t.plan, icon: FolderTree },
              { id: "code", label: t.code, icon: CodeIcon },
              { id: "fix", label: t.fix, icon: AlertCircle },
              { id: "auto-preview", label: t.autoPreview, icon: Play },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setAgentMode(mode.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-all border",
                  agentMode === mode.id 
                    ? "bg-[#38BDF8]/10 border-[#38BDF8] text-[#38BDF8]" 
                    : "bg-[#1A1A1A] border-[#252525] text-[#8E9299] hover:border-[#333]"
                )}
              >
                <mode.icon className="w-3 h-3" />
                {mode.label}
              </button>
            ))}
            <button 
              onClick={clearChat}
              className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold text-[#8E9299] hover:text-white transition-colors"
            >
              <History className="w-3 h-3" />
              {t.clear}
            </button>
          </div>
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAgentAction();
                }
              }}
              placeholder={
                agentMode === "chat" ? t.placeholderChat :
                agentMode === "plan" ? t.placeholderPlan :
                agentMode === "code" ? t.placeholderCode :
                agentMode === "fix" ? t.placeholderFix : t.placeholderAuto
              }
              className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-[#38BDF8] transition-colors resize-none h-24"
            />
            <button 
              onClick={() => handleAgentAction()}
              disabled={!input || isAgentRunning}
              className="absolute bottom-3 right-3 p-2 bg-[#38BDF8] text-white rounded-lg hover:bg-[#0EA5E9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-[10px] text-[#8E9299] text-center">
            {agentMode === "auto-preview" ? (language === "ja" ? "Soonerがコードを生成し、自動的にプレビューに切り替えます。" : "Sooner will code and switch to preview automatically.") : (language === "ja" ? "Enterキーで送信" : "Press Enter to send.")}
          </div>
        </div>
      </div>
      {/* Modals */}
      <>
        {isPackagesOpen && (
          <Dialog.Root open={isPackagesOpen} onOpenChange={setIsPackagesOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0A0A0A] border border-[#252525] rounded-2xl p-6 z-50 w-[480px] max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#38BDF8]" /> {t.packages}
                  </h2>
                  <Dialog.Close className="p-1 hover:bg-[#1A1A1A] rounded">
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newPkgName}
                    onChange={(e) => setNewPkgName(e.target.value)}
                    placeholder={t.packageName}
                    className="flex-1 bg-[#1A1A1A] border border-[#252525] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#38BDF8]"
                    onKeyDown={(e) => { if (e.key === "Enter") addPackage(); }}
                  />
                  <input
                    type="text"
                    value={newPkgVersion}
                    onChange={(e) => setNewPkgVersion(e.target.value)}
                    placeholder={t.version}
                    className="w-24 bg-[#1A1A1A] border border-[#252525] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#38BDF8]"
                    onKeyDown={(e) => { if (e.key === "Enter") addPackage(); }}
                  />
                  <button
                    onClick={addPackage}
                    className="px-3 py-2 bg-[#38BDF8] text-white rounded-lg text-sm font-bold hover:bg-[#0EA5E9] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[10px] text-[#555] mb-4">
                  {language === "ja"
                    ? "パッケージは esm.sh CDN 経由でプレビューに自動読み込みされます。npm install は不要です。"
                    : "Packages are auto-loaded via esm.sh CDN in preview. No npm install needed."}
                </p>

                {Object.keys(packages.dependencies).length > 0 && (
                  <div className="mb-4">
                    <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-2 block">{t.dependencies}</label>
                    <div className="space-y-1">
                      {Object.entries(packages.dependencies).map(([name, ver]) => (
                        <div key={name} className="flex items-center justify-between bg-[#1A1A1A] rounded-lg px-3 py-2">
                          <span className="text-sm">{name} <span className="text-[#8E9299]">@{ver}</span></span>
                          <button onClick={() => removePackage(name)} className="text-[#8E9299] hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(packages.devDependencies).length > 0 && (
                  <div className="mb-4">
                    <label className="text-[10px] uppercase tracking-widest text-[#8E9299] mb-2 block">{t.devDependencies}</label>
                    <div className="space-y-1">
                      {Object.entries(packages.devDependencies).map(([name, ver]) => (
                        <div key={name} className="flex items-center justify-between bg-[#1A1A1A] rounded-lg px-3 py-2">
                          <span className="text-sm">{name} <span className="text-[#8E9299]">@{ver}</span></span>
                          <button onClick={() => removePackage(name)} className="text-[#8E9299] hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(packages.dependencies).length === 0 && Object.keys(packages.devDependencies).length === 0 && (
                  <p className="text-center text-[#8E9299] text-sm py-4">{t.noPackages}</p>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}

        {isSettingsOpen && (
          <Dialog.Root open={isSettingsOpen} onOpenChange={(open) => {
            setIsSettingsOpen(open);
            if (open && availableModels.length === 0 && getActiveApiKey()) {
              fetchModels();
            }
          }}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-6 z-50 shadow-2xl">
                <Dialog.Description className="sr-only">{language === "ja" ? "APIキーとGitHub連携の設定" : "Configure your API keys and GitHub integration settings."}</Dialog.Description>
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-bold flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-[#38BDF8]" />
                    {t.settings}
                  </Dialog.Title>
                  <Dialog.Close className="p-1 hover:bg-[#1A1A1A] rounded">
                    <X className="w-5 h-5" />
                  </Dialog.Close>
                </div>
                
                <div className="space-y-5">
                  {/* 1. API Provider */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">{t.apiProvider}</label>
                    <div className="flex gap-2">
                      {(["gemini", "vercel-ai-gateway", "custom"] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setApiProvider(p)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                            apiProvider === p ? "bg-[#38BDF8]/10 border-[#38BDF8] text-[#38BDF8]" : "bg-[#1A1A1A] border-[#252525] text-[#8E9299]"
                          )}
                        >
                          {p === "gemini" ? "Gemini" : p === "vercel-ai-gateway" ? "Vercel AI" : "Custom"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. API Key (per provider) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">
                        {apiProvider === "gemini" ? "Gemini API Key" : apiProvider === "vercel-ai-gateway" ? "Vercel AI Gateway API Key" : "Custom API Key"}
                      </label>
                      <button 
                        onClick={testApiKey}
                        disabled={isTestingKey || !getActiveApiKey()}
                        className="text-[10px] text-[#38BDF8] hover:underline disabled:opacity-50"
                      >
                        {isTestingKey ? t.testing : t.testConnection}
                      </button>
                    </div>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9299]" />
                      {apiProvider === "gemini" && (
                        <input 
                          type="password"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder={process.env.GEMINI_API_KEY ? "Using key from Environment" : "AIza..."}
                          className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#38BDF8]"
                        />
                      )}
                      {apiProvider === "vercel-ai-gateway" && (
                        <input 
                          type="password"
                          value={vercelKey}
                          onChange={(e) => setVercelKey(e.target.value)}
                          placeholder="Enter Vercel AI Gateway API Key"
                          className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#38BDF8]"
                        />
                      )}
                      {apiProvider === "custom" && (
                        <input 
                          type="password"
                          value={customKey}
                          onChange={(e) => setCustomKey(e.target.value)}
                          placeholder="Enter API Key"
                          className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#38BDF8]"
                        />
                      )}
                    </div>
                    {apiProvider !== "gemini" && (
                      <div className="relative mt-2">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                        <input 
                          type="text"
                          value={apiBaseUrl}
                          onChange={(e) => setApiBaseUrl(e.target.value)}
                          placeholder={t.apiBaseUrlPlaceholder}
                          className="w-full bg-[#1A1A1A] border border-[#1A1A1A] rounded-xl py-1.5 pl-10 pr-4 text-xs text-[#555] focus:outline-none focus:border-[#38BDF8]"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Model */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">{t.model}</label>
                      <button
                        onClick={fetchModels}
                        disabled={isFetchingModels || !getActiveApiKey()}
                        className="text-[10px] text-[#38BDF8] hover:underline disabled:opacity-50"
                      >
                        {isFetchingModels ? t.fetchingModels : t.fetchModels}
                      </button>
                    </div>
                    {availableModels.length > 0 ? (
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#38BDF8] text-white"
                      >
                        {availableModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        placeholder="gemini-2.5-flash"
                        className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#38BDF8]"
                      />
                    )}
                    <p className="text-[10px] text-[#555]">
                      {availableModels.length === 0 ? t.noModels : `${availableModels.length} models`}
                    </p>
                  </div>

                  {/* 4. GitHub Integration */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">GitHub</label>
                    {githubToken ? (
                      <div className="flex items-center gap-3 bg-[#1A1A1A] border border-[#252525] rounded-xl py-2.5 px-4">
                        <GitHubIcon className="w-5 h-5 text-white" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-medium">{githubUsername ? `@${githubUsername}` : t.connectedAs}</div>
                          <div className="text-[10px] text-green-400">{t.scopeInfo}</div>
                        </div>
                        <button
                          onClick={() => { setGithubToken(""); setGithubUsername(""); setGithubRepos([]); localStorage.removeItem("github_token"); localStorage.removeItem("github_username"); }}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                        >
                          {t.disconnectGithub}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-[#555]">{t.githubAutoConnect}</p>
                        <div className="relative">
                          <GitHubIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9299]" />
                          <input
                            type="password"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="ghp_..."
                            className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#38BDF8]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">{t.language}</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setLanguage("en")}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-sm font-bold border transition-all",
                          language === "en" ? "bg-[#38BDF8]/10 border-[#38BDF8] text-[#38BDF8]" : "bg-[#1A1A1A] border-[#252525] text-[#8E9299]"
                        )}
                      >
                        English
                      </button>
                      <button 
                        onClick={() => setLanguage("ja")}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-sm font-bold border transition-all",
                          language === "ja" ? "bg-[#38BDF8]/10 border-[#38BDF8] text-[#38BDF8]" : "bg-[#1A1A1A] border-[#252525] text-[#8E9299]"
                        )}
                      >
                        日本語
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-6 py-2 bg-[#38BDF8] text-white rounded-xl font-bold text-sm hover:bg-[#0EA5E9] transition-colors"
                  >
                    {t.saveChanges}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}

        {isCloneOpen && (
          <Dialog.Root open={isCloneOpen} onOpenChange={(open) => { setIsCloneOpen(open); if (open && githubToken && githubRepos.length === 0) fetchGitHubRepos(); }}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-h-[80vh] bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-6 z-50 shadow-2xl flex flex-col">
                <Dialog.Description className="sr-only">{language === "ja" ? "GitHubからリポジトリをクローン、またはURLを入力" : "Clone a repository from GitHub or enter a URL manually."}</Dialog.Description>
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-bold flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-[#38BDF8]" />
                    {t.cloneRepository}
                  </Dialog.Title>
                  <Dialog.Close className="p-1 hover:bg-[#1A1A1A] rounded">
                    <X className="w-5 h-5" />
                  </Dialog.Close>
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setCloneTab("github"); if (githubToken && githubRepos.length === 0) fetchGitHubRepos(); }}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2",
                      cloneTab === "github" ? "bg-[#38BDF8]/10 border-[#38BDF8] text-[#38BDF8]" : "bg-[#1A1A1A] border-[#252525] text-[#8E9299]"
                    )}
                  >
                    <GitHubIcon className="w-4 h-4" />
                    {t.importFromGithub}
                  </button>
                  <button
                    onClick={() => setCloneTab("url")}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2",
                      cloneTab === "url" ? "bg-[#38BDF8]/10 border-[#38BDF8] text-[#38BDF8]" : "bg-[#1A1A1A] border-[#252525] text-[#8E9299]"
                    )}
                  >
                    <Globe className="w-4 h-4" />
                    {t.manualUrl}
                  </button>
                </div>

                {cloneTab === "github" ? (
                  <div className="flex-1 min-h-0 flex flex-col">
                    {!githubToken ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
                        <GitHubIcon className="w-12 h-12 text-[#8E9299]" />
                        <p className="text-sm text-[#8E9299] text-center max-w-xs">{t.connectGithub}</p>
                        <button
                          onClick={async () => {
                            const token = await reconnectGitHub();
                            if (token) fetchGitHubRepos();
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                        >
                          <GitHubIcon className="w-4 h-4" />
                          {t.connectGithubBtn}
                        </button>
                        <p className="text-[10px] text-[#555] text-center max-w-xs">
                          {language === "ja" ? "repo, read:user スコープでGitHubに接続" : "Connects with repo, read:user scopes"}
                        </p>
                      </div>
                    ) : (
                      <>
                        {githubUsername && (
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <GitHubIcon className="w-4 h-4 text-[#8E9299]" />
                            <span className="text-xs text-[#8E9299]">{t.githubConnected} <span className="text-white font-bold">@{githubUsername}</span></span>
                          </div>
                        )}
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                          <input
                            type="text"
                            value={githubRepoSearch}
                            onChange={(e) => setGithubRepoSearch(e.target.value)}
                            placeholder={t.searchRepos}
                            className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#38BDF8]"
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[340px] space-y-1 pr-1">
                          {isLoadingRepos ? (
                            <div className="flex items-center justify-center py-12 gap-2">
                              <Loader2 className="w-5 h-5 text-[#38BDF8] animate-spin" />
                              <span className="text-sm text-[#8E9299]">{t.loadingRepos}</span>
                            </div>
                          ) : (
                            (() => {
                              const filtered = githubRepos.filter(r =>
                                r.name.toLowerCase().includes(githubRepoSearch.toLowerCase()) ||
                                r.full_name.toLowerCase().includes(githubRepoSearch.toLowerCase()) ||
                                (r.description || "").toLowerCase().includes(githubRepoSearch.toLowerCase())
                              );
                              return filtered.length > 0 ? filtered.map(repo => (
                                <div
                                  key={repo.full_name}
                                  className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1A1A1A] transition-colors cursor-pointer border border-transparent hover:border-[#252525]"
                                  onClick={() => handleCloneFromGitHub(repo)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-white truncate">{repo.name}</span>
                                      {repo.private && <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#252525] rounded text-[9px] text-[#8E9299]"><Lock className="w-2.5 h-2.5" />{t.privateRepo}</span>}
                                    </div>
                                    {repo.description && <p className="text-xs text-[#555] truncate mt-0.5">{repo.description}</p>}
                                    <div className="flex items-center gap-3 mt-1">
                                      {repo.language && <span className="text-[10px] text-[#8E9299]">{repo.language}</span>}
                                      {repo.stargazers_count > 0 && <span className="flex items-center gap-0.5 text-[10px] text-[#8E9299]"><Star className="w-2.5 h-2.5" />{repo.stargazers_count}</span>}
                                      <span className="text-[10px] text-[#555]">{new Date(repo.updated_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCloneFromGitHub(repo); }}
                                    className="px-3 py-1.5 bg-[#38BDF8]/10 text-[#38BDF8] rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#38BDF8]/20"
                                  >
                                    {t.cloneRepo}
                                  </button>
                                </div>
                              )) : (
                                <div className="text-center py-8 text-sm text-[#8E9299]">{t.noRepos}</div>
                              );
                            })()
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">Repository URL</label>
                      <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/user/repo"
                        className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-[#38BDF8]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">{t.projectName}</label>
                      <input
                        type="text"
                        value={cloneName}
                        onChange={(e) => setCloneName(e.target.value)}
                        placeholder="my-awesome-project"
                        className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-[#38BDF8]"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleClone}
                        disabled={!repoUrl || !cloneName}
                        className="px-6 py-2 bg-[#38BDF8] text-white rounded-xl font-bold text-sm hover:bg-[#0EA5E9] transition-colors disabled:opacity-50"
                      >
                        {t.cloneRepo}
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}

        {isGitOpen && (
          <Dialog.Root open={isGitOpen} onOpenChange={setIsGitOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,94vw)] max-h-[85vh] bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-6 z-50 shadow-2xl flex flex-col gap-3">
                <Dialog.Description className="sr-only">{t.gitStatusTitle}</Dialog.Description>
                <div className="flex items-center justify-between shrink-0">
                  <Dialog.Title className="text-lg font-bold flex items-center gap-2">
                    <GitMerge className="w-5 h-5 text-[#38BDF8]" />
                    {t.gitPanel}
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => activeProject && BACKEND_URL && void refreshGitPanel()}
                      disabled={gitLoading || !activeProject || !BACKEND_URL}
                      className="p-1.5 hover:bg-[#1A1A1A] rounded text-[#8E9299] disabled:opacity-40"
                      title={t.gitRefresh}
                    >
                      <RefreshCw className={cn("w-4 h-4", gitLoading && "animate-spin")} />
                    </button>
                    <Dialog.Close className="p-1 hover:bg-[#1A1A1A] rounded">
                      <X className="w-5 h-5" />
                    </Dialog.Close>
                  </div>
                </div>

                {!BACKEND_URL && (
                  <p className="text-sm text-amber-400/90">{t.gitNoBackend}</p>
                )}
                {BACKEND_URL && !activeProject && (
                  <p className="text-sm text-[#8E9299]">{t.gitNoProject}</p>
                )}

                {BACKEND_URL && activeProject && (
                  <>
                    {gitError && (
                      <p className="text-sm text-red-400 whitespace-pre-wrap">{gitError}</p>
                    )}
                    {gitStatusData && gitStatusData.isRepo === false && (
                      <p className="text-sm text-[#8E9299]">{gitStatusData.message || t.gitNoRepo}</p>
                    )}
                    {gitStatusData?.isRepo && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-[#8E9299] shrink-0">
                        <div>
                          <span className="text-[#555]">{t.gitBranch}: </span>
                          <span className="text-white font-mono">{gitStatusData.branch}</span>
                        </div>
                        <div>
                          <span className="text-[#555]">{t.gitTracking}: </span>
                          <span className="text-white font-mono truncate">{gitStatusData.tracking || "—"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#555]">{t.gitAheadBehind}: </span>
                          <span className="text-white">
                            {gitStatusData.ahead ?? 0} / {gitStatusData.behind ?? 0}
                          </span>
                        </div>
                        {gitStatusData.files && gitStatusData.files.length > 0 && (
                          <div className="col-span-2 max-h-24 overflow-y-auto rounded-lg border border-[#252525] bg-[#0A0A0A] p-2 font-mono text-[10px]">
                            {gitStatusData.files.map((f) => (
                              <div key={f.path} className="flex gap-2">
                                <span className="text-[#38BDF8] shrink-0">{f.status}</span>
                                <span className="truncate text-[#E4E3E0]">{f.path}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-2 text-xs text-[#8E9299] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gitDiffStaged}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setGitDiffStaged(v);
                            void refreshGitPanel(v);
                          }}
                          className="rounded border-[#252525]"
                        />
                        {t.gitStaged}
                      </label>
                    </div>

                    <div className="flex-1 min-h-[200px] flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-widest text-[#8E9299]">{t.gitDiff}</label>
                      <pre className="flex-1 overflow-auto max-h-[280px] rounded-xl border border-[#252525] bg-[#0A0A0A] p-3 text-[11px] font-mono text-[#CFCFCF] whitespace-pre-wrap">
                        {gitLoading ? "…" : gitDiffText || t.noDiff}
                      </pre>
                    </div>

                    <div className="space-y-2 shrink-0">
                      <input
                        type="text"
                        value={gitCommitMessage}
                        onChange={(e) => setGitCommitMessage(e.target.value)}
                        placeholder={t.gitCommitMsg}
                        className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#38BDF8]"
                      />
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => void handleGitPull()}
                          disabled={gitLoading || !gitStatusData?.isRepo}
                          className="px-4 py-2 bg-[#1A1A1A] border border-[#252525] text-white rounded-xl text-sm font-bold hover:border-[#38BDF8]/50 disabled:opacity-40"
                        >
                          {t.gitPull}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleGitCommit()}
                          disabled={gitLoading || !gitCommitMessage.trim() || !gitStatusData?.isRepo}
                          className="px-4 py-2 bg-[#1A1A1A] border border-[#252525] text-white rounded-xl text-sm font-bold hover:border-[#38BDF8]/50 disabled:opacity-40"
                        >
                          {t.gitCommit}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleGitPush()}
                          disabled={gitLoading || !gitStatusData?.isRepo}
                          className="px-4 py-2 bg-[#38BDF8] text-black rounded-xl text-sm font-bold hover:bg-[#0EA5E9] disabled:opacity-40"
                        >
                          {t.gitPush}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}

        {isNewProjectOpen && (
          <Dialog.Root open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-6 z-50 shadow-2xl">
                <Dialog.Description className="sr-only">{t.newProject}</Dialog.Description>
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-bold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[#38BDF8]" />
                    {t.newProject}
                  </Dialog.Title>
                  <Dialog.Close className="p-1 hover:bg-[#1A1A1A] rounded">
                    <X className="w-5 h-5" />
                  </Dialog.Close>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#8E9299]">{t.projectName}</label>
                    <input 
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="my-new-app"
                      className="w-full bg-[#1A1A1A] border border-[#252525] rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-[#38BDF8]"
                      onKeyDown={(e) => e.key === "Enter" && createProject()}
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={createProject}
                    disabled={!newProjectName}
                    className="px-6 py-2 bg-[#38BDF8] text-white rounded-xl font-bold text-sm hover:bg-[#0EA5E9] transition-colors disabled:opacity-50"
                  >
                    {t.createProject}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}

        {confirmDialog && (
          <Dialog.Root open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog(null)}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-6 shadow-2xl z-[101] outline-none">
                <Dialog.Title className="text-xl font-bold text-white mb-2">{confirmDialog.title}</Dialog.Title>
                <Dialog.Description className="text-[#8E9299] mb-6">{confirmDialog.message}</Dialog.Description>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setConfirmDialog(null)}
                    className="px-4 py-2 text-sm font-medium text-[#8E9299] hover:text-white transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={confirmDialog.onConfirm}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600 transition-colors"
                  >
                    {t.delete}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </>
      <footer className="absolute bottom-0 left-0 right-0 z-20 border-t border-[#1A1A1A] bg-[#0A0A0A]/95 py-1.5 text-center text-[10px] text-[#555] select-none">
        {t.copyrightFooter}
      </footer>
    </div>
    </ErrorBoundary>
  );
}

function FileTreeNode({ node, onSelect, activeFile, level = 0, onDelete, language }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const deleteLabel = language === "ja" ? "削除" : "Delete File";

  if (node.type === "directory") {
    return (
      <div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left px-2 py-1 hover:bg-[#151515] rounded text-sm text-[#8E9299] flex items-center gap-2"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <Folder className="w-4 h-4 text-[#38BDF8]" />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children?.map(child => (
          <FileTreeNode key={child.path} node={child} onSelect={onSelect} activeFile={activeFile} level={level + 1} onDelete={onDelete} language={language} />
        ))}
      </div>
    );
  }

  return (
    <div className="group relative">
      <button 
        onClick={() => onSelect(node.path)}
        className={cn(
          "w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition-colors pr-8",
          activeFile === node.path ? "bg-[#1A1A1A] text-[#38BDF8]" : "hover:bg-[#151515] text-[#8E9299]"
        )}
        style={{ paddingLeft: `${level * 12 + 20}px` }}
      >
        <FileCode className="w-4 h-4" />
        <span className="truncate">{node.name}</span>
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete?.(node.path); }}
        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-[#252525] rounded text-red-500 transition-opacity"
        title={language === "ja" ? "ファイルを削除" : "Delete File"}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
