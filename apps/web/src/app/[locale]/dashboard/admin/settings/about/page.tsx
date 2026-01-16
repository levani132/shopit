'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SectionCard, SectionTitle, AboutContent } from '../../../../../../components/dashboard/admin/SettingsLayout';

// Build API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = `${API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')}/api/v1`;

export default function AboutSettingsPage() {
  const t = useTranslations('admin');
  const [about, setAbout] = useState<AboutContent>({
    missionKa: '',
    missionEn: '',
    storyKa: '',
    storyEn: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch about content
  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const res = await fetch(`${API_URL}/content/about`, { credentials: 'include' });
        if (res.ok) {
          setAbout(await res.json());
        }
      } catch (error) {
        console.error('Failed to fetch about:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/content/admin/about`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(about),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settingsSaved') });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch {
      setMessage({ type: 'error', text: t('saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--accent-500)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <SectionCard className="space-y-6">
        <SectionTitle>{t('aboutManagement')}</SectionTitle>

        {/* Mission */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('missionSection')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('missionKa')}</label>
              <textarea
                rows={4}
                value={about.missionKa}
                onChange={(e) => setAbout({ ...about, missionKa: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('missionEn')}</label>
              <textarea
                rows={4}
                value={about.missionEn}
                onChange={(e) => setAbout({ ...about, missionEn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
              />
            </div>
          </div>
        </div>

        {/* Story */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('storySection')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('storyKa')}</label>
              <textarea
                rows={6}
                value={about.storyKa}
                onChange={(e) => setAbout({ ...about, storyKa: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('storyEn')}</label>
              <textarea
                rows={6}
                value={about.storyEn}
                onChange={(e) => setAbout({ ...about, storyEn: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {t('saveSettings')}
        </button>
      </div>
    </div>
  );
}
