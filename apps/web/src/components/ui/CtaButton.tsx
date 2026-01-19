'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../i18n/routing';
import { useAuth } from '../../contexts/AuthContext';
import { Role, hasRole } from '@shopit/constants';

interface CtaButtonProps {
  size?: 'sm' | 'md' | 'lg';
  showArrow?: boolean;
  className?: string;
}

/**
 * Smart CTA button that shows:
 * - "Go to Dashboard" for logged-in sellers
 * - "Start for Free" for everyone else (including logged-in buyers)
 */
export function CtaButton({
  size = 'lg',
  showArrow = true,
  className = '',
}: CtaButtonProps) {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const { user, isAuthenticated } = useAuth();

  const isSeller = hasRole(user?.role ?? 0, Role.SELLER);

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const href = isAuthenticated && isSeller ? '/dashboard' : '/register';
  const label =
    isAuthenticated && isSeller
      ? tNav('goToDashboard')
      : tCommon('startForFree');

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 bg-[var(--accent-600)] dark:bg-[var(--accent-500)] text-white rounded-xl hover:bg-[var(--accent-700)] dark:hover:bg-[var(--accent-600)] transition-all font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${sizeClasses[size]} ${className}`}
    >
      {label}
      {showArrow && (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      )}
    </Link>
  );
}
