# SellIt - Multi-Vendor E-Commerce Platform

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

#### 1.2 Database Design
- [ ] Design PostgreSQL schema
- [ ] Set up Prisma ORM
- [ ] Create migrations for core entities:
  - Users (platform admins & store owners)
  - Stores (subdomain, settings, theme)
  - Products (with variants, images, pricing)
  - Categories & Subcategories
  - Posts (social media-like content)
  - Comments & Likes
  - Store Info Pages

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
- [ ] Redis caching
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
│   │   ├── database/           # Prisma client & migrations
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
- **Database**: PostgreSQL
- **ORM**: Prisma
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

### Users
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  role          UserRole  @default(STORE_OWNER)
  stores        Store[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum UserRole {
  PLATFORM_ADMIN
  STORE_OWNER
}
```

### Stores
```prisma
model Store {
  id            String    @id @default(cuid())
  subdomain     String    @unique
  name          String
  description   String?
  coverImage    String?
  profileImage  String?
  accentColor   String    @default("#6366f1")
  isActive      Boolean   @default(true)
  
  owner         User      @relation(fields: [ownerId], references: [id])
  ownerId       String
  
  categories    Category[]
  products      Product[]
  posts         Post[]
  infoPage      InfoPage?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Products
```prisma
model Product {
  id            String    @id @default(cuid())
  name          String
  description   String?
  price         Decimal   @db.Decimal(10, 2)
  salePrice     Decimal?  @db.Decimal(10, 2)
  isOnSale      Boolean   @default(false)
  images        String[]
  stock         Int       @default(0)
  isActive      Boolean   @default(true)
  
  store         Store     @relation(fields: [storeId], references: [id])
  storeId       String
  
  category      Category? @relation(fields: [categoryId], references: [id])
  categoryId    String?
  
  subcategory   Subcategory? @relation(fields: [subcategoryId], references: [id])
  subcategoryId String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Categories & Subcategories
```prisma
model Category {
  id            String        @id @default(cuid())
  name          String
  slug          String
  image         String?
  order         Int           @default(0)
  
  store         Store         @relation(fields: [storeId], references: [id])
  storeId       String
  
  subcategories Subcategory[]
  products      Product[]
  
  @@unique([storeId, slug])
}

model Subcategory {
  id            String    @id @default(cuid())
  name          String
  slug          String
  order         Int       @default(0)
  
  category      Category  @relation(fields: [categoryId], references: [id])
  categoryId    String
  
  products      Product[]
  
  @@unique([categoryId, slug])
}
```

### Posts (Social Feed)
```prisma
model Post {
  id            String    @id @default(cuid())
  content       String
  images        String[]
  
  store         Store     @relation(fields: [storeId], references: [id])
  storeId       String
  
  likes         PostLike[]
  comments      PostComment[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model PostLike {
  id            String    @id @default(cuid())
  visitorId     String    // Anonymous or user-based
  
  post          Post      @relation(fields: [postId], references: [id])
  postId        String
  
  createdAt     DateTime  @default(now())
  
  @@unique([postId, visitorId])
}

model PostComment {
  id            String    @id @default(cuid())
  content       String
  authorName    String
  authorEmail   String?
  
  post          Post      @relation(fields: [postId], references: [id])
  postId        String
  
  createdAt     DateTime  @default(now())
}
```

### Info Page
```prisma
model InfoPage {
  id            String    @id @default(cuid())
  aboutContent  String?   @db.Text
  contactEmail  String?
  contactPhone  String?
  address       String?
  policies      String?   @db.Text
  faq           Json?
  
  store         Store     @relation(fields: [storeId], references: [id])
  storeId       String    @unique
  
  updatedAt     DateTime  @updatedAt
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
- PostgreSQL 15+
- Docker (optional, for local development)

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
- **Professional appearance**: store.sellit.com looks more professional
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

| Milestone | Target Date | Description |
|-----------|-------------|-------------|
| M1 | Week 2 | Core infrastructure complete |
| M2 | Week 4 | Store & product management |
| M3 | Week 6 | Store frontend complete |
| M4 | Week 8 | Subdomain routing + media |
| M5 | Week 10 | Admin dashboard |
| M6 | Week 12 | MVP Launch Ready |

---

## 🔐 Security Considerations

- [ ] Input validation on all endpoints
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Helmet.js for HTTP headers
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Secure file upload (type validation, size limits)
- [ ] Environment variable management

---

*Last Updated: December 19, 2025*
