export const metadata = {
  title: 'ShopIt',
  description: 'Create your online store',
};

/**
 * Root layout - minimal wrapper
 *
 * NOTE: This layout does NOT include <html> or <body> tags!
 * Those are provided by the specific route layouts:
 * - Main site: apps/web/src/app/[locale]/layout.tsx
 * - Store subdomains: apps/web/src/app/store/[subdomain]/[locale]/layout.tsx
 *
 * This prevents hydration mismatches from having duplicate HTML structures.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Just pass children through - route-specific layouts provide the full HTML structure
  return children;
}
