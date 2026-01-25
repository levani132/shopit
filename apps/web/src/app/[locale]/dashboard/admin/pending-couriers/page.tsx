'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../../lib/api';

interface PendingCourier {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  courierMotivationLetter: string;
  courierProfileImage?: string;
  accountNumber?: string;
  vehicleType?: string;
  createdAt: string;
}

function PendingCouriersContent() {
  const t = useTranslations('admin');
  const [couriers, setCouriers] = useState<PendingCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    courierId: string;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getVehicleInfo = (vehicleType?: string) => {
    switch (vehicleType) {
      case 'walking':
        return { icon: '🚶', label: t('vehicleWalking') };
      case 'bicycle':
        return { icon: '🚲', label: t('vehicleBicycle') };
      case 'motorcycle':
        return { icon: '🏍️', label: t('vehicleMotorcycle') };
      case 'car':
        return { icon: '🚗', label: t('vehicleCar') };
      case 'suv':
        return { icon: '🚙', label: t('vehicleSuv') };
      case 'van':
        return { icon: '🚐', label: t('vehicleVan') };
      default:
        return null;
    }
  };

  const fetchCouriers = async () => {
    try {
      const data = await api.get<{ couriers: any[] }>(
        '/admin/couriers/pending',
      );
      setCouriers(data.couriers);
    } catch (err: any) {
      console.error('Failed to fetch pending couriers:', err);
      setError(err.message || 'Failed to fetch pending couriers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  const handleApprove = async (courierId: string) => {
    setProcessingId(courierId);
    try {
      await api.post(`/admin/couriers/${courierId}/approve`);
      setCouriers(couriers.filter((c) => c._id !== courierId));
    } catch (err: any) {
      console.error('Failed to approve courier:', err);
      setError(err.message || 'Failed to approve courier');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;

    setProcessingId(rejectModal.courierId);
    try {
      await api.post(`/admin/couriers/${rejectModal.courierId}/reject`, {
        reason: rejectReason,
      });
      setCouriers(couriers.filter((c) => c._id !== rejectModal.courierId));
      setRejectModal(null);
      setRejectReason('');
    } catch (err: any) {
      console.error('Failed to reject courier:', err);
      setError(err.message || 'Failed to reject courier');
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
          {t('pendingCouriersTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('pendingCouriersDescription')}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {couriers.length === 0 && (
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
            {t('noCouriersToReview')}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('noCouriersToReviewDescription')}
          </p>
        </div>
      )}

      {/* Couriers List */}
      <div className="space-y-4">
        {couriers.map((courier) => (
          <div
            key={courier._id}
            className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Profile Image */}
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {courier.courierProfileImage ? (
                    <img
                      src={courier.courierProfileImage}
                      alt={`${courier.firstName} ${courier.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-400 dark:text-zinc-500">
                      {courier.firstName?.charAt(0) || 'C'}
                    </span>
                  )}
                </div>

                {/* Courier Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {courier.firstName} {courier.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {courier.email}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {courier.accountNumber && (
                      <span>
                        {t('iban')}: {courier.accountNumber}
                      </span>
                    )}
                    {courier.vehicleType && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                        {(() => {
                          const vehicle = getVehicleInfo(courier.vehicleType);
                          return vehicle ? (
                            <>
                              <span>{vehicle.icon}</span>
                              <span>{vehicle.label}</span>
                            </>
                          ) : (
                            courier.vehicleType
                          );
                        })()}
                      </span>
                    )}
                    <span>
                      {t('appliedAt')}:{' '}
                      {new Date(courier.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      setExpandedId(
                        expandedId === courier._id ? null : courier._id,
                      )
                    }
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-zinc-600 rounded-lg transition-colors"
                  >
                    {expandedId === courier._id
                      ? t('hideLetter')
                      : t('viewLetter')}
                  </button>
                  <button
                    onClick={() =>
                      setRejectModal({
                        courierId: courier._id,
                        name: `${courier.firstName} ${courier.lastName}`,
                      })
                    }
                    disabled={processingId === courier._id}
                    className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {t('reject')}
                  </button>
                  <button
                    onClick={() => handleApprove(courier._id)}
                    disabled={processingId === courier._id}
                    className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {processingId === courier._id && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    )}
                    {t('approve')}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Motivation Letter */}
            {expandedId === courier._id && (
              <div className="px-6 pb-6">
                <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('motivationLetter')}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {courier.courierMotivationLetter}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('rejectCourier')}
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('rejectCourierConfirm', { name: rejectModal.name })}
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
                disabled={processingId === rejectModal.courierId}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processingId === rejectModal.courierId && (
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

export default function PendingCouriersPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <PendingCouriersContent />
    </ProtectedRoute>
  );
}
