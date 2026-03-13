# Developer Portal & Template Marketplace — Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ShopIt Platform                        │
├──────────────┬──────────────┬─────────────┬──────────────┤
│  Main Site   │ Store Sites  │  Developer  │  Marketplace │
│  shopit.ge   │ *.shopit.ge  │  Portal     │  (new)       │
│              │              │  developers │              │
│              │              │  .shopit.ge │              │
├──────────────┴──────────────┴─────────────┴──────────────┤
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Template   │  │  Web Editor  │  │  Build Pipeline  │  │
│  │ SDK (npm)  │  │  (Monaco +   │  │  (compile →      │  │
│  │            │  │  WebContainers│  │   CDN bundle)    │  │
│  └────────────┘  │  or Sandpack)│  └──────────────────┘  │
│                  └──────────────┘                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Template Runtime (load built-in + external bundles) │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Revenue System (80/20 split, subscriptions, payouts)│ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### 1. How External Templates Get Loaded at Runtime

Current templates are compiled into the monorepo (imported at build time). External
developer templates need a different approach.

**Option A: Client-side Dynamic Loading** (recommended for v1)
- Templates compiled to standalone JS bundles via Rollup/Vite
- Uploaded to S3/CDN after publishing
- Loaded at runtime via `React.lazy()` + dynamic import from CDN URL
- Thin `page.tsx` wrappers already support this perfectly
- SEO metadata still generated server-side (title, description, OG tags from DB)
- Pros: Instant activation, no rebuild, simple
- Cons: No SSR for external template visuals (but SEO metadata is still server-rendered)

**Option B: Build-time Integration**
- When seller activates a template, triggers a Next.js rebuild
- Full SSR + SEO
- Cons: Slow (minutes per activation), expensive compute

**Option C: Module Federation** (future upgrade path)
- Webpack 5 Module Federation loads remote modules at runtime with SSR support
- Next.js support is maturing
- Best long-term option but complex today

**Decision**: Start with Option A. Existing thin wrappers are already perfectly designed
for it. Metadata/SEO is handled server-side; visual rendering being client-side is fine
for e-commerce pages. Migrate to Option C later without changing the page structure.

### 2. Web-Based Editor

**StackBlitz SDK** (preferred):
- Embeds a full VS Code-like IDE with terminal, file explorer, preview
- Uses WebContainers to run Node.js in the browser
- Has a commercial license for paid products
- Best experience but requires their commercial plan

**CodeSandbox Sandpack** (open-source alternative):
- Lighter-weight embeddable editor + preview
- Client-side only (no full Node.js)
- Free and open-source
- Good enough for template editing

**Monaco Editor + Server-side containers** (build it ourselves):
- Monaco for code editing
- Docker containers on the server for compilation/preview
- Most control, most work

**Decision**: Start with StackBlitz SDK. Fall back to Sandpack if StackBlitz's commercial
terms don't work. The editor is the heart of the developer experience.

### 3. Template Configuration UI in Seller Dashboard

Enhanced `TemplateAttributeDefinition` schema:

```typescript
interface TemplateAttributeDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'select'
      | 'image' | 'rich-text' | 'font' | 'spacing';
  label: { en: string; ka: string };
  description?: { en: string; ka: string };
  group?: string;            // "Header", "Colors", "Layout" - for organizing
  default: unknown;
  options?: { value: string; label: { en: string; ka: string } }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  showIf?: {                 // conditional display
    key: string;
    value: unknown;
  };
}
```

A `DynamicTemplateConfigForm` component reads this schema and renders the appropriate
form controls automatically. When a seller selects a template, the dashboard fetches
its attribute schema and renders a settings panel — no custom UI needed per template.

### 4. Template Manifest vs Runtime Definition

Separated concerns:

- **`TemplateDefinition`** (runtime) — stays as-is, focused on React components and
  attribute defaults
- **`TemplateManifest`** (new, `shopit.template.json`) — marketplace metadata: name,
  description, pricing, screenshots, attribute schema with bilingual labels, version
  compatibility
