'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../../lib/api';

interface VersionEntry {
  version: string;
  bundleUrl: string;
  changelog?: string;
  publishedAt: string;
}

interface TemplateListing {
  id: string;
  templateSlug: string;
  name: { ka?: string; en?: string };
  description: { ka?: string; en?: string };
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
  bundleUrl?: string;
  version?: string;
  versionHistory?: VersionEntry[];
  lastBuildAt?: string;
  lastBuildError?: string;
  githubRepo?: string;
  createdAt: string;
}

export default function DeveloperTemplatesPage() {
  const t = useTranslations('developer');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [templates, setTemplates] = useState<TemplateListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildResult, setBuildResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishVersion, setPublishVersion] = useState('');
  const [publishChangelog, setPublishChangelog] = useState('');
  const [generateScaffold, setGenerateScaffold] = useState(true);
  const [creatingRepoId, setCreatingRepoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    templateSlug: '',
    nameEn: '',
    nameKa: '',
    descriptionEn: '',
    descriptionKa: '',
    pricingType: 'free',
    price: 0,
  });

  const getName = (name: { ka?: string; en?: string }) =>
    (locale === 'ka' ? name.ka : name.en) || name.en || name.ka || '';

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await api.get('/developers/templates');
      setTemplates(Array.isArray(data) ? data : data.listings || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.templateSlug.trim() || !formData.nameEn.trim()) {
      setError(t('slugAndNameRequired'));
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const created = await api.post('/developers/templates', {
        templateSlug: formData.templateSlug,
        name: { en: formData.nameEn, ka: formData.nameKa || undefined },
        description: {
          en: formData.descriptionEn || undefined,
          ka: formData.descriptionKa || undefined,
        },
        pricing: {
          type: formData.pricingType,
          price: formData.pricingType === 'free' ? 0 : formData.price,
        },
      });

      // If scaffold checkbox is on, create a GitHub repo with scaffold and link it
      if (generateScaffold) {
        try {
          const ghResult = await api.post('/developers/templates/scaffold/github', {
            slug: formData.templateSlug,
            name: formData.nameEn,
            description: formData.descriptionEn || undefined,
            category: 'general',
            pricingType: formData.pricingType,
          });

          // Link the GitHub repo to the template listing
          if (ghResult?.repoUrl) {
            const listingId = created?.listing?.id || created?.id;
            if (listingId) {
              await api.put(`/developers/templates/${listingId}`, {
                githubRepo: ghResult.repoUrl,
              });
            }
          }
        } catch (scaffoldErr: unknown) {
          const scaffoldApiErr = scaffoldErr as { message?: string };
          // Show a warning but don't block — the template was still created
          setError(scaffoldApiErr?.message || t('scaffoldFailed'));
        }
      }

      setShowCreateForm(false);
      setFormData({
        templateSlug: '',
        nameEn: '',
        nameKa: '',
        descriptionEn: '',
        descriptionKa: '',
        pricingType: 'free',
        price: 0,
      });
      setGenerateScaffold(true);
      fetchTemplates();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || t('createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      await api.delete(`/developers/templates/${id}`);
      setTemplates(templates.filter((tpl) => tpl.id !== id));
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleSubmitForReview = async (id: string) => {
    try {
      await api.post(`/developers/templates/${id}/submit`);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to submit for review:', err);
    }
  };

  const handleBuild = async (id: string) => {
    setBuildingId(id);
    setBuildResult(null);
    try {
      const result = await api.post(`/developers/templates/${id}/build`, {});
      setBuildResult({ id, success: true, message: result.message || t('buildSuccess') });
      fetchTemplates();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setBuildResult({ id, success: false, message: apiErr?.message || t('buildFailed') });
    } finally {
      setBuildingId(null);
    }
  };

  const handlePublishVersion = async (id: string) => {
    if (!publishVersion.trim()) return;
    setPublishingId(id);
    try {
      await api.post(`/developers/templates/${id}/versions/publish`, {
        version: publishVersion,
        changelog: publishChangelog || undefined,
      });
      setPublishVersion('');
      setPublishChangelog('');
      setPublishingId(null);
      fetchTemplates();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setBuildResult({ id, success: false, message: apiErr?.message || t('publishFailed') });
      setPublishingId(null);
    }
  };

  const toggleVersionHistory = (id: string) => {
    setExpandedVersions(expandedVersions === id ? null : id);
  };

  const handleCreateRepo = async (tpl: TemplateListing) => {
    setCreatingRepoId(tpl.id);
    try {
      const ghResult = await api.post('/developers/templates/scaffold/github', {
        slug: tpl.templateSlug,
        name: getName(tpl.name),
        description: getName(tpl.description) || undefined,
        category: 'general',
        pricingType: tpl.pricing.type,
      });
      if (ghResult?.repoUrl) {
        await api.put(`/developers/templates/${tpl.id}`, {
          githubRepo: ghResult.repoUrl,
        });
      }
      fetchTemplates();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || t('githubRepoFailed'));
    } finally {
      setCreatingRepoId(null);
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
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('dashTemplates')}</h1>
          <p className="text-gray-400">{t('templatesDescription')}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('createTemplate')}
        </button>
      </div>

      {/* Create Template Form */}
      {showCreateForm && (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">{t('newTemplate')}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('templateSlug')} *</label>
                <input
                  type="text"
                  value={formData.templateSlug}
                  onChange={(e) => setFormData({ ...formData, templateSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="my-awesome-template"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('templateNameEn')} *</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="My Awesome Template"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('templateNameKa')}</label>
              <input
                type="text"
                value={formData.nameKa}
                onChange={(e) => setFormData({ ...formData, nameKa: e.target.value })}
                placeholder="ჩემი თემფლეითი"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('descriptionEn')}</label>
                <textarea
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('descriptionKa')}</label>
                <textarea
                  value={formData.descriptionKa}
                  onChange={(e) => setFormData({ ...formData, descriptionKa: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('pricingType')}</label>
                <select
                  value={formData.pricingType}
                  onChange={(e) => setFormData({ ...formData, pricingType: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                >
                  <option value="free">{t('priceFree')}</option>
                  <option value="one_time">{t('priceOneTime')}</option>
                  <option value="monthly">{t('priceMonthly')}</option>
                </select>
              </div>
              {formData.pricingType !== 'free' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('price')} (₾)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Scaffold checkbox */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateScaffold}
                  onChange={(e) => setGenerateScaffold(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-300">{t('generateScaffoldWithTemplate')}</span>
              </label>
              <span className="text-xs text-gray-500">{t('scaffoldRecommended')}</span>
            </div>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {creating ? t('creating') : t('create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-4">{t('noTemplatesYet')}</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors inline-block"
          >
            {t('createFirstTemplate')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white/5 rounded-2xl border border-white/10 p-6 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{getName(template.name)}</h3>
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
                    {template.version && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                        v{template.version}
                      </span>
                    )}
                    {template.bundleUrl && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400">
                        {t('built')}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mb-3">{template.templateSlug}</p>
                  {template.description && (
                    <p className="text-gray-400 text-sm mb-4">{getName(template.description)}</p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>{template.stats.installs} {t('installs')}</span>
                    {template.stats.rating > 0 && (
                      <span>★ {template.stats.rating.toFixed(1)} ({template.stats.reviewCount})</span>
                    )}
                    <span>
                      {template.pricing.type === 'free'
                        ? t('priceFree')
                        : `₾${template.pricing.price} / ${template.pricing.type === 'monthly' ? t('month') : t('oneTime')}`}
                    </span>
                    {template.lastBuildAt && (
                      <span>{t('lastBuild')}: {new Date(template.lastBuildAt).toLocaleDateString(locale)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleBuild(template.id)}
                    disabled={buildingId === template.id}
                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-50 text-purple-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {buildingId === template.id ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t('building')}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        {t('build')}
                      </>
                    )}
                  </button>
                  <Link
                    href={`/${locale}/dashboard/preview/${template.id}`}
                    target="_blank"
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium rounded-lg transition-colors"
                  >
                    {t('previewTemplate')}
                  </Link>
                  {!template.githubRepo && (
                    <button
                      onClick={() => handleCreateRepo(template)}
                      disabled={creatingRepoId === template.id}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                      </svg>
                      {creatingRepoId === template.id ? t('creatingGithubRepo') : t('createGithubRepo')}
                    </button>
                  )}
                  <Link
                    href={`/${locale}/dashboard/editor/${template.id}`}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {t('openEditor')}
                  </Link>
                  {template.status === 'draft' && (
                    <button
                      onClick={() => handleSubmitForReview(template.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {t('submitForReview')}
                    </button>
                  )}
                  {(template.status === 'draft' || template.status === 'rejected') && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors"
                    >
                      {t('delete')}
                    </button>
                  )}
                </div>
              </div>

              {/* Build Result Feedback */}
              {buildResult && buildResult.id === template.id && (
                <div className={`mt-4 p-3 rounded-xl text-sm ${
                  buildResult.success
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {buildResult.message}
                </div>
              )}

              {/* Last Build Error */}
              {template.lastBuildError && !buildResult && (
                <div className="mt-4 p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">
                  {t('lastBuildError')}: {template.lastBuildError}
                </div>
              )}

              {/* Version History Toggle & Panel */}
              {template.versionHistory && template.versionHistory.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => toggleVersionHistory(template.id)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedVersions === template.id ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('versionHistory')} ({template.versionHistory.length})
                  </button>

                  {expandedVersions === template.id && (
                    <div className="mt-3 space-y-2">
                      {template.versionHistory.map((v, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 rounded-md text-xs font-mono font-medium bg-purple-500/20 text-purple-400">
                              v{v.version}
                            </span>
                            {v.changelog && (
                              <span className="text-sm text-gray-400">{v.changelog}</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(v.publishedAt).toLocaleDateString(locale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Publish Version Form (shown when bundle exists) */}
              {template.bundleUrl && expandedVersions === template.id && (
                <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3">{t('publishNewVersion')}</h4>
                  <div className="flex items-end gap-3">
                    <div className="flex-shrink-0">
                      <label className="block text-xs text-gray-500 mb-1">{t('version')}</label>
                      <input
                        type="text"
                        value={publishingId === template.id ? publishVersion : publishVersion}
                        onChange={(e) => setPublishVersion(e.target.value)}
                        placeholder="1.0.0"
                        className="w-28 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">{t('changelog')}</label>
                      <input
                        type="text"
                        value={publishChangelog}
                        onChange={(e) => setPublishChangelog(e.target.value)}
                        placeholder={t('changelogPlaceholder')}
                        className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={() => handlePublishVersion(template.id)}
                      disabled={publishingId === template.id || !publishVersion.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      {publishingId === template.id ? t('publishing') : t('publishVersion')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
