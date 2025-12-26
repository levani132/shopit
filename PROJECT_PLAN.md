# ShopIt - Multi-Vendor E-Commerce Platform

## 🎯 Project Vision

A platform where users can create their own online stores with custom subdomains, enabling anyone to sell products with minimal setup while having a professional-looking storefront.

---

## 📋 Project Phases & Tasks

### Phase 1: Foundation & Infrastructure (Week 1-2)

#### 1.1 Project Setup ✅

- [x] Initialize NX monorepo workspace
- [x] Set up Next.js frontend application
- [x] Set up NestJS backend application
- [x] Configure shared libraries structure
- [x] Set up TypeScript configurations
- [x] Configure ESLint & Prettier
- [ ] Set up Git hooks (Husky + lint-staged)
- [ ] Configure CI/CD pipeline (GitHub Actions)

#### 1.2 Database Design ✅

- [x] Design MongoDB schema
- [x] Set up Mongoose ODM with NestJS
- [x] Create schemas for core entities:
  - Users (platform admins & store owners)
  - Stores (subdomain, settings, theme)
  - Products (with images, pricing, stock)
  - Categories & Subcategories
  - Posts (social media-like content)
  - Comments & Likes
  - Store Info Pages
  - Refresh Tokens

#### 1.3 Authentication & Authorization

- [ ] Implement JWT-based authentication
- [ ] Set up refresh token rotation
- [ ] Role-based access control (RBAC)
- [ ] OAuth integration (Google, GitHub - optional)

---

### Phase 2: Core Store Management (Week 3-4)

#### 2.1 Store Creation & Configuration

- [ ] Store registration flow
- [ ] Subdomain validation & assignment
- [ ] Store settings management:
  - [ ] Cover photo upload & cropping
  - [ ] Profile photo upload & cropping
  - [ ] Accent color picker
  - [ ] Store name & description
  - [ ] Contact information

#### 2.2 Category Management

- [ ] CRUD for categories
- [ ] CRUD for subcategories
- [ ] Category ordering/sorting
- [ ] Category icons/images

#### 2.3 Product Management

- [ ] CRUD for products
- [ ] Product images (multiple, with primary)
- [ ] Product variants (size, color, etc.)
- [ ] Pricing & sale pricing
- [ ] Stock management
- [ ] Product search & filtering

---

### Phase 3: Store Frontend (Week 5-6)

#### 3.1 Store Pages - Products

- [ ] Product listing page with grid/list views
- [ ] Category filtering sidebar
- [ ] Product search functionality
- [ ] Product detail page
- [ ] Sale badges & pricing display
- [ ] Add to cart functionality (future)

#### 3.2 Store Pages - Posts (Social Feed)

- [ ] Post creation with images
- [ ] Post feed display
- [ ] Like functionality
- [ ] Comment system
- [ ] Share functionality
- [ ] Infinite scroll pagination

#### 3.3 Store Pages - Info

- [ ] About/Info page editor (Rich text)
- [ ] Contact information display
- [ ] Store policies (returns, shipping)
- [ ] FAQ section

#### 3.4 Store Theming

- [ ] Dynamic theme generation from accent color
- [ ] Cover photo display
- [ ] Profile photo display
- [ ] Responsive design
- [ ] Mobile-first approach

---

### Phase 4: Subdomain & Routing (Week 7)

#### 4.1 Subdomain Handling

- [ ] Subdomain detection middleware
- [ ] Dynamic routing based on subdomain
- [ ] Store data fetching by subdomain
- [ ] SEO optimization per store
- [ ] Custom 404 for non-existent stores

#### 4.2 Deep Linking (for future app)

- [ ] Universal links setup
- [ ] App detection & redirect
- [ ] Fallback to web

---

### Phase 5: Media & Storage (Week 8)

#### 5.1 Image Management

- [ ] Image upload service
- [ ] Image optimization & resizing
- [ ] CDN integration (Cloudflare/AWS)
- [ ] Image compression
- [ ] WebP/AVIF support

#### 5.2 Storage Infrastructure

- [ ] S3-compatible storage setup
- [ ] Signed URLs for private content
- [ ] Storage quotas per store

---

### Phase 6: Admin Dashboard (Week 9-10)

#### 6.1 Store Owner Dashboard

