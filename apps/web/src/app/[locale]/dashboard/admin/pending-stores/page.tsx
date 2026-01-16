'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { Role } from '@sellit/constants';
import { api } from '../../../../../lib/api';
import { getStoreUrl, getBaseDomain } from '../../../../../utils/subdomain';

interface PendingStore {
  _id: string;
  name: string;
  nameEn: string;
  subdomain: string;
  description?: string;
  ownerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  publishRequestedAt: string;
  publishMessage?: string;
  logo?: string;
}

function PendingStoresContent() {
  const t = useTranslations('admin');
  const [stores, setStores] = useState<PendingStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    storeId: string;
    storeName: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchStores = async () => {
    try {
      const response = await api.get('/admin/stores/pending');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch pending stores');
      }
      const data = await response.json();
      setStores(data.stores);
    } catch (err: any) {
      console.error('Failed to fetch pending stores:', err);
      setError(err.message || 'Failed to fetch pending stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleApprove = async (storeId: string) => {
    setProcessingId(storeId);
    try {
      const response = await api.post(`/admin/stores/${storeId}/approve`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve store');
      }
      setStores(stores.filter((s) => s._id !== storeId));
    } catch (err: any) {
      console.error('Failed to approve store:', err);
      setError(err.message || 'Failed to approve store');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;

    setProcessingId(rejectModal.storeId);
    try {
      const response = await api.post(
        `/admin/stores/${rejectModal.storeId}/reject`,
        {
          reason: rejectReason,
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject store');
      }
      setStores(stores.filter((s) => s._id !== rejectModal.storeId));
      setRejectModal(null);
      setRejectReason('');
    } catch (err: any) {
      console.error('Failed to reject store:', err);
      setError(err.message || 'Failed to reject store');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-500)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('pendingStoresTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('pendingStoresDescription')}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {stores.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 dark:text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            {t('noStoresToReview')}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('noStoresToReviewDescription')}
          </p>
        </div>
      )}

      {/* Stores List */}
      <div className="space-y-4">
        {stores.map((store) => (
          <div
            key={store._id}
            className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6"
          >
            <div className="flex items-start gap-4">
              {/* Store Logo */}
              <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-gray-400 dark:text-zinc-500">
                    {store.nameEn?.charAt(0) || store.name?.charAt(0) || 'S'}
                  </span>
                )}
              </div>

              {/* Store Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {store.name}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({store.subdomain}.{getBaseDomain().baseDomain})
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {store.description || t('noDescription')}
                </p>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {t('owner')}: {store.ownerId.firstName}{' '}
                    {store.ownerId.lastName} ({store.ownerId.email})
                  </span>
                  <span>
                    {t('requestedAt')}:{' '}
                    {new Date(store.publishRequestedAt).toLocaleDateString()}
                  </span>
                </div>
                {store.publishMessage && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>{t('messageFromSeller')}:</strong>{' '}
                      {store.publishMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={getStoreUrl(store.subdomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-zinc-600 rounded-lg transition-colors"
                >
                  {t('preview')}
                </a>
                <button
                  onClick={() =>
                    setRejectModal({
                      storeId: store._id,
                      storeName: store.name,
                    })
                  }
                  disabled={processingId === store._id}
                  className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('reject')}
                </button>
                <button
                  onClick={() => handleApprove(store._id)}
                  disabled={processingId === store._id}
                  className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {processingId === store._id && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  )}
                  {t('approve')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('rejectStore')}
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('rejectStoreConfirm', { name: rejectModal.storeName })}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('rejectionReason')}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder={t('rejectionReasonPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-zinc-600 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === rejectModal.storeId}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processingId === rejectModal.storeId && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {t('confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PendingStoresPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <PendingStoresContent />
    </ProtectedRoute>
  );
}
