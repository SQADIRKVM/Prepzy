#!/bin/bash

# Bundle Size Analyzer for Prepzy

echo "📊 Analyzing your app bundle..."
echo ""

# Check asset sizes
echo "=== ASSET SIZES ==="
echo "Current asset sizes:"
du -sh assets/
ls -lh assets/*.png 2>/dev/null | awk '{print $5 "\t" $9}'
echo ""

# Check if images are optimized
total_image_size=$(find assets -type f -name "*.png" -exec du -ch {} + | grep total$ | awk '{print $1}')
echo "Total image size: $total_image_size"
echo "⚠️  Target: Should be < 1MB total"
echo ""

# List large dependencies
echo "=== TOP 10 LARGEST DEPENDENCIES ==="
npm ls --depth=0 --json 2>/dev/null | jq -r '.dependencies | to_entries[] | .key' | while read dep; do
    size=$(du -sh node_modules/$dep 2>/dev/null | awk '{print $1}')
    echo "$size	$dep"
done | sort -h -r | head -10
echo ""

# Check for duplicate dependencies
echo "=== POTENTIAL DUPLICATE DEPENDENCIES ==="
npm dedupe --dry-run 2>/dev/null
echo ""

# Check total node_modules size
echo "=== NODE_MODULES SIZE ==="
du -sh node_modules/
echo ""

# Recommendations
echo "=== RECOMMENDATIONS ==="
echo ""

# Check if images are too large
if [ $(du -s assets/ | awk '{print $1}') -gt 2000 ]; then
    echo "❌ CRITICAL: Your assets folder is too large!"
    echo "   Run: ./optimize-assets.sh"
    echo ""
fi

# Check for potentially unused packages
echo "🔍 Potentially unused packages:"
echo "   Run: npx depcheck"
echo ""

echo "📝 Full analysis complete!"
echo ""
echo "Next steps:"
echo "1. Optimize images if needed: ./optimize-assets.sh"
echo "2. Remove unused deps: npm uninstall <package>"
echo "3. Build optimized: eas build --platform android --profile production"