- [ ] Dashboard overview (stats, recent activity)
- [ ] Product management interface
- [ ] Category management interface
- [ ] Post management interface
- [ ] Store settings
- [ ] Analytics (views, engagement)

#### 6.2 Platform Admin Dashboard

- [ ] Store moderation
- [ ] User management
- [ ] Platform analytics
- [ ] Content moderation

---

### Phase 7: Advanced Features (Week 11-12)

#### 7.1 Search & Discovery

- [ ] Full-text search (Elasticsearch/Meilisearch)
- [ ] Store discovery page
- [ ] Trending products
- [ ] Featured stores

#### 7.2 Notifications

- [ ] Email notifications
- [ ] Push notifications (web)
- [ ] In-app notifications

#### 7.3 Performance & Optimization

- [ ] Redis caching (optional enhancement)
- [ ] Database query optimization
- [ ] Image lazy loading
- [ ] SSR/SSG optimization

---

## 🏗️ Technical Architecture

### Folder Structure

```
sellit/
├── apps/
│   ├── web/                    # Next.js frontend (customer-facing)
│   ├── dashboard/              # Next.js admin dashboard (future)
│   └── api/                    # NestJS backend API
│
├── libs/
│   ├── shared/
│   │   ├── types/              # TypeScript types/interfaces
│   │   ├── utils/              # Utility functions
│   │   ├── constants/          # Shared constants
│   │   └── validators/         # Zod/class-validator schemas
│   │
│   ├── api/
│   │   ├── database/           # Mongoose schemas & database module
│   │   └── common/             # Common NestJS decorators, guards
│   │
│   └── ui/
│       ├── components/         # Shared React components
│       └── hooks/              # Custom React hooks
│
├── tools/                      # Custom build tools & scripts
├── nx.json
├── package.json
└── tsconfig.base.json
```

### Technology Stack

#### Frontend (Next.js 15+)

- **Framework**: Next.js with App Router
- **Styling**: Tailwind CSS + CSS Variables for theming
- **State Management**: Zustand / TanStack Query
- **Forms**: React Hook Form + Zod
- **UI Components**: Radix UI / shadcn/ui

#### Backend (NestJS)

- **Framework**: NestJS
- **Database**: MongoDB 7+
- **ODM**: Mongoose
- **Validation**: class-validator + class-transformer
- **API Documentation**: Swagger/OpenAPI
- **Authentication**: Passport.js + JWT

#### Infrastructure

- **Monorepo**: Nx
- **Package Manager**: npm
- **Testing**: Jest + Testing Library + Playwright
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

---

## 📊 Database Schema (Core Entities)

> **Note**: We use MongoDB with Mongoose ODM. Schemas are defined in `libs/api/database/src/lib/schemas/`.

### Users

```typescript
// user.schema.ts
@Schema({ timestamps: true, collection: 'users' })
class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: UserRole, default: UserRole.STORE_OWNER })
  role: UserRole;
}

enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  STORE_OWNER = 'STORE_OWNER',
}
```

### Stores

```typescript
// store.schema.ts
@Schema({ timestamps: true, collection: 'stores' })
class Store {
  @Prop({ required: true, unique: true, lowercase: true })
  subdomain: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  coverImage?: string;

  @Prop()
  profileImage?: string;

  @Prop({ default: '#6366f1' })
  accentColor: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;
}
```

### Products

```typescript
// product.schema.ts
@Schema({ timestamps: true, collection: 'products' })
class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0 })
  salePrice?: number;

  @Prop({ default: false })
  isOnSale: boolean;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: 0, min: 0 })
  stock: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subcategory' })
  subcategoryId?: Types.ObjectId;
}
```

### Categories & Subcategories

```typescript
// category.schema.ts
@Schema({ timestamps: true, collection: 'categories' })
class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, lowercase: true })
  slug: string;

  @Prop()
  image?: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId: Types.ObjectId;
}
// Compound unique index: { storeId: 1, slug: 1 }

// subcategory.schema.ts
@Schema({ timestamps: true, collection: 'subcategories' })
class Subcategory {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, lowercase: true })
  slug: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;
}
// Compound unique index: { categoryId: 1, slug: 1 }
```

### Posts (Social Feed)

