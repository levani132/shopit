'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';

interface DeveloperProfile {
  _id: string;
  displayName: string;
  status: string;
  templatesCount: number;
  earnings: {
    total: number;
    pending: number;
    withdrawn: number;
  };
}

interface TemplateListing {
  _id: string;
  templateSlug: string;
  name: { ka?: string; en?: string };
  status: string;
  stats: {
    installs: number;
    rating: number;
    reviewCount: number;
  };
  pricing: {
    type: string;
    price: number;
  };
}

export default function DeveloperDashboardPage() {
  const t = useTranslations('developer');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [templates, setTemplates] = useState<TemplateListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, templatesData] = await Promise.all([
          api.get('/developers/me'),
          api.get('/developers/templates').catch(() => []),
        ]);
        setProfile(profileData);
        setTemplates(Array.isArray(templatesData) ? templatesData : templatesData.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const getName = (name: { ka?: string; en?: string }) =>
    (locale === 'ka' ? name.ka : name.en) || name.en || name.ka || '';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          {t('welcomeBack')}, {profile?.displayName}
        </h1>
        <p className="text-gray-400">{t('dashOverviewDescription')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <div className="text-gray-400 text-sm mb-1">{t('totalTemplates')}</div>
          <div className="text-3xl font-bold text-white">{profile?.templatesCount || 0}</div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <div className="text-gray-400 text-sm mb-1">{t('totalEarnings')}</div>
          <div className="text-3xl font-bold text-white">₾{(profile?.earnings?.total || 0).toFixed(2)}</div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <div className="text-gray-400 text-sm mb-1">{t('pendingEarnings')}</div>
          <div className="text-3xl font-bold text-emerald-400">₾{(profile?.earnings?.pending || 0).toFixed(2)}</div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <div className="text-gray-400 text-sm mb-1">{t('withdrawn')}</div>
          <div className="text-3xl font-bold text-white">₾{(profile?.earnings?.withdrawn || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Recent Templates */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">{t('yourTemplates')}</h2>
          <Link
            href={`/${locale}/dashboard/templates`}
            className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
          >
            {t('viewAll')}
          </Link>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <p className="text-gray-400 mb-4">{t('noTemplatesYet')}</p>
            <Link
              href={`/${locale}/dashboard/templates`}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors inline-block"
            >
              {t('createFirstTemplate')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.slice(0, 5).map((template) => (
              <div
                key={template._id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-medium">{getName(template.name)}</div>
                    <div className="text-gray-500 text-sm">{template.templateSlug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      template.status === 'published'
                        ? 'bg-green-500/20 text-green-400'
                        : template.status === 'draft'
                          ? 'bg-gray-500/20 text-gray-400'
                          : template.status === 'pending_review'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {t(`status_${template.status}`)}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {template.stats.installs} {t('installs')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
