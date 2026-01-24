#!/bin/bash
# Find all raw fetch() calls in client components that likely need migration to api client

echo "🔍 Finding raw fetch() calls in apps/web/src..."
echo ""
echo "Files with fetch() calls (excluding api.ts and public helpers):"
echo "================================================================"

grep -r "await fetch\(" apps/web/src \
  --include="*.tsx" \
  --include="*.ts" \
  --exclude-dir=node_modules \
  | grep -v "apps/web/src/lib/api.ts" \
  | grep -v "apps/web/src/proxy.ts" \
  | cut -d: -f1 \
  | sort -u \
  | while read file; do
    count=$(grep -c "await fetch\(" "$file")
    echo "  📄 $file ($count calls)"
  done

echo ""
echo "Total files: $(grep -r "await fetch\(" apps/web/src --include="*.tsx" --include="*.ts" --exclude-dir=node_modules | grep -v "apps/web/src/lib/api.ts" | grep -v "apps/web/src/proxy.ts" | cut -d: -f1 | sort -u | wc -l)"
