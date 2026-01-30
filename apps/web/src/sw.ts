import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

/**
 * Service Worker for multi-tenant PWA
 *
 * Caching strategy:
 * - Static assets (images, fonts, scripts): Cache-first with long TTL
 * - API requests: Network-first with fallback
 * - Pages: Stale-while-revalidate for fast loads
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    // Fallback for navigation requests when offline
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
