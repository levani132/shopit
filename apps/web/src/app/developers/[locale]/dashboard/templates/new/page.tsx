'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../../../lib/api';

const CATEGORIES = ['general', 'fashion', 'electronics', 'food', 'services', 'handmade', 'other'];

export default function ScaffoldTemplatePage() {
  const t = useTranslations('developer');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [step, setStep] = useState<'form' | 'result'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    category: 'general',
    pricingType: 'free',
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug.trim() || !formData.name.trim()) {
      setError(t('slugAndNameRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.post('/developers/templates/scaffold', {
        slug: formData.slug,
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        pricingType: formData.pricingType,
      });
      setFiles(result.files);
      setStep('result');
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || t('scaffoldFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Create a simple download as a combined text file showing all files
    const content = Object.entries(files)
      .map(([path, body]) => `// ====== ${path} ======\n${body}`)
      .join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.slug}-scaffold.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFile = (path: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || path;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [pushingToGithub, setPushingToGithub] = useState(false);
  const [githubResult, setGithubResult] = useState<{ repoUrl: string; cloneUrl: string } | null>(null);

  if (step === 'result') {
    const sortedFiles = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/templates`}
            className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-block"
          >
            &larr; {t('backToTemplates')}
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">{t('scaffoldGenerated')}</h1>
          <p className="text-gray-400">{t('scaffoldGeneratedDescription')}</p>
        </div>

        {/* Download / GitHub buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('downloadAll')}
          </button>
          {!githubResult && (
            <button
              onClick={async () => {
                setPushingToGithub(true);
                try {
                  const result = await api.post('/developers/templates/scaffold/github', {
                    slug: formData.slug,
                    name: formData.name,
                    description: formData.description || undefined,
                    category: formData.category,
                    pricingType: formData.pricingType,
                  });
                  setGithubResult(result);
                } catch (err: unknown) {
                  const apiErr = err as { message?: string };
                  setError(apiErr?.message || t('githubRepoFailed'));
                } finally {
                  setPushingToGithub(false);
                }
              }}
              disabled={pushingToGithub}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2 border border-white/20"
            >
              {pushingToGithub ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              )}
              {pushingToGithub ? t('creatingRepo') : t('pushToGithub')}
            </button>
          )}
          <button
            onClick={() => { setStep('form'); setFiles({}); setGithubResult(null); }}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
          >
            {t('generateAnother')}
          </button>
        </div>

        {/* GitHub success message */}
        {githubResult && (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl mb-6">
            <p className="text-emerald-300 font-medium mb-2">{t('githubRepoCreated')}</p>
            <a
              href={githubResult.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline break-all"
            >
              {githubResult.repoUrl}
            </a>
            <div className="mt-2">
              <code className="text-sm text-gray-300 bg-black/30 px-2 py-1 rounded">
                git clone {githubResult.cloneUrl}
              </code>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm mb-6">
            {error}
          </div>
        )}

        {/* File list */}
        <div className="space-y-2">
          {sortedFiles.map(([path, content]) => (
            <div key={path} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setExpandedFile(expandedFile === path ? null : path)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-white font-mono text-sm">{path}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile(path, content); }}
                    className="text-gray-400 hover:text-emerald-400 transition-colors p-1"
                    title={t('downloadFile')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedFile === path ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedFile === path && (
                <div className="border-t border-white/10 p-4">
                  <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap overflow-x-auto max-h-96">
                    {content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/${locale}/dashboard/templates`}
          className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-block"
        >
          &larr; {t('backToTemplates')}
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">{t('scaffoldTitle')}</h1>
        <p className="text-gray-400">{t('scaffoldDescription')}</p>
      </div>

      <form onSubmit={handleGenerate} className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-6">
        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t('templateSlug')} *
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) =>
              setFormData({
                ...formData,
                slug: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/--+/g, '-'),
              })
            }
            placeholder="my-awesome-template"
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
          <p className="mt-1 text-xs text-gray-500">{t('slugHelp')}</p>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t('templateNameEn')} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Awesome Template"
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t('descriptionEn')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder={t('scaffoldDescriptionPlaceholder')}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t('category')}
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(`category_${cat}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t('pricingType')}
          </label>
          <select
            value={formData.pricingType}
            onChange={(e) => setFormData({ ...formData, pricingType: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          >
            <option value="free">{t('priceFree')}</option>
            <option value="one-time">{t('priceOneTime')}</option>
            <option value="subscription">{t('priceMonthly')}</option>
          </select>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Link
            href={`/${locale}/dashboard/templates`}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors inline-block"
          >
            {t('cancel')}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {t('generating')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t('generateScaffold')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
