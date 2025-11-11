#!/bin/bash

# Asset Optimization Script for Prepzy
# This script will optimize all images in the assets folder

echo "🎨 Starting asset optimization..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing via Homebrew..."
    brew install imagemagick
fi

# Create backup
echo "📦 Creating backup of original assets..."
mkdir -p assets_backup
cp -r assets/* assets_backup/

# Optimize PNG files
echo "🖼️  Optimizing PNG images..."

# Optimize icon.png (1024x1024 is standard)
convert assets/icon.png -resize 1024x1024 -quality 85 -strip assets/icon_optimized.png
mv assets/icon_optimized.png assets/icon.png

# Optimize adaptive-icon.png
convert assets/adaptive-icon.png -resize 1024x1024 -quality 85 -strip assets/adaptive-icon_optimized.png
mv assets/adaptive-icon_optimized.png assets/adaptive-icon.png

# Optimize favicon.png
convert assets/favicon.png -resize 192x192 -quality 85 -strip assets/favicon_optimized.png
mv assets/favicon_optimized.png assets/favicon.png

# Optimize splash-icon.png
convert assets/splash-icon.png -resize 2048x2048 -quality 85 -strip assets/splash-icon_optimized.png
mv assets/splash-icon_optimized.png assets/splash-icon.png

# Remove .DS_Store files
find assets -name ".DS_Store" -delete

echo "✅ Asset optimization complete!"
echo ""
echo "📊 New asset sizes:"
ls -lh assets/*.png | awk '{print $5, $9}'
echo ""
echo "💾 Backup saved in assets_backup/"
echo ""
echo "🎉 You should see a significant reduction in build size!"