- **`TemplateMarketplaceListing`** (database) — marketplace state: publish status,
  stats, bundle URL, reviews

---

## Database Schema Design

### DeveloperProfile

```
DeveloperProfile {
  userId:              ref User
  displayName:         string
  bio:                 { ka: string, en: string }
  website?:            string
  githubUsername?:      string
  githubAccessToken?:  string (encrypted)
  avatar?:             string
  status:              'pending' | 'approved' | 'suspended'
  earnings: {
    total:             number
    pending:           number
    withdrawn:         number
  }
  bankDetails?: {
    accountName:       string
    iban:              string
    bankName:          string
  }
  templatesCount:      number
  createdAt:           Date
}
```

### TemplateMarketplaceListing

```
TemplateMarketplaceListing {
  templateSlug:        string (unique, URL-friendly)
  developerId:         ref DeveloperProfile
  name:                { ka: string, en: string }
  description:         { ka: string, en: string }
  longDescription:     { ka: string, en: string }  // rich text
  thumbnail:           string
  screenshots:         string[]
  demoStoreUrl?:       string
  version:             string
  pricing: {
    type:              'free' | 'monthly' | 'one_time'
    price:             number (GEL)
  }
  stats: {
    installs:          number
    rating:            number
    reviewCount:       number
    activeSubscriptions: number
  }
  status:              'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended'
  rejectionReason?:    string
  bundleUrl:           string          // S3/CDN URL of compiled template
  githubRepo?:         string          // developer's repo URL
  attributeSchema:     TemplateAttributeDefinition[]
  categories:          string[]        // 'fashion', 'electronics', 'food'
  tags:                string[]
  sdkVersion:          string          // compatibility
  publishedAt?:        Date
  createdAt:           Date
  updatedAt:           Date
}
```

### TemplatePurchase

```
TemplatePurchase {
  sellerId:            ref User
  storeId:             ref Store
  listingId:           ref TemplateMarketplaceListing
  type:                'free' | 'monthly' | 'one_time'
  price:               number
  platformFee:         number          // 20%
  developerShare:      number          // 80%
  status:              'active' | 'cancelled' | 'expired' | 'past_due'
  startDate:           Date
  endDate?:            Date            // for monthly
  nextBillingDate?:    Date
  bogOrderId?:         string
  cancelledAt?:        Date
  createdAt:           Date
}
```

### DeveloperPayout

```
DeveloperPayout {
  developerId:         ref DeveloperProfile
  amount:              number          // gross
  platformFee:         number          // 20%
  netAmount:           number          // 80% (what developer gets)
  status:              'pending' | 'processing' | 'completed' | 'failed'
  periodStart:         Date
  periodEnd:           Date
  breakdown: [{
    purchaseId:        ref TemplatePurchase
    amount:            number
    type:              'monthly' | 'one_time'
  }]
  bogDocumentId?:      string
  createdAt:           Date
}
```

### TemplateReview

```
TemplateReview {
  listingId:           ref TemplateMarketplaceListing
  sellerId:            ref User
  rating:              number (1-5)
  title:               string
  body:                string
  createdAt:           Date
  updatedAt:           Date
}
```

---

## Template SDK Design

External developers install `@shopit/template-sdk`:

```
@shopit/template-sdk
├── types/            # TemplateDefinition, all page props, attribute types
├── hooks/            # useStoreData, useCart, useProducts, useLocale, etc.
├── components/       # Reusable components: ProductCard, CartSummary, PriceDisplay
├── utils/            # getLocalizedText, formatPrice, etc.
├── mock/             # MockStoreProvider, sample data, mock payment flow
└── cli/              # shopit-template init, dev, build, publish
```

### Template project structure convention

```
my-template/
├── package.json
├── shopit.template.json       # Manifest (metadata, attribute schema, pricing)
├── src/
│   ├── index.ts               # Exports TemplateDefinition
│   ├── HomePage.tsx
│   ├── ProductsPage.tsx
│   ├── ProductDetailPage.tsx
│   ├── AboutPage.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Wrapper.tsx
│   ├── components/            # Custom components
│   └── styles/
├── assets/
│   ├── thumbnail.png
│   └── screenshots/
└── tests/
```

