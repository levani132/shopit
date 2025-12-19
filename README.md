# SellIt 🛒

A multi-vendor e-commerce platform where anyone can create their own online store with a custom subdomain.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose (for local development)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd sellit

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start infrastructure (MongoDB, Redis, MinIO)
docker-compose up -d

# Start development servers
npm run dev
```

### Development URLs

- **Frontend**: http://localhost:4200
- **API**: http://localhost:3000/api/v1
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

## 📁 Project Structure

```
sellit/
├── apps/
│   ├── web/                    # Next.js frontend (customer-facing stores)
│   └── api/                    # NestJS backend API
│
├── libs/
│   ├── shared/
│   │   ├── types/              # TypeScript types/interfaces
│   │   ├── utils/              # Utility functions
│   │   ├── constants/          # Shared constants
│   │   └── validators/         # Validation schemas
│   │
│   ├── api/
│   │   ├── database/           # Prisma client & schema
│   │   └── common/             # Common NestJS decorators, guards
│   │
│   └── ui/
│       ├── components/         # Shared React components
│       └── hooks/              # Custom React hooks
│
├── docker-compose.yml          # Local development infrastructure
├── PROJECT_PLAN.md             # Detailed project plan & roadmap
└── nx.json                     # NX configuration
```

## 🛠️ Available Commands

```bash
# Development
npm run dev                     # Start all apps in development mode
npx nx serve web                # Start frontend only
npx nx serve api                # Start backend only

# Building
npx nx build web                # Build frontend
npx nx build api                # Build backend
npx nx run-many -t build        # Build all projects

# Testing
npx nx test web                 # Test frontend
npx nx test api                 # Test backend
npx nx run-many -t test         # Test all projects

# Linting
npx nx lint web                 # Lint frontend
npx nx lint api                 # Lint backend
npx nx run-many -t lint         # Lint all projects

# Utilities
npx nx graph                    # View dependency graph
npx nx show project web         # Show project details
npx nx show project api         # Show project details
```

## 🏗️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS
- **TypeScript** - Type safety

### Backend
- **NestJS** - Progressive Node.js framework
- **Mongoose** - MongoDB ODM
- **MongoDB** - Database
- **Redis** - Caching (optional)

### Infrastructure
- **NX** - Monorepo management
- **Docker** - Containerization
- **MinIO** - S3-compatible storage

## 📖 Documentation

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for:
- Detailed project roadmap
- Database schema
- API endpoints
- Feature specifications

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

MIT
