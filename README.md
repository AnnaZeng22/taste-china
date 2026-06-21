# 🥢 Taste China — Preview Package

AI-powered Chinese cuisine discovery app — rooted in Nanjing. Menu OCR translation, foodie community, AI food assistant — all in one package.

---

## Prerequisites

**Node.js 18 or later** is required. You only need to install it once.

### Install Node.js

1. Go to **[nodejs.org](https://nodejs.org)**
2. Download the **LTS** version (recommended for most users)
3. Run the installer — keep all default options, just click Next/Continue

> **macOS note:** if you see a security warning, go to **System Settings → Privacy & Security** and click "Allow".
>
> **Windows note:** the installer will ask about "Tools for Native Modules" — check the box and click Next (it downloads a few extra tools, takes about 3 minutes).

### Verify installation

Open a terminal (or Command Prompt on Windows) and run:

```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

---

## Quick Start

### 🍎 macOS

**Double-click `start.sh`** — Finder will open a terminal and launch the server.

Or in terminal:

```bash
cd ~/Desktop/taste-china
./start.sh
```

> If you see "permission denied", run `chmod +x start.sh` once first.

### 🖥️ Windows

**Double-click `start.bat`** — a command prompt window will open and launch the server.

Or in Command Prompt / PowerShell:

```cmd
cd /d %USERPROFILE%\Desktop\taste-china
start.bat
```

> If Windows Defender shows a warning, click "More info" → "Run anyway".

### Manual Start (both platforms)

```bash
cd taste-china
npm install    # first time only, installs dependencies (~2 MB)
npm start      # launches the server on port 8787
```

---

## Preview URLs

Open these in your browser once the server is running:

| View | URL |
|------|-----|
| 📱 iPhone 15 Pro | http://localhost:8787/iphone-preview.html |
| 🖥️ Full Screen | http://localhost:8787/ |

---

## Configuration

1. Copy the example config:  `.env.example` → `.env.local`
2. Get a **free API key** at [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
3. Open `.env.local` in a text editor and paste your key:

```
DEEPSEEK_API_KEY="sk-your-key-here"
```

> The file `.env.local` is ignored by git — your key stays on your machine.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **"port 8787 already in use"** | Another app is using port 8787. Edit `server/index.mjs` and change the `8787` on the last line, or stop the other app. |
| **"npm: command not found"** | Node.js is not installed or not in PATH. Reinstall from [nodejs.org](https://nodejs.org). |
| **API features not working** | Make sure `.env.local` exists and contains a valid DeepSeek API key. |
| **Blank page in browser** | Wait a few seconds for the server to fully start, then try again. Check the terminal for any error messages. |
| **"Cannot find module" error** | Run `npm install` again — dependencies may be incomplete. |

---

## Features

- 🍜 **Menu Translation** — Point your camera at any Chinese menu, get instant English translations powered by OCR + AI
- 🏮 **Foodie Community** — Xiaohongshu-style posts, share your food discoveries
- 🤖 **AI Food Assistant** — Ask about dishes via text, voice, or image
- 📱 **iPhone 15 Pro Frame** — Beautiful mobile preview with onboarding flow
- 🎬 **Video Posts** — Watch clips from chefs and foodies
- 🕌 **Dietary Guidance** — Halal, Vegan, GF labels on every dish
- 📍 **Local Recommendations** — Curated restaurant picks in Nanjing

---

## Structure

```
taste-china/
├── dist/              Built frontend (Vite + OCR + ONNX runtime)
├── server/            Express API server (DeepSeek proxy + SQLite)
├── data/              Runtime data — auto-created on first launch
│   ├── *.sqlite       Translation cache database
│   └── uploads/       User-uploaded images
├── .env.example       API key template (safe to share)
├── .env.local         Your API key (ignored by git, never shared)
├── package.json       Server dependencies
├── start.sh           macOS launcher — double-click to run
├── start.bat          Windows launcher — double-click to run
└── README.md          This file
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + vanilla JS (SPA) |
| OCR | Tesseract.js + PaddleOCR (ONNX) |
| AI | DeepSeek API (proxied through Express) |
| Backend | Express.js |
| Database | SQLite (via sql.js, no native binaries) |
| ML Runtime | ONNX Runtime Web |
