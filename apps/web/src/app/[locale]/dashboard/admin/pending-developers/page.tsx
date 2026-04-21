'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../../lib/api';

interface PendingDeveloper {
  id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  displayName: string;
  bio?: { en?: string; ka?: string };
  website?: string;
  githubUsername?: string;
  avatar?: string;
  status: string;
  createdAt: string;
}

function PendingDevelopersContent() {
  const t = useTranslations('admin');
  const [developers, setDevelopers] = useState<PendingDeveloper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    developerId: string;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDevelopers = async () => {
    try {
      const data = await api.get<{ profiles: PendingDeveloper[] }>(
        '/developers/admin/pending',
      );
      setDevelopers(data.profiles);
    } catch (err: any) {
      console.error('Failed to fetch pending developers:', err);
      setError(err.message || 'Failed to fetch pending developers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const handleApprove = async (developerId: string) => {
    setProcessingId(developerId);
    try {
      await api.post(`/developers/admin/${developerId}/approve`);
      setDevelopers(developers.filter((d) => d.id !== developerId));
    } catch (err: any) {
      console.error('Failed to approve developer:', err);
      setError(err.message || 'Failed to approve developer');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;

    setProcessingId(rejectModal.developerId);
    try {
      await api.post(`/developers/admin/${rejectModal.developerId}/reject`, {
        reason: rejectReason,
      });
      setDevelopers(
        developers.filter((d) => d.id !== rejectModal.developerId),
      );
      setRejectModal(null);
      setRejectReason('');
    } catch (err: any) {
      console.error('Failed to reject developer:', err);
      setError(err.message || 'Failed to reject developer');
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
          {t('pendingDevelopersTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('pendingDevelopersDescription')}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {developers.length === 0 && (
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
            {t('noDevelopersToReview')}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('noDevelopersToReviewDescription')}
          </p>
        </div>
      )}

      {/* Developers List */}
      <div className="space-y-4">
        {developers.map((dev) => {
          const userName =
            typeof dev.userId === 'object'
              ? `${dev.userId.firstName} ${dev.userId.lastName}`
              : dev.displayName;
          const userEmail =
            typeof dev.userId === 'object' ? dev.userId.email : '';

          return (
            <div
              key={dev.id}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {dev.avatar ? (
                      <img
                        src={dev.avatar}
                        alt={dev.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Developer Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dev.displayName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {userName} {userEmail && `(${userEmail})`}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      {dev.githubUsername && (
                        <a
                          href={`https://github.com/${dev.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 dark:bg-zinc-700 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                          {dev.githubUsername}
                        </a>
                      )}
                      {dev.website && (
                        <a
                          href={dev.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                          </svg>
                          {t('developerWebsite')}
                        </a>
                      )}
                      <span>
                        {t('appliedAt')}:{' '}
                        {new Date(dev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === dev.id ? null : dev.id,
                        )
                      }
                      className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-zinc-600 rounded-lg transition-colors"
                    >
                      {expandedId === dev.id
                        ? t('devHideDetails')
                        : t('devViewDetails')}
                    </button>
                    <button
                      onClick={() =>
                        setRejectModal({
                          developerId: dev.id,
                          name: dev.displayName,
                        })
                      }
                      disabled={processingId === dev.id}
                      className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {t('reject')}
                    </button>
                    <button
                      onClick={() => handleApprove(dev.id)}
                      disabled={processingId === dev.id}
                      className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {processingId === dev.id && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      )}
                      {t('approve')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === dev.id && (
                <div className="px-6 pb-6 space-y-3">
                  {dev.bio && (dev.bio.en || dev.bio.ka) && (
                    <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('developerBio')}
                      </h4>
                      {dev.bio.en && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            EN:
                          </span>
                          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {dev.bio.en}
                          </p>
                        </div>
                      )}
                      {dev.bio.ka && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            KA:
                          </span>
                          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {dev.bio.ka}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {dev.website && (
                    <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('developerWebsite')}
                      </h4>
                      <a
                        href={dev.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {dev.website}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('rejectDeveloper')}
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('rejectDeveloperConfirm', { name: rejectModal.name })}
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
                disabled={processingId === rejectModal.developerId}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processingId === rejectModal.developerId && (
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

export default function PendingDevelopersPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <PendingDevelopersContent />
    </ProtectedRoute>
  );
}
