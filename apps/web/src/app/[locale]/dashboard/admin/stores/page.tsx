'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../../lib/api';

interface Store {
  _id: string;
  name: string;
  nameEn: string;
  subdomain: string;
  publishStatus: 'draft' | 'pending_review' | 'published' | 'rejected';
  ownerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  publishedAt?: string;
  logo?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function StoresManagementContent() {
  const t = useTranslations('admin');
  const [stores, setStores] = useState<Store[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchStores = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (search) params.append('search', search);
      if (statusFilter) params.append('publishStatus', statusFilter);

      const response = await api.get(`/admin/stores?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch stores');
      }
      const data = await response.json();
      setStores(data.stores);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Failed to fetch stores:', err);
      setError(err.message || 'Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStores(1);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('storesManagementTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('storesManagementDescription')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchStores')}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition-colors"
          >
            {t('search')}
          </button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
        >
          <option value="">{t('allStatuses')}</option>
          <option value="draft">{t('statusDraft')}</option>
          <option value="pending_review">{t('statusPendingReview')}</option>
          <option value="published">{t('statusPublished')}</option>
          <option value="rejected">{t('statusRejected')}</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stores Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-500)] border-t-transparent"></div>
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {t('noStoresFound')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-zinc-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('store')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('owner')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('createdAt')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {stores.map((store) => (
                  <tr
                    key={store._id}
                    className="hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                          {store.logo ? (
                            <img
                              src={store.logo}
                              alt={store.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {store.nameEn?.charAt(0) ||
                                store.name?.charAt(0) ||
                                'S'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {store.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {store.subdomain}.shopit.ge
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {store.ownerId?.firstName} {store.ownerId?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {store.ownerId?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(store.publishStatus || 'draft')}`}
                      >
                        {t(
                          `status${(store.publishStatus || 'draft').charAt(0).toUpperCase() + (store.publishStatus || 'draft').slice(1).replace('_', '')}`,
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(store.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <a
                        href={`https://${store.subdomain}.shopit.ge`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:underline"
                      >
                        {t('visitStore')}
                      </a>
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
            {t('showingStores', {
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
              onClick={() => fetchStores(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {t('previous')}
            </button>
            <button
              onClick={() => fetchStores(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoresManagementPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <StoresManagementContent />
    </ProtectedRoute>
  );
}
