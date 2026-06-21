# 🥢 Taste China — Preview Package

## Quick Start

### macOS — Double-click `start.sh`

Or in terminal:

```bash
cd ~/Desktop/taste-nanjing-preview
./start.sh
```

### Manual Start

```bash
cd ~/Desktop/taste-nanjing-preview
npm install    # first time only
npm start
```

## Preview URLs

| View | URL |
|------|-----|
| 📱 iPhone 15 Pro | http://localhost:8787/iphone-preview.html |
| 🖥️ Full Screen | http://localhost:8787/ |
| 📱 iPhone (with onboarding) | http://localhost:8787/iphone-preview.html |

## Configuration

Edit `.env.local` to set your API key:

```
DEEPSEEK_API_KEY="sk-your-key-here"
```

Get a key at: https://platform.deepseek.com/api_keys

## Features

- 🍜 AI-powered menu translation (OCR + DeepSeek)
- 🏮 Foodie Community (Xiaohongshu-style posts)
- 🤖 AI Food Assistant (text, voice, image input)
- 📱 iPhone 15 Pro preview frame
- 🎬 Video posts from chefs & foodies
- 🕌 Halal, Vegan, GF dietary guidance
- 📍 Nanjing restaurant recommendations

## Structure

```
taste-nanjing-preview/
├── dist/           Built frontend (Vite)
├── server/         Express API server
├── data/           SQLite database + uploads
├── .env.local      API key configuration
├── package.json    Server dependencies
├── start.sh        Launch script
└── README.md       This file
```
