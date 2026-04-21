'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Developer subdomain login page - redirects to main site login.
 * developers.shopit.ge/login → shopit.ge/[locale]/login
 */
export default function DeveloperLoginPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    let mainSiteUrl = '';

    if (hostname.endsWith('.localhost')) {
      const portSuffix = port ? `:${port}` : '';
      mainSiteUrl = `${protocol}//localhost${portSuffix}`;
    } else if (hostname.startsWith('developers.')) {
      const mainDomain = hostname.replace('developers.', '');
      mainSiteUrl = `${protocol}//${mainDomain}`;
    }

    const pathParts = window.location.pathname.split('/');
    const locale = pathParts.find(p => p === 'en' || p === 'ka') || 'ka';

    let loginUrl = `${mainSiteUrl}/${locale}/login`;
    if (redirect) {
      loginUrl += `?redirect=${encodeURIComponent(redirect)}`;
    }

    window.location.href = loginUrl;
  }, [redirect]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Redirecting to login...</p>
      </div>
    </div>
  );
}
