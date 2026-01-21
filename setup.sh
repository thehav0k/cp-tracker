#!/bin/bash

# CP Progress Tracker - Setup Script
# This script helps you get started with the extension

echo "🚀 CP Progress Tracker - Setup Script"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found!"
    echo "Please run this script from the extension root directory."
    exit 1
fi

echo "✅ Found manifest.json"
echo ""

# Display extension info
echo "📦 Extension Information:"
echo "------------------------"
NAME=$(grep -o '"name": "[^"]*' manifest.json | cut -d'"' -f4)
VERSION=$(grep -o '"version": "[^"]*' manifest.json | cut -d'"' -f4)
echo "Name: $NAME"
echo "Version: $VERSION"
echo ""

# Check for required files
echo "🔍 Checking required files..."
REQUIRED_FILES=(
    "manifest.json"
    "popup/popup.html"
    "popup/popup.css"
    "popup/popup.js"
    "options/options.html"
    "options/options.css"
    "options/options.js"
    "background/background.js"
    "utils/storage.js"
    "utils/api.js"
    "utils/analytics.js"
)

MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (MISSING)"
        MISSING=$((MISSING + 1))
    fi
done

echo ""

if [ $MISSING -gt 0 ]; then
    echo "⚠️  Warning: $MISSING required file(s) missing!"
    echo ""
fi

# Check for icons
echo "🎨 Checking icons..."
if [ ! -d "icons" ]; then
    echo "  ⚠️  Icons directory not found"
    echo "  Creating icons directory..."
    mkdir -p icons
fi

# Note about icons
echo ""
echo "📝 Note: Icons need to be converted from SVG to PNG"
echo "   See icons/ICON_GUIDE.md for instructions"
echo ""

# Display next steps
echo "📋 Next Steps:"
echo "-------------"
echo "1. Load Extension in Chrome:"
echo "   - Open chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select this folder: $(pwd)"
echo ""
echo "2. Configure Extension:"
echo "   - Click the extension icon"
echo "   - Click 'Configure Usernames'"
echo "   - Enter your platform usernames"
echo "   - Save settings"
echo ""
echo "3. Sync Your Data:"
echo "   - Click the sync button (🔄)"
echo "   - Wait for data to load"
echo "   - Explore your stats!"
echo ""

# Optional: Open Chrome extensions page
echo "🌐 Would you like to open Chrome extensions page? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    # Try to open Chrome extensions page
    if command -v open &> /dev/null; then
        open "chrome://extensions/" 2>/dev/null || echo "Please open chrome://extensions/ manually"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "chrome://extensions/" 2>/dev/null || echo "Please open chrome://extensions/ manually"
    else
        echo "Please open chrome://extensions/ manually"
    fi
fi

echo ""
echo "✨ Setup complete! Happy coding! 🚀"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Project overview"
echo "   - GETTING_STARTED.md - User guide"
echo "   - DEVELOPMENT.md - Developer guide"
echo "   - PROJECT_SUMMARY.md - Complete feature list"
