'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../../lib/api';
import { useAuth } from '../../../../../contexts/AuthContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Courier {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  status: 'available' | 'busy' | 'offline';
  currentDeliveries: number;
  completedToday: number;
  totalDeliveries: number;
  onTimeRate: number;
  averageDeliveryTime: number;
  lastActiveAt?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function CourierManagementContent() {
  const t = useTranslations('courierAdmin');
  const nav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const params = useParams();
  const locale = params.locale as string;
  const { impersonateUser } = useAuth();

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('deliveries');

  const fetchCouriers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('sortBy', sortBy);

      const data = await api.get<{
        couriers: Courier[];
        pagination: Pagination;
      }>(`/courier-admin/couriers?${params.toString()}`);

      setCouriers(data.couriers || []);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Failed to fetch couriers:', err);
      setError(err.message || 'Failed to load couriers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouriers();
  }, [statusFilter, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCouriers(1);
  };

  const formatTime = (minutes: number) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'busy':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'offline':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getLastActiveText = (lastActiveAt?: string) => {
    if (!lastActiveAt) return t('never');
    const diff = Date.now() - new Date(lastActiveAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('justNow');
    if (minutes < 60) return `${minutes} ${t('minutesAgo')}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${t('hoursAgo')}`;
    const days = Math.floor(hours / 24);
    return `${days} ${t('daysAgo')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link
              href={`/${locale}/dashboard/courier-admin`}
              className="hover:text-cyan-600 dark:hover:text-cyan-400"
            >
              {t('title')}
            </Link>
            <span>/</span>
            <span>{t('manageCouriers')}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('manageCouriers')}
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchCouriers')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">{t('allStatuses')}</option>
          <option value="available">{t('available')}</option>
          <option value="busy">{t('busy')}</option>
          <option value="offline">{t('offline')}</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="deliveries">{t('sortByDeliveries')}</option>
          <option value="onTimeRate">{t('sortByOnTimeRate')}</option>
          <option value="lastActive">{t('sortByLastActive')}</option>
          <option value="name">{t('sortByName')}</option>
        </select>
      </div>

      {/* Couriers Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => fetchCouriers()}
              className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
            >
              {tCommon('retry')}
            </button>
          </div>
        ) : couriers.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">
              {t('noCouriersFound')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-zinc-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('courier')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('currentLoad')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('performance')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('lastActive')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {couriers.map((courier) => (
                  <tr
                    key={courier._id}
                    className="hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center overflow-hidden">
                          {courier.profileImage ? (
                            <img
                              src={courier.profileImage}
                              alt={courier.firstName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                              {courier.firstName?.charAt(0) || 'C'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {courier.firstName} {courier.lastName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {courier.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(courier.status)}`}
                      >
                        {t(courier.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {courier.currentDeliveries} {t('activeDeliveries')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {courier.completedToday} {t('completedToday')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          {Math.round(courier.onTimeRate || 0)}% {t('onTime')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('avg')} {formatTime(courier.averageDeliveryTime)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getLastActiveText(courier.lastActiveAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => impersonateUser(courier._id)}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          title={nav('loginAsUser')}
                        >
                          {nav('loginAsUser')}
                        </button>
                        <Link
                          href={`/${locale}/dashboard/courier-admin/couriers/${courier._id}`}
                          className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          {t('viewDetails')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('showingCouriers', {
              from: (pagination.page - 1) * pagination.limit + 1,
              to: Math.min(
                pagination.page * pagination.limit,
                pagination.total,
              ),
              total: pagination.total,
            })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchCouriers(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {tCommon('previous')}
            </button>
            <button
              onClick={() => fetchCouriers(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {tCommon('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourierManagementPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.COURIER_ADMIN]}>
      <CourierManagementContent />
    </ProtectedRoute>
  );
}
