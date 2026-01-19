# Accent Colors System

## Overview

The app uses two separate color systems:

1. **Store Brand Colors** - Colors sellers choose for their store (rose, blue, green, purple, orange, indigo, black)
2. **Main Site Accent Colors** - Colors for the main ShopIt website theming (indigo, pink, emerald, amber, blue, purple, red, teal)

## Shared Constants Location

All color constants are defined in:
```
libs/shared/constants/src/lib/app.constants.ts
```

Package name: `@shopit/constants`

## Exports

```typescript
import { 
  // Store brand colors (full palette 50-900)
  STORE_BRAND_COLORS,
  
  // Simplified store colors (just 500, 600, 700)
  ACCENT_COLORS,
  
  // Main site accent colors (full palette 50-900)
  MAIN_SITE_ACCENT_COLORS,
  
  // Types
  AccentColorName,           // 'rose' | 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'black'
  MainSiteAccentColorName,   // 'indigo' | 'pink' | 'emerald' | 'amber' | 'blue' | 'purple' | 'red' | 'teal'
  
  // Helper function
  getAccentColorCssVars,     // Generates CSS variable object from color name
} from '@shopit/constants';
```

## Usage Patterns

### On Store Pages (subdomains like `mystore.shopit.ge`)

Store pages use CSS variables set in the layout:

```typescript
// In store layout (apps/web/src/app/store/[subdomain]/[locale]/layout.tsx)
import { getAccentColorCssVars, AccentColorName } from '@shopit/constants';

const accentColors = getAccentColorCssVars(store.accentColor as AccentColorName);
// Returns: { '--store-accent-50': '#...', '--store-accent-500': '#...', etc. }
```

Then use in components:
```css
background-color: var(--store-accent-500);
```

### On Main Site (shopit.ge)

Main site uses `AccentColorProvider` which sets `--accent-*` CSS variables:

```typescript
// Component using main site accent
<button style={{ backgroundColor: 'var(--accent-600)' }}>Click</button>
```

### Direct Color Access

When you need hex values directly (not CSS variables):

```typescript
import { ACCENT_COLORS, AccentColorName } from '@shopit/constants';

const colors = ACCENT_COLORS[brandColor as AccentColorName] || ACCENT_COLORS.indigo;
// colors.500, colors.600, colors.700
```

## Important: Dynamic Tailwind Classes

**DO NOT** use dynamic Tailwind class names like:
```typescript
// ❌ BAD - Tailwind can't parse this
className={`bg-[${colors[600]}]`}
```

**INSTEAD** use inline styles:
```typescript
// ✅ GOOD - Use inline styles for dynamic colors
style={{ backgroundColor: colors[600] }}
```

## Files Using Colors

- `apps/web/src/components/theme/AccentColorProvider.tsx` - Sets main site `--accent-*` variables
- `apps/web/src/app/store/[subdomain]/[locale]/layout.tsx` - Sets store `--store-accent-*` variables
- `apps/web/src/app/[locale]/dashboard/layout.tsx` - Sets dashboard `--accent-*` variables based on store's brand color
- `apps/web/src/components/register/BlurredStorePreview.tsx` - Uses `STORE_BRAND_COLORS` directly
- `apps/web/src/app/[locale]/login/page.tsx` - Uses both (main site vars + store colors if on subdomain)
- `apps/web/src/app/[locale]/register/buyer/page.tsx` - Same as login

## Dashboard Theming

The seller dashboard uses the seller's store brand color as its accent color:

```typescript
// In dashboard layout (apps/web/src/app/[locale]/dashboard/layout.tsx)
const { store } = useAuth();
const brandColor = (store?.brandColor || 'indigo') as AccentColorName;

useEffect(() => {
  const accentColors = getAccentColorCssVars(brandColor, '--accent');
  Object.entries(accentColors).forEach(([varName, value]) => {
    document.documentElement.style.setProperty(varName, value);
  });
}, [brandColor]);
```

**Important:** The `AccentColorProvider` component checks for `/dashboard` in the pathname and **skips** setting its own colors on dashboard pages. This prevents the main site's accent colors from overriding the dashboard's store-specific colors.

This makes the dashboard feel personalized to each seller's brand.

