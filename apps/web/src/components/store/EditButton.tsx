'use client';

import { useState, useEffect } from 'react';
import { useStoreEditOptional } from '../../contexts/StoreEditContext';
import { getMainSiteUrl } from '../../utils/subdomain';

// Pencil icon
function PencilIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

interface EditButtonProps {
  href: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'floating' | 'inline' | 'icon-only';
  className?: string;
  children?: React.ReactNode;
}

/**
 * EditButton - Shows an edit button that links to dashboard for store owners
 * Only visible when edit mode is enabled
 */
export function EditButton({
  href,
  title = 'Edit',
  size = 'sm',
  variant = 'floating',
  className = '',
  children,
}: EditButtonProps) {
  const storeEdit = useStoreEditOptional();
  const [mainSiteUrl, setMainSiteUrl] = useState('');

  // Get main site URL on client side
  useEffect(() => {
    setMainSiteUrl(getMainSiteUrl());
  }, []);

  // Only show for store owners in edit mode
  if (!storeEdit?.isStoreOwner || !storeEdit?.isEditMode) {
    return null;
  }

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variantClasses = {
    floating: 'absolute z-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all transform hover:scale-110',
    inline: 'inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors',
    'icon-only': 'bg-blue-600/90 hover:bg-blue-700 text-white rounded-full shadow-md transition-all transform hover:scale-110 backdrop-blur-sm',
  };

  const baseClasses = `${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  // Use full URL to main site for dashboard links
  const fullHref = mainSiteUrl ? `${mainSiteUrl}${href}` : href;

  return (
    <a
      href={fullHref}
      title={title}
      className={baseClasses}
      onClick={(e) => e.stopPropagation()}
    >
      <PencilIcon className={iconSizes[size]} />
      {children && <span>{children}</span>}
    </a>
  );
}

/**
 * EditButtonWrapper - Wraps content and positions an edit button relative to it
 */
interface EditButtonWrapperProps {
  href: string;
  title?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  offset?: string;
  children: React.ReactNode;
}

export function EditButtonWrapper({
  href,
  title,
  position = 'top-right',
  offset = '2',
  children,
}: EditButtonWrapperProps) {
  const positionClasses = {
    'top-left': `top-${offset} left-${offset}`,
    'top-right': `top-${offset} right-${offset}`,
    'bottom-left': `bottom-${offset} left-${offset}`,
    'bottom-right': `bottom-${offset} right-${offset}`,
  };

  return (
    <div className="relative group">
      {children}
      <EditButton
        href={href}
        title={title}
        className={positionClasses[position]}
      />
    </div>
  );
}