---

## Mock Data System

For template preview/testing, developers need realistic data without real stores:

1. **MockStoreProvider** — wraps the entire template and provides fake `StoreData`
2. **MockProductsAPI** — returns sample products with images, prices, variants
3. **MockCartProvider** — simulates cart behavior
4. **MockPaymentFlow** — simulates the BOG payment redirect/callback cycle:
   - Clicking "Pay" shows a simulated payment page
   - "Complete Payment" triggers the success flow
   - "Cancel Payment" triggers the fail flow
5. **Configurable scenarios**: empty store, full inventory, single product, many
   categories, sale items, etc.

---

## Phased Implementation Plan

### Phase 0: Foundation (must be done first)

| # | Task | Details |
|---|------|---------|
| 0.1 | Add DEVELOPER role (32) | Update `roles.ts`, add to bitmask system, update `ALL_ROLES`, add role names in EN/KA |
| 0.2 | Enhance `TemplateAttributeDefinition` | Add bilingual labels, groups, richer types (image, font, rich-text), conditional display, validation |
| 0.3 | Create database schemas | DeveloperProfile, TemplateMarketplaceListing, TemplatePurchase, DeveloperPayout, TemplateReview |
| 0.4 | Add `developers` subdomain to proxy.ts | Route `developers.shopit.ge` to `/developers/[locale]/...` |
| 0.5 | Create Template SDK package | New lib `libs/template-sdk` with types, hooks, utilities, mock providers |
| 0.6 | Create template manifest schema | `shopit.template.json` spec with validation |

### Phase 1: Developer Portal — Registration & Dashboard

| # | Task | Details |
|---|------|---------|
| 1.1 | Developer registration API | `POST /api/v1/developers/apply` — creates DeveloperProfile with status 'pending' |
| 1.2 | Admin approval flow | Admin can approve/reject developer applications (like courier approval) |
| 1.3 | Developer registration pages | `developers.shopit.ge` landing page + application form |
| 1.4 | GitHub OAuth integration | Connect GitHub account, store access token securely |
| 1.5 | Developer dashboard | `/developers/dashboard` — list templates, earnings overview, profile settings |
| 1.6 | Template CRUD API | Create, read, update, delete template listings (developer-only) |

### Phase 2: Template Development Environment

| # | Task | Details |
|---|------|---------|
| 2.1 | Template scaffold generator | CLI command or web UI to create new template from boilerplate |
| 2.2 | GitHub repo creation | Auto-create GitHub repo from scaffold, push to developer's account |
| 2.3 | Web editor integration | Embed StackBlitz/Sandpack editor at `/developers/editor/[templateId]` |
| 2.4 | Mock data provider | `MockStoreProvider`, sample products/categories/store data |
| 2.5 | Mock payment flow | Simulated BOG payment for testing checkout |
| 2.6 | Template preview system | Live preview pane in editor + standalone preview URL |

### Phase 3: Template Build & Publishing Pipeline

| # | Task | Details |
|---|------|---------|
| 3.1 | Template build pipeline | Pull from GitHub, validate structure, compile with Rollup/Vite to standalone bundle |
| 3.2 | Template validation | Check required exports, type compatibility, security scan (no eval, no external fetches to untrusted URLs) |
| 3.3 | Bundle upload to S3 | Upload compiled bundle + assets to S3/CDN |
| 3.4 | Publish submission flow | Developer submits template for review → admin reviews → approve/reject |
| 3.5 | Template runtime loader | Extend registry to dynamically load external bundles via `React.lazy()` |
| 3.6 | Version management | Template versioning, update workflow, backward compatibility checks |

### Phase 4: Template Marketplace

| # | Task | Details |
|---|------|---------|
| 4.1 | Marketplace pages | Browse, search, filter templates at `shopit.ge/marketplace` |
| 4.2 | Template detail page | Screenshots, description, reviews, pricing, "Try Demo" button |
| 4.3 | Template demo stores | Auto-generated demo store for each published template with mock data |
| 4.4 | Search & filtering | By category, price range, rating, free/paid, popularity |
| 4.5 | Reviews & ratings | Sellers can review templates they've purchased |

