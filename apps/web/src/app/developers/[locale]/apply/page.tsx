'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../contexts/AuthContext';
import { Role, hasRole } from '@shopit/constants';
import { DeveloperHeader } from '../../../../components/developer/DeveloperHeader';
import { api } from '../../../../lib/api';

interface DeveloperStatus {
  isDeveloper: boolean;
  hasPendingApplication?: boolean;
}

export default function DeveloperApplyPage() {
  const t = useTranslations('developer');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { isAuthenticated, user } = useAuth();

  const [devStatus, setDevStatus] = useState<DeveloperStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [formData, setFormData] = useState({
    displayName: '',
    bioKa: '',
    bioEn: '',
    website: '',
    githubUsername: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check developer status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!isAuthenticated) {
        setCheckingStatus(false);
        return;
      }

      try {
        const data = await api.get('/developers/me');
        setDevStatus({
          isDeveloper: data.status === 'approved',
          hasPendingApplication: data.status === 'pending',
        });
      } catch {
        // 404 means no application yet — that's expected
        setDevStatus(null);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName.trim()) {
      setError(t('displayNameRequired'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/developers/apply', {
        displayName: formData.displayName,
        bio: {
          ka: formData.bioKa || undefined,
          en: formData.bioEn || undefined,
        },
        website: formData.website || undefined,
        githubUsername: formData.githubUsername || undefined,
      });

      setSuccess(true);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || t('applicationFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <DeveloperHeader />
        <div className="flex items-center justify-center px-4 py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  // Already a developer
  if (hasRole(user?.role ?? 0, Role.DEVELOPER) || devStatus?.isDeveloper) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <DeveloperHeader />
        <div className="flex items-center justify-center px-4 py-20">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">{t('alreadyDeveloper')}</h1>
            <p className="text-gray-400 mb-8">{t('alreadyDeveloperDescription')}</p>
            <Link
              href={`/${locale}/dashboard`}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors inline-block"
            >
              {t('goToDashboard')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pending application
  if (devStatus?.hasPendingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <DeveloperHeader />
        <div className="flex items-center justify-center px-4 py-20">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">{t('applicationPending')}</h1>
            <p className="text-gray-400 mb-8">{t('applicationPendingDescription')}</p>
            <Link
              href={`/${locale}`}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors inline-block"
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <DeveloperHeader />
        <div className="flex items-center justify-center px-4 py-20">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">{t('applicationSubmitted')}</h1>
            <p className="text-gray-400 mb-8">{t('applicationSubmittedDescription')}</p>
            <Link
              href={`/${locale}`}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors inline-block"
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <DeveloperHeader />
        <div className="flex items-center justify-center px-4 py-20">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">{t('loginToApply')}</h1>
            <p className="text-gray-400 mb-8">{t('loginToApplyDescription')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${locale}/login?redirect=/developers/${locale}/apply`}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
              >
                {t('login')}
              </Link>
              <Link
                href={`/${locale}/register?redirect=/developers/${locale}/apply`}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20"
              >
                {t('register')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      <DeveloperHeader />
      <div className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('applyTitle')}</h1>
            <p className="text-gray-400">{t('applyDescription')}</p>
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Display Name */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">{t('developerName')}</h2>
              <p className="text-gray-400 text-sm mb-4">{t('developerNameDescription')}</p>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder={t('displayNamePlaceholder')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                maxLength={100}
              />
            </div>

            {/* Bio */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">{t('aboutYou')}</h2>
              <p className="text-gray-400 text-sm mb-4">{t('aboutYouDescription')}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('bioEn')}
                  </label>
                  <textarea
                    value={formData.bioEn}
                    onChange={(e) => setFormData({ ...formData, bioEn: e.target.value })}
                    placeholder={t('bioPlaceholderEn')}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                    maxLength={500}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('bioKa')}
                  </label>
                  <textarea
                    value={formData.bioKa}
                    onChange={(e) => setFormData({ ...formData, bioKa: e.target.value })}
                    placeholder={t('bioPlaceholderKa')}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                    maxLength={500}
                  />
                </div>
              </div>
            </div>

            {/* Website & GitHub */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">{t('links')}</h2>
              <p className="text-gray-400 text-sm mb-4">{t('linksDescription')}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('website')}
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yoursite.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('githubUsername')}
                  </label>
                  <div className="flex items-center">
                    <span className="px-4 py-3 bg-white/10 border border-r-0 border-white/20 rounded-l-xl text-gray-400 text-sm">
                      github.com/
                    </span>
                    <input
                      type="text"
                      value={formData.githubUsername}
                      onChange={(e) => setFormData({ ...formData, githubUsername: e.target.value })}
                      placeholder="username"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-r-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-lg transition-all shadow-lg shadow-emerald-500/25"
            >
              {isSubmitting ? t('submitting') : t('submitApplication')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
