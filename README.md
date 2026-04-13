<div align="center">

<img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" width="1200" height="475" alt="Sooner" />

# Sooner

**AI-powered autonomous coding platform — build sooner, ship faster.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Firebase Hosting](https://img.shields.io/badge/Hosted%20on-Firebase-orange)](https://sooner.sh)

[Launch app](https://sooner.sh) · [Landing Page](https://site.sooner.sh) · [Sign Up](https://signup.sooner.sh)

</div>

---

## What is Sooner?

Sooner is a browser-based workspace powered by AI. Build, preview, and deploy from your browser with an integrated coding agent, real-time preview, multi-file projects, and cloud storage via Firebase.

## Features

- **Monaco Editor** — VS Code-grade editing with syntax highlighting, IntelliSense, and multi-cursor support
- **AI Agent** — Gemini-powered autonomous coding assistant (chat, plan, code, fix modes)
- **Live Preview** — Instant in-browser preview of your projects
- **Multi-language** — HTML, CSS, JavaScript, TypeScript, React, Python, Dart, and more
- **Cloud Sync** — Projects are saved to Firebase Storage per user
- **Export** — Download projects as ZIP or deploy directly
- **Auth** — Email/password, Google, and GitHub sign-in via Firebase Auth

## Subdomains

| Domain | Purpose |
|---|---|
| [site.sooner.sh](https://site.sooner.sh) | Landing page |
| [sooner.sh](https://sooner.sh) | Main application |
| [signup.sooner.sh](https://signup.sooner.sh) | Account registration |
| [signin.sooner.sh](https://signin.sooner.sh) | Login |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Gemini API key](https://ai.google.dev/)
- (Optional) Firebase project for auth and cloud storage

### Installation

```bash
git clone https://github.com/thp-hoikujouhou-jpg/Sooner.git
cd Sooner
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

### Run Locally

```bash
npm run dev
```

The dev server starts at `http://localhost:5173` (see `vite.config.ts`).

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## Tech Stack

- **Frontend** — React 19, TypeScript, Tailwind CSS v4, Motion
- **Editor** — Monaco Editor
- **AI** — Google Gemini (via @google/genai)
- **Auth & Storage** — Firebase Auth, Firebase Storage
- **UI Components** — Radix UI, Lucide Icons
- **Build** — Vite
- **Backend** — Express (dev server with Gemini API proxy)

## Acknowledgments

- [Monaco Editor](https://github.com/microsoft/monaco-editor) by Microsoft — the code editor that powers VS Code, used as the core editor in Sooner.
- [Google Gemini](https://ai.google.dev/) — AI model powering the coding assistant.
- [Firebase](https://firebase.google.com/) — authentication and cloud storage.

## License

This project is licensed under the [MIT License](LICENSE).