```typescript
// post.schema.ts
@Schema({ timestamps: true, collection: 'posts' })
class Post {
  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId: Types.ObjectId;

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  commentsCount: number;
}

// post-like.schema.ts
@Schema({ timestamps: true, collection: 'post_likes' })
class PostLike {
  @Prop({ required: true })
  visitorId: string; // Anonymous or user-based

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;
}
// Compound unique index: { postId: 1, visitorId: 1 }

// post-comment.schema.ts
@Schema({ timestamps: true, collection: 'post_comments' })
class PostComment {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  authorName: string;

  @Prop()
  authorEmail?: string;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;
}
```

### Info Page

```typescript
// info-page.schema.ts
@Schema({ timestamps: true, collection: 'info_pages' })
class InfoPage {
  @Prop()
  aboutContent?: string;

  @Prop()
  contactEmail?: string;

  @Prop()
  contactPhone?: string;

  @Prop()
  address?: string;

  @Prop()
  policies?: string;

  @Prop({ type: Object })
  faq?: Record<string, string>;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true, unique: true })
  storeId: Types.ObjectId;
}
```

---

## 🔌 API Endpoints (Overview)

### Authentication

- `POST /auth/register` - Register new store owner
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Stores

- `GET /stores/:subdomain` - Get store by subdomain (public)
- `POST /stores` - Create store
- `PATCH /stores/:id` - Update store settings
- `DELETE /stores/:id` - Delete store

### Products

- `GET /stores/:storeId/products` - List products (with filters)
- `GET /stores/:storeId/products/:id` - Get product detail
- `POST /stores/:storeId/products` - Create product
- `PATCH /stores/:storeId/products/:id` - Update product
- `DELETE /stores/:storeId/products/:id` - Delete product

### Categories

- `GET /stores/:storeId/categories` - List categories with subcategories
- `POST /stores/:storeId/categories` - Create category
- `PATCH /stores/:storeId/categories/:id` - Update category
- `DELETE /stores/:storeId/categories/:id` - Delete category

### Posts

- `GET /stores/:storeId/posts` - List posts (paginated)
- `GET /stores/:storeId/posts/:id` - Get post with comments
- `POST /stores/:storeId/posts` - Create post
- `POST /stores/:storeId/posts/:id/like` - Like post
- `POST /stores/:storeId/posts/:id/comments` - Add comment

### Info Page

- `GET /stores/:storeId/info` - Get info page
- `PATCH /stores/:storeId/info` - Update info page

### Media

- `POST /upload` - Upload image
- `DELETE /upload/:id` - Delete image

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB 7+ (or use Docker)
- Docker (recommended for local development)

### Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Or start individual apps
npx nx serve web    # Frontend on http://localhost:4200
npx nx serve api    # Backend on http://localhost:3000
```

### Useful Commands

```bash
# Generate new library
npx nx g @nx/js:lib libs/shared/my-lib

# Generate new NestJS module
npx nx g @nx/nest:module my-module --project=api

# Run tests
npx nx run-many -t test

# Build for production
npx nx run-many -t build -p web api

# View dependency graph
npx nx graph
```

---

## 📝 Notes & Decisions

### Why Subdomains?

- **Professional appearance**: store.shopit.com looks more professional
- **SEO benefits**: Each store gets its own domain authority
- **Easy sharing**: Simple, memorable URLs
- **Future flexibility**: Easy migration to custom domains

### Why Separate Posts from Products?

- **Engagement**: Social-like features encourage user interaction
- **Updates**: Stores can share news, behind-the-scenes, announcements
- **Marketing**: Product highlights, sales announcements
- **Community**: Builds connection between store and customers

### Mobile App Considerations

- API is designed to be mobile-friendly
- Deep linking structure planned from start
- Authentication supports mobile clients
- Push notification infrastructure ready

---

## 📅 Milestones

| Milestone | Target Date | Description                  |
| --------- | ----------- | ---------------------------- |
| M1        | Week 2      | Core infrastructure complete |
| M2        | Week 4      | Store & product management   |
| M3        | Week 6      | Store frontend complete      |
| M4        | Week 8      | Subdomain routing + media    |
| M5        | Week 10     | Admin dashboard              |
| M6        | Week 12     | MVP Launch Ready             |

---

## 🔐 Security Considerations

- [ ] Input validation on all endpoints
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Helmet.js for HTTP headers
- [ ] NoSQL injection prevention (Mongoose validation)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Secure file upload (type validation, size limits)
- [ ] Environment variable management

---

_Last Updated: December 24, 2025_
