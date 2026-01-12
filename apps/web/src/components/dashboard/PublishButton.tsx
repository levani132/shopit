'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '../../lib/api';

interface PublishStatus {
  publishStatus: 'draft' | 'pending_review' | 'published' | 'rejected';
  publishRequestedAt?: string;
  publishedAt?: string;
  publishRejectionReason?: string;
  missingFields: {
    profile: string[];
    store: string[];
    canPublish: boolean;
  };
}

export default function PublishButton() {
  const t = useTranslations('dashboard');
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setError(false);
      const response = await api.get('/stores/publish/status');
      if (response.ok) {
        const data = await response.json();
        // Ensure publishStatus defaults to 'draft' if null/undefined
        setStatus({
          ...data,
          publishStatus: data.publishStatus || 'draft',
        });
      } else {
        // API error - default to draft
        setError(true);
        setStatus({
          publishStatus: 'draft',
          missingFields: { profile: [], store: [], canPublish: false },
        });
      }
    } catch (err) {
      console.error('[PublishButton] Failed to fetch publish status:', err);
      setError(true);
      setStatus({
        publishStatus: 'draft',
        missingFields: { profile: [], store: [], canPublish: false },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const response = await api.post('/stores/publish/request', { message });
      if (response.ok) {
        setShowModal(false);
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to submit publish request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 rounded-full text-sm">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // Published - show live badge
  if (status.publishStatus === 'published') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        {t('publishLive')}
      </div>
    );
  }

  // In review - show pending badge
  if (status.publishStatus === 'pending_review') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-medium">
        <svg
          className="w-4 h-4 animate-spin"
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
        {t('publishInReview')}
      </div>
    );
  }

  // Can publish - show button
  const canPublish = status.missingFields.canPublish;

  return (
    <>
      <button
        onClick={() => canPublish && setShowModal(true)}
        disabled={!canPublish}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          canPublish
            ? 'bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white shadow-lg shadow-[var(--accent-500)]/25'
            : 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3l14 9-14 9V3z"
          />
        </svg>
        {t('publishWebsite')}
      </button>

      {/* Publish Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !submitting && setShowModal(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 rounded-xl">
                <svg
                  className="w-6 h-6 text-[var(--accent-600)] dark:text-[var(--accent-400)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('publishModalTitle')}
                </h2>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  {t('publishModalWarning')}
                </p>
              </div>
            </div>

            {/* Message textarea */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('publishModalMessageLabel')}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your store, your journey, or anything you'd like to share..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('publishModalMessageHint')}
              </p>
            </div>

            {/* Delete note */}
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('publishModalDeleteNote')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    {t('publishModalSubmit')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

