'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { hasRole, Role } from '@shopit/constants';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import SetupRequirements from '../../../components/dashboard/SetupRequirements';
import {
  AlertBanner,
  BreakdownList,
  EmptyState,
  Icons,
  OverviewSkeleton,
  QuickActionButton,
  QuickActionCard,
  SectionCard,
  StatCard,
} from '../../../components/dashboard/OverviewComponents';

// ============================================
// Types
// ============================================
interface AdminStats {
  users: { total: number; sellers: number; couriers: number; todayNew: number };
  stores: {
    total: number;
    published: number;
    pendingReview: number;
    todayNew: number;
  };
  orders: {
    total: number;
    pending: number;
    paid: number;
    delivered: number;
    todayNew: number;
  };
  revenue: { total: number };
  pendingApprovals: { stores: number; couriers: number };
}

interface SellerStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

interface CourierStats {
  availableDeliveries: number;
  myDeliveries: number;
  totalEarnings: number;
  completedToday: number;
}

interface BuyerStats {
  totalOrders: number;
  activeOrders: number;
  wishlistItems: number;
  savedAddresses: number;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  storeName?: string;
}

// ============================================
// Collapsible Section Header Component
// ============================================
interface CollapsibleHeaderProps {
  icon: React.ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  bgColor: string;
}

