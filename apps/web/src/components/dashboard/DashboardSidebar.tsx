'use client';

import { usePathname } from 'next/navigation';
import { Link } from '../../i18n/routing';
import { useTranslations } from 'next-intl';
import { useAuth, Role, hasRole, hasAnyRole } from '../../contexts/AuthContext';
import { RoleValue } from '@sellit/constants';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  roles?: RoleValue[]; // If undefined, shown to all roles
}

interface NavSection {
  titleKey?: string;
  items: NavItem[];
  roles?: RoleValue[]; // If undefined, shown to all roles
}

// Icons
const OverviewIcon = (
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
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const StoreIcon = (
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
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const ProfileIcon = (
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const AttributesIcon = (
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
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
);

const CategoriesIcon = (
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
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const ProductsIcon = (
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
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

const OrdersIcon = (
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
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  </svg>
);

const BalanceIcon = (
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
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const AnalyticsIcon = (
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
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const ExternalLinkIcon = (
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
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

const DeliveryIcon = (
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
      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
    />
  </svg>
);

const AddressIcon = (
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
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const DevicesIcon = (
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
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const ShoppingBagIcon = (
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
      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
    />
  </svg>
);

const WishlistIcon = (
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
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

// Admin icons
const SettingsIcon = (
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
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const UsersIcon = (
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
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const PendingIcon = (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ShieldIcon = (
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
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const ChartBarIcon = (
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
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const ContentIcon = (
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
      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
    />
  </svg>
);

// Navigation sections - role-based (using bitmask)
const NAV_SECTIONS: NavSection[] = [
  // Overview - for sellers and couriers
  {
    items: [
      {
        href: '/dashboard',
        labelKey: 'overview',
        icon: OverviewIcon,
        roles: [Role.SELLER, Role.COURIER, Role.ADMIN],
      },
    ],
  },
  // My Shopping - aggregated orders and wishlist from all stores
  {
    titleKey: 'sectionShopping',
    items: [
      {
        href: '/dashboard/my-orders',
        labelKey: 'allMyOrders',
        icon: ShoppingBagIcon,
      },
      {
        href: '/dashboard/wishlist',
        labelKey: 'myWishlist',
        icon: WishlistIcon,
      },
    ],
  },
  // Administrative section - for all roles
  {
    titleKey: 'sectionAdmin',
    items: [
      {
        href: '/dashboard/store',
        labelKey: 'storeSettings',
        icon: StoreIcon,
        roles: [Role.SELLER],
      },
      { href: '/dashboard/profile', labelKey: 'profile', icon: ProfileIcon },
      {
        href: '/dashboard/addresses',
        labelKey: 'addresses',
        icon: AddressIcon,
      },
      { href: '/dashboard/devices', labelKey: 'devices', icon: DevicesIcon },
    ],
  },
  // Products section - sellers only
  {
    titleKey: 'sectionProducts',
    roles: [Role.SELLER],
    items: [
      {
        href: '/dashboard/attributes',
        labelKey: 'attributes',
        icon: AttributesIcon,
      },
      {
        href: '/dashboard/categories',
        labelKey: 'categories',
        icon: CategoriesIcon,
      },
      { href: '/dashboard/products', labelKey: 'products', icon: ProductsIcon },
    ],
  },
  // Deliveries section - couriers only
  {
    titleKey: 'sectionDeliveries',
    roles: [Role.COURIER],
    items: [
      {
        href: '/dashboard/deliveries',
        labelKey: 'deliveryOrders',
        icon: DeliveryIcon,
      },
    ],
  },
  // Results section - sellers
  {
    titleKey: 'sectionResults',
    roles: [Role.SELLER],
    items: [
      { href: '/dashboard/orders', labelKey: 'orders', icon: OrdersIcon },
      { href: '/dashboard/balance', labelKey: 'balance', icon: BalanceIcon },
      {
        href: '/dashboard/analytics',
        labelKey: 'analytics',
        icon: AnalyticsIcon,
      },
    ],
  },
  // Courier Results section
  {
    titleKey: 'sectionResults',
    roles: [Role.COURIER],
    items: [
      {
        href: '/dashboard/courier-balance',
        labelKey: 'courierBalance',
        icon: BalanceIcon,
      },
      {
        href: '/dashboard/courier-analytics',
        labelKey: 'courierAnalytics',
        icon: AnalyticsIcon,
      },
    ],
  },
  // Admin section - admin only
  {
    titleKey: 'sectionPlatformAdmin',
    roles: [Role.ADMIN],
    items: [
      {
        href: '/dashboard/admin',
        labelKey: 'adminDashboard',
        icon: ShieldIcon,
      },
      {
        href: '/dashboard/admin/settings',
        labelKey: 'siteSettings',
        icon: SettingsIcon,
      },
      {
        href: '/dashboard/admin/pending-stores',
        labelKey: 'pendingStores',
        icon: PendingIcon,
      },
      {
        href: '/dashboard/admin/pending-couriers',
        labelKey: 'pendingCouriers',
        icon: PendingIcon,
      },
      {
        href: '/dashboard/admin/users',
        labelKey: 'allUsers',
        icon: UsersIcon,
      },
      {
        href: '/dashboard/admin/stores',
        labelKey: 'allStores',
        icon: StoreIcon,
      },
      {
        href: '/dashboard/admin/orders',
        labelKey: 'allOrders',
        icon: OrdersIcon,
      },
      {
        href: '/dashboard/admin/analytics',
        labelKey: 'platformAnalytics',
        icon: ChartBarIcon,
      },
      {
        href: '/dashboard/admin/content',
        labelKey: 'contentManagement',
        icon: ContentIcon,
      },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const t = useTranslations('dashboard');
  const { user, store } = useAuth();

  // Get user role, default to 'user' if not set
  const userRole = (user?.role as RoleValue) || Role.USER;

  // Check if current path matches the nav item
  const isActive = (href: string) => {
    // Remove locale prefix for comparison (handles /ka, /en, etc.)
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');

    // Normalize paths (remove trailing slashes)
    const normalizedPath = pathWithoutLocale.replace(/\/$/, '') || '/dashboard';
    const normalizedHref = href.replace(/\/$/, '');

    if (normalizedHref === '/dashboard') {
      return normalizedPath === '/dashboard';
    }
    return normalizedPath.startsWith(normalizedHref);
  };

  // Check if a section/item should be shown for the current user role (bitmask)
  const shouldShowForRole = (roles?: RoleValue[]) => {
    if (!roles || roles.length === 0) return true; // No role restriction
    return hasAnyRole(userRole, roles);
  };

  // Filter sections and items based on role
  const filteredSections = NAV_SECTIONS.filter((section) =>
    shouldShowForRole(section.roles),
  )
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => shouldShowForRole(item.roles)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Navigation */}
      <nav className="flex-1 p-4 pt-6 space-y-6">
        {filteredSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {/* Section title */}
            {section.titleKey && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {t(section.titleKey)}
              </h3>
            )}
            {/* Section items */}
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-[var(--accent-100)] dark:bg-zinc-800 text-[var(--accent-700)] dark:text-white border-l-2 border-[var(--accent-500)]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border-l-2 border-transparent'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium text-sm">
                    {t(item.labelKey)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Store Preview Link - only for sellers with a store */}
      {hasRole(userRole, Role.SELLER) && store?.subdomain && (
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
          <a
            href={`https://${store.subdomain}.shopit.ge`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {ExternalLinkIcon}
            <span className="font-medium text-sm">{t('viewStore')}</span>
          </a>
        </div>
      )}
    </aside>
  );
}
