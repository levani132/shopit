# Progressive Web App (PWA) Implementation

## Overview

ShopIt supports multi-tenant PWA installations where each store subdomain can be installed as a **separate, standalone app** with:

- Store-branded icons
- Custom theme colors
- Offline support
- Home screen installation

## Architecture

### Multi-Tenant PWA Strategy

```
shopit.ge (main site)     → Blue-branded PWA
tenant1.shopit.ge         → Store's brand color PWA
tenant2.shopit.ge         → Different brand color PWA
```

Each subdomain generates its own:

- `manifest.json` with store name and icons
- Theme color based on store's `brandColor`
- Icon set from 7 available color palettes

## Key Files

| File                                                     | Purpose                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/web/src/lib/tenant-config.ts`                      | Tenant configuration: color mapping, icon paths, CSS variables |
| `apps/web/src/app/store/[subdomain]/manifest.ts`         | Dynamic PWA manifest per store                                 |
| `apps/web/src/app/store/[subdomain]/[locale]/layout.tsx` | Store layout with PWA metadata                                 |
| `apps/web/src/app/[locale]/layout.tsx`                   | Main site layout with PWA metadata                             |
| `apps/web/src/sw.ts`                                     | Service worker (Serwist)                                       |
| `apps/web/src/app/offline/page.tsx`                      | Offline fallback page                                          |
| `apps/web/public/manifest.json`                          | Main site static manifest                                      |
| `apps/web/next.config.js`                                | Serwist plugin configuration                                   |

## Icon System

### Available Colors

Icons exist at `/public/icons/<color>/` for these colors:

- `blue` (default for main site)
- `rose`
- `green`
- `purple`
- `orange`
- `indigo`
- `black`

### Icon Directories

```
/public/icons/<color>/
├── pwa/         # PWA icons (48-512px)
├── favicon/     # Favicon variants (16-64px + .ico)
├── ios/         # iOS app icons
├── android/     # Android icons
├── mac/         # macOS icons
└── windows/     # Windows tiles
```

### Color Mapping

Stores can have any brand color, but icons only exist for 7 colors. [`mapToAccentColor()`](../apps/web/src/lib/tenant-config.ts) maps to the closest available:

```typescript
const colorMap = {
  red: 'rose',
  pink: 'rose',
  violet: 'purple',
  cyan: 'blue',
  teal: 'green',
  lime: 'green',
  yellow: 'orange',
  amber: 'orange',
  gray: 'black',
  // etc.
};
```

## Tenant Configuration

### Building Config

```typescript
import {
  buildTenantConfig,
  getTenantIconPaths,
  mapToAccentColor,
} from '@/lib/tenant-config';

// Build config from store data
const config = buildTenantConfig(subdomain, store.name, store.brandColor);

// Get icon paths
const colorName = mapToAccentColor(store.brandColor);
const icons = getTenantIconPaths(colorName);

// CSS variables for theming
const cssVars = getTenantCssVariables(config);
```

### TenantConfig Interface

```typescript
interface TenantConfig {
  slug: string;                    // Subdomain
  displayName: string;             // Store name (max 12 chars for short_name)
  accentColorName: AccentColorName;
  colors: {
    500: string;
    600: string;  // Used for theme-color
    700: string;
  };
  fullColors: Record<50|100|...|900, string>;
}
```

## Dynamic Manifest

Store subdomains have a dynamic manifest at `/store/[subdomain]/manifest.ts`:

```typescript
export default async function manifest({ params }): Promise<MetadataRoute.Manifest> {
  const { subdomain } = await params;
  const store = await getStoreBySubdomain(subdomain);
  const config = buildTenantConfig(subdomain, store?.name, store?.brandColor);

  return {
    name: `${config.displayName} • ShopIt`,
    short_name: config.displayName,
    theme_color: config.colors[600],
    icons: [...], // Brand-colored icons
  };
}
```

## PWA Metadata in Layouts

### Store Subdomains

`generateMetadata()` and `generateViewport()` provide:

```typescript
// Icons
icons: {
  icon: [
    { url: iconPaths.favicon.ico, sizes: 'any' },
    { url: iconPaths.favicon['32x32'], sizes: '32x32' },
    { url: iconPaths.favicon['16x16'], sizes: '16x16' },
  ],
  apple: [{ url: iconPaths.ios['1024x1024'], sizes: '1024x1024' }],
}

// Theme color with dark mode support
themeColor: [
  { media: '(prefers-color-scheme: light)', color: tenantConfig.colors[600] },
  { media: '(prefers-color-scheme: dark)', color: '#18181b' },
]
```

### CSS Variables Injection

Store layouts inject tenant-specific CSS variables:

```tsx
const cssVariables = getTenantCssVariables(tenantConfig);
// Returns: '--store-accent-500': '#3b82f6', ...

<style dangerouslySetInnerHTML={{ __html: `:root { ${cssVarsString} }` }} />;
```

## Service Worker (Serwist)

### Why Serwist?

Serwist is the maintained fork of next-pwa with:

- Full App Router support
- TypeScript-first design
- Modern Workbox integration

### Configuration

`next.config.js`:

```javascript
const withSerwist = require('@serwist/next').default;

const plugins = [
  withNx,
  withNextIntl,
  (config) =>
    withSerwist({
      swSrc: 'src/sw.ts',
      swDest: 'public/sw.js',
      disable: process.env.NODE_ENV === 'development',
    })(config),
];
```

### Service Worker

`src/sw.ts`:

```typescript
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.mode === 'navigate';
        },
      },
    ],
  },
});

serwist.addEventListeners();
```

### Caching Strategy

- **Static assets**: Cache-first with long TTL
- **API requests**: Network-first with fallback
- **Pages**: Stale-while-revalidate
- **Offline**: Falls back to `/offline` page

## Testing PWA

### Chrome DevTools Checklist

**Application Tab → Manifest:**

- [ ] Name shows store name
- [ ] Short name populated
- [ ] Start URL correct
- [ ] Display is `standalone`
- [ ] Theme color matches brand
- [ ] All icon sizes present

**Application Tab → Service Workers:**

- [ ] SW registered and activated (production only)
- [ ] No registration errors

**Lighthouse PWA Audit:**

- [ ] Installable
- [ ] PWA Optimized
- [ ] Works offline

### Install Test

1. Visit store subdomain in production build
2. Click install button in address bar
3. Verify:
   - App opens in standalone window
   - Correct icon in dock/home screen
   - Name matches store name

### Offline Test

1. Install PWA
2. DevTools → Network → Offline
3. Navigate within app
4. Verify offline fallback shows

## Troubleshooting

### Icons Not Showing

1. Check color mapping: `mapToAccentColor(store.brandColor)`
2. Verify icons exist at `/public/icons/<color>/`
3. Hard refresh (Cmd+Shift+R)

### Manifest Not Loading

1. Check route: `/store/[subdomain]/manifest.ts`
2. Verify store exists in database
3. Check console for fetch errors

### Service Worker Issues

1. SW only works in production builds
2. Clear site data and refresh
3. Check DevTools → Application → Service Workers

## Adding New Icon Colors

1. Generate icons using your icon generation tool
2. Place in `/public/icons/<newcolor>/`
3. Add to `ACCENT_COLORS` in `@shopit/constants`
4. Update `mapToAccentColor()` color mappings
