# AI Documentation

This folder contains documentation about patterns, decisions, and conventions used in this codebase. These files are meant to help AI assistants understand how things work and maintain consistency.

## Files

- `colors.md` - Accent colors system and how to use them
- `auth.md` - Authentication system (JWT, roles, cookies, user menus, CTA buttons)
- `routing.md` - URL structure for main site vs store subdomains
- `styling.md` - CSS patterns, Tailwind usage, and dynamic styling
- `project-structure.md` - Nx monorepo structure and key directories
- `stores.md` - Store schema, bilingual content, localization, and settings management
- `dashboard.md` - Seller dashboard layout, theming, and components
- `categories.md` - Categories system, API, dashboard management, and header display
- `products.md` - Products system, filtering, sorting, and view tracking

## Key Reusable Components

- `CtaButton` (`apps/web/src/components/ui/CtaButton.tsx`) - Smart CTA that shows "Dashboard" for sellers, "Start for Free" for others
- `UserMenu` (`apps/web/src/components/store/UserMenu.tsx`) - User dropdown for store pages
- `HeaderUserMenu` (in `apps/web/src/components/layout/Header.tsx`) - User dropdown for main site

## Key Utility Functions

- `getLatinInitial(text)` (`apps/web/src/lib/utils.ts`) - Extracts first Latin character for avatars (handles Georgian text)
- `getUserInitials(firstName, lastName, email)` (`apps/web/src/lib/utils.ts`) - Gets two-letter initials from user name

## How to Use

When working on a feature, read the relevant documentation file first to understand existing patterns before making changes.