function CollapsibleHeader({
  icon,
  title,
  isOpen,
  onToggle,
  bgColor,
}: CollapsibleHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-900/50 px-2 py-2 -mx-2 rounded transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${bgColor}`}>{icon}</div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <svg
        className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
          isOpen ? 'transform rotate-180' : ''
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>
  );
}

// ============================================
// Admin Overview Section
// ============================================
function AdminOverview({
  stats,
  isOpen,
  onToggle,
}: {
  stats: AdminStats;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <CollapsibleHeader
        icon={
          <svg
            className="w-4 h-4 text-red-600 dark:text-red-400"
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
        }
        title={t('adminPanel')}
        isOpen={isOpen}
        onToggle={onToggle}
        bgColor="bg-red-100 dark:bg-red-900/30"
      />

      {isOpen && (
        <>
          {/* Pending Approvals Alert */}
          {(stats.pendingApprovals.stores > 0 ||
            stats.pendingApprovals.couriers > 0) && (
            <AlertBanner
              type="warning"
              message={t('pendingApprovalsAlert', {
                stores: stats.pendingApprovals.stores,
                couriers: stats.pendingApprovals.couriers,
              })}
              action={{
                label: t('reviewNow'),
                href: '/dashboard/admin/pending-stores',
              }}
            />
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t('totalUsers')}
              value={stats.users.total}
              subtitle={`+${stats.users.todayNew} ${t('today')}`}
              icon={Icons.users}
              color="blue"
            />
            <StatCard
              title={t('totalStores')}
              value={stats.stores.total}
              subtitle={`${stats.stores.published} ${t('published')}`}
              icon={Icons.store}
              color="purple"
            />
            <StatCard
              title={t('totalOrders')}
              value={stats.orders.total}
              subtitle={`+${stats.orders.todayNew} ${t('today')}`}
              icon={Icons.orders}
              color="green"
            />
            <StatCard
              title={t('totalRevenue')}
              value={`₾${stats.revenue.total.toLocaleString()}`}
              icon={Icons.revenue}
              color="yellow"
            />
          </div>

          {/* Breakdowns & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SectionCard title={t('usersBreakdown')}>
              <BreakdownList
                items={[
                  { label: t('sellers'), value: stats.users.sellers },
                  { label: t('couriers'), value: stats.users.couriers },
                  {
                    label: t('regularUsers'),
                    value:
                      stats.users.total -
                      stats.users.sellers -
                      stats.users.couriers,
                  },
                ]}
              />
            </SectionCard>

            <SectionCard title={t('ordersBreakdown')}>
              <BreakdownList
                items={[
                  {
                    label: t('pending'),
                    value: stats.orders.pending,
                    color: 'yellow',
                  },
                  { label: t('paid'), value: stats.orders.paid, color: 'blue' },
                  {
                    label: t('delivered'),
                    value: stats.orders.delivered,
                    color: 'green',
                  },
                ]}
              />
            </SectionCard>

            <SectionCard title={t('quickActions')}>
              <div className="grid grid-cols-2 gap-2">
                <QuickActionCard
                  href="/dashboard/admin/pending-stores"
                  label={t('reviewStores')}
                  icon={Icons.store}
                  badge={
                    stats.pendingApprovals.stores > 0
                      ? stats.pendingApprovals.stores
                      : undefined
                  }
                  color="purple"
                />
                <QuickActionCard
                  href="/dashboard/admin/pending-couriers"
                  label={t('reviewCouriers')}
                  icon={Icons.delivery}
                  badge={
                    stats.pendingApprovals.couriers > 0
                      ? stats.pendingApprovals.couriers
                      : undefined
                  }
                  color="blue"
                />
                <QuickActionCard
                  href="/dashboard/admin/settings"
                  label={t('siteSettings')}
                  icon={Icons.settings}
                  color="green"
                />
                <QuickActionCard
                  href="/dashboard/admin/analytics"
                  label={t('viewAnalytics')}
                  icon={Icons.analytics}
                  color="yellow"
                />
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Seller Overview Section
// ============================================
function SellerOverview({
  stats,
  isOpen,
  onToggle,
}: {
  stats: SellerStats;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <CollapsibleHeader
        icon={Icons.store}
        title={t('sellerDashboard')}
        isOpen={isOpen}
        onToggle={onToggle}
        bgColor="bg-purple-100 dark:bg-purple-900/30"
      />

      {isOpen && (
        <>
          {/* Setup Requirements */}
          <SetupRequirements />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t('totalProducts')}
              value={stats.totalProducts}
              icon={Icons.products}
              color="blue"
              href="/dashboard/products"
            />
            <StatCard
              title={t('totalOrders')}
              value={stats.totalOrders}
              icon={Icons.orders}
              color="green"
              href="/dashboard/orders"
            />
            <StatCard
              title={t('totalRevenue')}
              value={`₾${stats.totalRevenue.toLocaleString()}`}
              icon={Icons.revenue}
              color="purple"
            />
            <StatCard
              title={t('pendingOrders')}
              value={stats.pendingOrders}
              icon={Icons.clock}
              color="orange"
              href="/dashboard/orders?status=pending"
            />
          </div>

          {/* Quick Actions */}
          <SectionCard title={t('quickActions')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickActionButton
                href="/dashboard/products/new"
                label={t('addProduct')}
                icon={Icons.plus}
              />
              <QuickActionButton
                href="/dashboard/orders"
                label={t('viewOrders')}
                icon={Icons.orders}
              />
              <QuickActionButton
                href="/dashboard/store"
                label={t('editStore')}
                icon={Icons.settings}
              />
              <QuickActionButton
                href="/dashboard/analytics"
                label={t('viewAnalytics')}
                icon={Icons.analytics}
              />
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

// ============================================
// Courier Overview Section
// ============================================
function CourierOverview({
  stats,
  isOpen,
  onToggle,
}: {
  stats: CourierStats;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <CollapsibleHeader
        icon={Icons.delivery}
        title={t('courierDashboard')}
        isOpen={isOpen}
        onToggle={onToggle}
        bgColor="bg-blue-100 dark:bg-blue-900/30"
      />

      {isOpen && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t('availableDeliveries')}
              value={stats.availableDeliveries}
              icon={Icons.delivery}
              color="blue"
              href="/dashboard/deliveries"
            />
            <StatCard
              title={t('myDeliveries')}
              value={stats.myDeliveries}
              icon={Icons.orders}
              color="green"
              href="/dashboard/deliveries?tab=my"
            />
            <StatCard
              title={t('totalEarnings')}
              value={`₾${stats.totalEarnings.toLocaleString()}`}
              icon={Icons.revenue}
              color="purple"
            />
            <StatCard
              title={t('completedToday')}
              value={stats.completedToday}
              icon={Icons.check}
              color="orange"
            />
          </div>

          {/* Quick Actions */}
          <SectionCard title={t('quickActions')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickActionButton
                href="/dashboard/deliveries"
                label={t('viewAvailableDeliveries')}
                icon={Icons.delivery}
              />
              <QuickActionButton
                href="/dashboard/courier-balance"
                label={t('viewBalance')}
                icon={Icons.wallet}
              />
              <QuickActionButton
                href="/dashboard/courier-analytics"
                label={t('viewAnalytics')}
                icon={Icons.analytics}
              />
              <QuickActionButton
                href="/dashboard/profile"
                label={t('editProfile')}
                icon={Icons.profile}
              />
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

// ============================================
// Buyer Overview Section
// ============================================
function BuyerOverview({
  stats,
  recentOrders,
  title,
  isOpen,
  onToggle,
}: {
  stats: BuyerStats;
  recentOrders: RecentOrder[];
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('dashboard');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'shipped':
      case 'in_transit':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <CollapsibleHeader
        icon={Icons.shopping}
        title={title}
        isOpen={isOpen}
        onToggle={onToggle}
        bgColor="bg-green-100 dark:bg-green-900/30"
      />

      {isOpen && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t('totalOrders')}
              value={stats.totalOrders}
              icon={Icons.orders}
              color="blue"
              href="/dashboard/my-orders"
            />
            <StatCard
              title={t('activeOrders')}
              value={stats.activeOrders}
              icon={Icons.delivery}
              color="green"
              href="/dashboard/my-orders"
            />
            <StatCard
              title={t('wishlistItems')}
              value={stats.wishlistItems}
              icon={Icons.heart}
              color="red"
              href="/dashboard/wishlist"
            />
            <StatCard
              title={t('savedAddresses')}
              value={stats.savedAddresses}
              icon={Icons.address}
              color="purple"
              href="/dashboard/addresses"
            />
          </div>

          {/* Recent Orders & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title={t('recentOrders')}
              action={
                recentOrders.length > 0
                  ? { label: t('viewAll'), href: '/dashboard/my-orders' }
                  : undefined
              }
            >
              {recentOrders.length === 0 ? (
                <EmptyState
                  icon={Icons.orders}
                  title={t('noOrders')}
                  description={t('noOrdersDescription')}
                  action={{ label: t('startShopping'), href: '/' }}
                />
              ) : (
                <div className="space-y-3">
                  {recentOrders.slice(0, 3).map((order) => (
                    <a
                      key={order._id}
                      href={`/dashboard/my-orders#${order._id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          #{order.orderNumber}
                        </p>
                        {order.storeName && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {order.storeName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}
                        >
                          {t(`orderStatus.${order.status}`)}
                        </span>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                          ₾{(order.total ?? 0).toFixed(2)}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title={t('quickActions')}>
              <div className="grid grid-cols-2 gap-4">
                <QuickActionButton
                  href="/dashboard/my-orders"
                  label={t('viewMyOrders')}
                  icon={Icons.orders}
                />
                <QuickActionButton
                  href="/dashboard/wishlist"
                  label={t('myWishlist')}
                  icon={Icons.heart}
                />
                <QuickActionButton
                  href="/dashboard/addresses"
                  label={t('manageAddresses')}
                  icon={Icons.address}
                />
                <QuickActionButton
                  href="/dashboard/profile"
                  label={t('editProfile')}
                  icon={Icons.profile}
                />
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Main Dashboard Overview Page
// ============================================
export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null);
  const [courierStats, setCourierStats] = useState<CourierStats | null>(null);
  const [buyerStats, setBuyerStats] = useState<BuyerStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const userRole = user?.role ?? Role.USER;
  const isAdmin = hasRole(userRole, Role.ADMIN);
  const isSeller = hasRole(userRole, Role.SELLER);
  const isCourier = hasRole(userRole, Role.COURIER);
  const hasMultipleRoles =
    [isAdmin, isSeller, isCourier].filter(Boolean).length > 1;

  // Determine the first section and initialize openSections accordingly
  useEffect(() => {
    const firstSection = isAdmin
      ? 'admin'
      : isSeller
        ? 'seller'
        : isCourier
          ? 'courier'
          : 'buyer';
    setOpenSections({
      admin: firstSection === 'admin',
      seller: firstSection === 'seller',
      courier: firstSection === 'courier',
      buyer: firstSection === 'buyer',
    });
  }, [isAdmin, isSeller, isCourier]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      if (isAdmin) {
        const data = await api.get('/admin/dashboard');
        setAdminStats(data);
      }

      if (isSeller) {
        try {
          const data = await api.get('/stores/stats');
          setSellerStats({
            totalProducts: data.totalProducts || 0,
            totalOrders: data.totalOrders || 0,
            totalRevenue: data.totalRevenue || 0,
            pendingOrders: data.pendingOrders || 0,
          });
        } catch (err) {
          console.error('Failed to fetch seller stats:', err);
          setSellerStats({
            totalProducts: 0,
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
          });
        }
      }

      if (isCourier) {
        try {
          const data = await api.get('/analytics/courier');
          setCourierStats({
            availableDeliveries: data.thisWeek?.deliveries || 0,
            myDeliveries: data.totalDeliveries || 0,
            totalEarnings: data.totalEarnings || 0,
            completedToday:
              (data.dailyStats && data.dailyStats[0]?.deliveries) || 0,
          });
        } catch (err) {
          console.error('Failed to fetch courier stats:', err);
          setCourierStats({
            availableDeliveries: 0,
            myDeliveries: 0,
            totalEarnings: 0,
            completedToday: 0,
          });
        }
      }

      try {
        const [ordersRes, wishlistRes, addressesRes] = await Promise.allSettled(
          [
            api.get('/orders/my-orders'),
            api.get('/wishlist'),
            api.get('/auth/addresses'),
          ],
        );

        const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : [];
        const wishlist =
          wishlistRes.status === 'fulfilled' ? wishlistRes.value : [];
        const addresses =
          addressesRes.status === 'fulfilled' ? addressesRes.value : [];

        const orderList = Array.isArray(orders) ? orders : orders.orders || [];
        const wishlistItems = Array.isArray(wishlist)
          ? wishlist
          : wishlist.items || [];
        const addressList = Array.isArray(addresses)
          ? addresses
          : addresses.addresses || [];

        const activeStatuses = [
          'pending',
          'processing',
          'paid',
          'shipped',
          'in_transit',
        ];
        const activeOrders = orderList.filter((o: RecentOrder) =>
          activeStatuses.includes(o.status),
        );

        setBuyerStats({
          totalOrders: orderList.length,
          activeOrders: activeOrders.length,
          wishlistItems: wishlistItems.length,
          savedAddresses: addressList.length,
        });

        const sortedOrders = orderList
          .sort(
            (a: RecentOrder, b: RecentOrder) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 3);
        setRecentOrders(sortedOrders);
      } catch (err) {
        console.error('Failed to fetch buyer data:', err);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(t('failedToLoadDashboard'));
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isSeller, isCourier, t]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, fetchDashboardData]);

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <OverviewSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <AlertBanner type="error" title={t('error')} message={error} />
      </div>
    );
  }

  // Check if user has pending courier application (applied but not yet a courier)
  const hasPendingCourierApplication =
    user?.courierAppliedAt && !isCourier && !user?.isCourierApproved;

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {t('welcomeBack')}
          {user?.firstName && `, ${user.firstName}`}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('overviewDescription')}
        </p>
      </div>

      {/* Pending Courier Application Banner */}
      {hasPendingCourierApplication && (
        <AlertBanner
          type="info"
          title={t('courierApplicationPending')}
          message={t('courierApplicationPendingDescription')}
        />
      )}

      {/* Admin Section */}
      {isAdmin && adminStats && (
        <AdminOverview
          stats={adminStats}
          isOpen={openSections.admin}
          onToggle={() => toggleSection('admin')}
        />
      )}

      {/* Seller Section */}
      {isSeller && sellerStats && (
        <SellerOverview
          stats={sellerStats}
          isOpen={openSections.seller}
          onToggle={() => toggleSection('seller')}
        />
      )}

      {/* Courier Section */}
      {isCourier && courierStats && (
        <CourierOverview
          stats={courierStats}
          isOpen={openSections.courier}
          onToggle={() => toggleSection('courier')}
        />
      )}

      {/* Buyer Section (everyone) */}
      {buyerStats && (
        <BuyerOverview
          stats={buyerStats}
          recentOrders={recentOrders}
          title={hasMultipleRoles ? t('buyerAccount') : t('myAccount')}
          isOpen={openSections.buyer}
          onToggle={() => toggleSection('buyer')}
        />
      )}
    </div>
  );
}