### Phase 5: Commerce — Purchase & Subscription

| # | Task | Details |
|---|------|---------|
| 5.1 | Template purchase flow | One-time purchase via BOG payment |
| 5.2 | Subscription system | Monthly billing via BOG, cron job for renewals |
| 5.3 | Subscription management | Sellers can cancel/reactivate, grace period before deactivation |
| 5.4 | Platform fee calculation | 20% commission auto-calculated on every purchase |
| 5.5 | Purchase API endpoints | `POST /api/v1/templates/purchase`, `GET /api/v1/templates/my-purchases` |

### Phase 6: Seller Dashboard Integration

| # | Task | Details |
|---|------|---------|
| 6.1 | Template browser in dashboard | Sellers browse available templates from `/dashboard/store/templates` |
| 6.2 | Template activation | Apply purchased template to store, switch between templates |
| 6.3 | Dynamic config form renderer | `DynamicTemplateConfigForm` reads attribute schema, renders appropriate controls |
| 6.4 | Live preview in dashboard | Show how template looks with current store data + changed settings |
| 6.5 | Template config persistence | Save `templateConfig` to store, merge with template defaults |

### Phase 7: Revenue & Payouts

| # | Task | Details |
|---|------|---------|
| 7.1 | Revenue tracking | Track earnings per developer per template |
| 7.2 | Developer earnings dashboard | Earnings breakdown, charts, pending vs withdrawn |
| 7.3 | Payout system | Developer requests withdrawal, admin processes via BOG transfer (reuse existing BOG transfer service) |
| 7.4 | Subscription renewal cron | Scheduled job to process monthly renewals |
| 7.5 | Failed payment handling | Retry logic, grace period, notification to seller/developer |

---

## Files That Need Changes in Existing Code

| File | Change |
|------|--------|
| `libs/shared/constants/src/lib/roles.ts` | Add `DEVELOPER: 32`, update `ALL_ROLES` to 63, add role names |
| `apps/web/src/store-templates/types/template.types.ts` | Enhance `TemplateAttributeDefinition` with bilingual labels, groups, richer types |
| `apps/web/src/store-templates/registry.ts` | Add `registerRemoteTemplate()` for loading from CDN URL |
| `apps/web/src/proxy.ts` | Add `developers` subdomain handling |
| `libs/api/database/src/lib/schemas/` | Add 5 new schemas |
| `libs/shared/types/src/lib/` | Add developer, marketplace, purchase types |
| Cookie config (`apps/api/src/config/cookie.config.ts`) | Already supports cross-subdomain (`.shopit.ge`) — auth on `developers.shopit.ge` works out of the box |

---

## Future Ideas & Suggestions

1. **Template Categories**: Fashion, Electronics, Food & Beverage, Services, Handmade,
   General — helps sellers find relevant templates

2. **Template Demo Mode**: Each published template gets an auto-generated demo store
   (e.g., `demo-elegant-boutique.shopit.ge`) with mock data so sellers can browse the
   full experience before purchasing

3. **Template Analytics for Developers**: Show developers how many views, installs,
   conversion rate their templates get

4. **Template Update Notifications**: When a developer publishes a new version, notify
   all sellers using that template and let them preview the update before applying

5. **Affiliate Program**: Developers can share referral links, earning extra commission
   when new sellers join ShopIt through their template pages

6. **Template Bundles**: Developers can bundle multiple templates at a discount

7. **Template Inheritance**: Developers can create "child templates" that extend the
   default template, only overriding specific pages

8. **Template A/B Testing**: Sellers can run two templates simultaneously and see which
   converts better

9. **Security**: Run static analysis on template code before publishing (no `eval`, no
   external script loading, no cookie access beyond the store's scope). Consider CSP
   headers per template.

10. **Subscription Tiers**: Beyond per-template pricing, consider a "ShopIt Pro"
    subscription that gives access to all templates (like Envato Elements)
