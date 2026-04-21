'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { api, apiUrl } from '../../../../../lib/api';

interface ProfileData {
  _id: string;
  displayName: string;
  bio: { ka?: string; en?: string };
  website?: string;
  githubUsername?: string;
  status: string;
}

export default function DeveloperProfilePage() {
  const t = useTranslations('developer');
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubMessage, setGithubMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    bioEn: '',
    bioKa: '',
    website: '',
    githubUsername: '',
  });

  useEffect(() => {
    // Handle GitHub OAuth callback params
    const ghConnected = searchParams.get('github_connected');
    const ghError = searchParams.get('github_error');

    if (ghConnected) {
      setGithubMessage({ type: 'success', text: t('githubConnectedSuccess', { username: ghConnected }) });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (ghError) {
      setGithubMessage({ type: 'error', text: t('githubConnectFailed') });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, t]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get('/developers/me');
        const p = data.profile ?? data;
        setProfile(p);
        setFormData({
          displayName: p.displayName || '',
          bioEn: p.bio?.en || '',
          bioKa: p.bio?.ka || '',
          website: p.website || '',
          githubUsername: p.githubUsername || '',
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updated = await api.put('/developers/me', {
        displayName: formData.displayName,
        bio: {
          ka: formData.bioKa || undefined,
          en: formData.bioEn || undefined,
        },
        website: formData.website || undefined,
      });
      setProfile(updated.profile ?? updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || t('updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">{t('dashProfile')}</h1>
        <p className="text-gray-400">{t('profileDescription')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Status Badge */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">{t('accountStatus')}:</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                profile?.status === 'approved'
                  ? 'bg-green-500/20 text-green-400'
                  : profile?.status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
              }`}
            >
              {t(`status_${profile?.status || 'pending'}`)}
            </span>
          </div>
        </div>

        {/* Display Name */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('developerName')}</label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            maxLength={100}
          />
        </div>

        {/* Bio */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">{t('aboutYou')}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('bioEn')}</label>
            <textarea
              value={formData.bioEn}
              onChange={(e) => setFormData({ ...formData, bioEn: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('bioKa')}</label>
            <textarea
              value={formData.bioKa}
              onChange={(e) => setFormData({ ...formData, bioKa: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
              maxLength={500}
            />
          </div>
        </div>

        {/* Links & GitHub */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">{t('links')}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('website')}</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://yoursite.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* GitHub Connection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('githubAccount')}</label>
            {profile?.githubUsername ? (
              <div className="rounded-xl border border-emerald-500/30 overflow-hidden">
                {/* Connected header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15">
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-emerald-400 text-sm font-medium">{t('githubConnected')}</span>
                </div>

                {/* Profile info */}
                <div className="flex items-center justify-between p-4 bg-white/5">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://github.com/${profile.githubUsername}.png?size=80`}
                      alt={profile.githubUsername}
                      className="w-10 h-10 rounded-full ring-2 ring-emerald-500/40"
                    />
                    <div>
                      <a
                        href={`https://github.com/${profile.githubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-medium hover:text-emerald-400 transition-colors"
                      >
                        {profile.githubUsername}
                      </a>
                      <p className="text-gray-500 text-xs mt-0.5">github.com/{profile.githubUsername}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={`https://github.com/${profile.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" />
                        <path d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" />
                      </svg>
                      {t('viewProfile')}
                    </a>
                    <a
                      href={`${apiUrl}/developers/github/connect`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                      </svg>
                      {t('reconnectGithub')}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-gray-400 text-sm">{t('githubConnectDescription')}</p>
                <a
                  href={`${apiUrl}/developers/github/connect`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors border border-white/20 w-fit"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  {t('connectGithub')}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* GitHub callback messages */}
        {githubMessage && (
          <div
            className={`p-4 rounded-xl text-sm ${
              githubMessage.type === 'success'
                ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                : 'bg-red-500/20 border border-red-500/30 text-red-300'
            }`}
          >
            {githubMessage.text}
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-sm">
            {t('profileUpdated')}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-lg transition-all shadow-lg shadow-emerald-500/25"
        >
          {saving ? t('saving') : t('saveProfile')}
        </button>
      </form>
    </div>
  );
}
