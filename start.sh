#!/bin/bash
# Taste China — Preview Launcher
# Double-click this file on macOS to start the preview server

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "========================================="
echo "  🥢 Taste China — Preview Server"
echo "========================================="
echo ""

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

echo "🚀 Starting server..."
echo ""
echo "  📱 iPhone Preview: http://localhost:8787/iphone-preview.html"
echo "  🖥️  Full Screen:    http://localhost:8787/"
echo ""
echo "Press Ctrl+C to stop"
echo "========================================="
echo ""

node server/index.mjs
