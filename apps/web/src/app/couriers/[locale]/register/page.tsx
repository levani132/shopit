'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Courier subdomain register page - redirects to main site registration
 * This page exists because the middleware rewrites couriers.shopit.ge/register 
 * to /couriers/[locale]/register, but we want to use the main site's registration.
 */
export default function CourierRegisterPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    // Build the main site URL
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    let mainSiteUrl = '';

    // Handle localhost subdomains (e.g., couriers.localhost:3000)
    if (hostname.endsWith('.localhost')) {
      const portSuffix = port ? `:${port}` : '';
      mainSiteUrl = `${protocol}//localhost${portSuffix}`;
    } else if (hostname.startsWith('couriers.')) {
      // Production: couriers.shopit.ge -> shopit.ge
      const mainDomain = hostname.replace('couriers.', '');
      mainSiteUrl = `${protocol}//${mainDomain}`;
    }

    // Get locale from current path
    const pathParts = window.location.pathname.split('/');
    const locale = pathParts.find(p => p === 'en' || p === 'ka') || 'ka';

    // Build redirect URL preserving the redirect param
    let registerUrl = `${mainSiteUrl}/${locale}/register`;
    if (redirect) {
      // Keep the redirect pointing to the courier subdomain
      registerUrl += `?redirect=${encodeURIComponent(redirect)}`;
    }

    // Redirect to main site
    window.location.href = registerUrl;
  }, [redirect]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Redirecting to registration...</p>
      </div>
    </div>
  );
}

