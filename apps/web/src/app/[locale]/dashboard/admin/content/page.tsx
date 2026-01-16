'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../contexts/AuthContext';
import { Role, hasRole } from '@sellit/constants';

interface FaqItem {
  _id: string;
  questionKa: string;
  questionEn: string;
  answerKa: string;
  answerEn: string;
  category: string;
  order: number;
  isActive: boolean;
}

interface AboutContent {
  missionKa: string;
  missionEn: string;
  storyKa: string;
  storyEn: string;
}

interface ContactContent {
  // Note: email and phone are managed in Site Settings (Platform tab)
  address: string;
  workingHours: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

interface LegalContent {
  contentKa: string;
  contentEn: string;
  lastUpdated?: string;
}

type TabType = 'faq' | 'about' | 'contact' | 'terms' | 'privacy';

// Build API base URL - strip any existing prefix to avoid duplication
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = `${API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')}/api/v1`;

export default function ContentManagementPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('faq');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // FAQ state
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [editingFaq, setEditingFaq] = useState<Partial<FaqItem> | null>(null);

  // About state
  const [about, setAbout] = useState<AboutContent>({
    missionKa: '',
    missionEn: '',
    storyKa: '',
    storyEn: '',
  });

  // Contact state
  const [contact, setContact] = useState<ContactContent>({
    address: '',
    workingHours: '',
    socialLinks: {},
  });

  // Legal state
  const [terms, setTerms] = useState<LegalContent>({
    contentKa: '',
    contentEn: '',
  });
  const [privacy, setPrivacy] = useState<LegalContent>({
    contentKa: '',
    contentEn: '',
  });

  // Auth check
  useEffect(() => {
    if (
      !authLoading &&
      (!isAuthenticated || !hasRole(user?.role ?? 0, Role.ADMIN))
    ) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Fetch content on tab change
  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !hasRole(user?.role ?? 0, Role.ADMIN)
    )
      return;

    setIsLoading(true);
    const fetchContent = async () => {
      try {
        if (activeTab === 'faq') {
          const res = await fetch(`${API_URL}/content/admin/faq`, {
            credentials: 'include',
          });
          if (res.ok) setFaqs(await res.json());
        } else if (activeTab === 'about') {
          const res = await fetch(`${API_URL}/content/about`, {
            credentials: 'include',
          });
          if (res.ok) setAbout(await res.json());
        } else if (activeTab === 'contact') {
          const res = await fetch(`${API_URL}/content/contact`, {
            credentials: 'include',
          });
          if (res.ok) setContact(await res.json());
        } else if (activeTab === 'terms') {
          const res = await fetch(`${API_URL}/content/terms`, {
            credentials: 'include',
          });
          if (res.ok) setTerms(await res.json());
        } else if (activeTab === 'privacy') {
          const res = await fetch(`${API_URL}/content/privacy`, {
            credentials: 'include',
          });
          if (res.ok) setPrivacy(await res.json());
        }
      } catch (error) {
        console.error('Failed to fetch content:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, [activeTab, authLoading, isAuthenticated, user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // FAQ handlers
  const handleSaveFaq = async () => {
    if (!editingFaq) return;
    setIsSaving(true);
    try {
      const method = editingFaq._id ? 'PUT' : 'POST';
      const url = editingFaq._id
        ? `${API_URL}/content/admin/faq/${editingFaq._id}`
        : `${API_URL}/content/admin/faq`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingFaq),
      });

      if (res.ok) {
        const updated = await res.json();
        if (editingFaq._id) {
          setFaqs(faqs.map((f) => (f._id === updated._id ? updated : f)));
        } else {
          setFaqs([...faqs, updated]);
        }
        setEditingFaq(null);
        showMessage('success', 'FAQ saved successfully');
      }
    } catch (error) {
      showMessage('error', 'Failed to save FAQ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      const res = await fetch(`${API_URL}/content/admin/faq/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setFaqs(faqs.filter((f) => f._id !== id));
        showMessage('success', 'FAQ deleted');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete FAQ');
    }
  };

  const handleSeedFaqs = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/content/admin/faq/seed`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        // Refetch FAQs
        const faRes = await fetch(`${API_URL}/content/admin/faq`, {
          credentials: 'include',
        });
        if (faRes.ok) setFaqs(await faRes.json());
        showMessage('success', 'Initial FAQs seeded');
      }
    } catch (error) {
      showMessage('error', 'Failed to seed FAQs');
    } finally {
      setIsSaving(false);
    }
  };

  // Generic save handler for about, contact, terms, privacy
  const handleSaveContent = async (
    type: 'about' | 'contact' | 'terms' | 'privacy',
    data: unknown,
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/content/admin/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showMessage(
          'success',
          `${type.charAt(0).toUpperCase() + type.slice(1)} saved successfully`,
        );
      }
    } catch (error) {
      showMessage('error', `Failed to save ${type}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (
    authLoading ||
    !isAuthenticated ||
    !hasRole(user?.role ?? 0, Role.ADMIN)
  ) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'faq', label: t('faqManagement') },
    { key: 'about', label: t('aboutManagement') },
    { key: 'contact', label: t('contactManagement') },
    { key: 'terms', label: t('termsManagement') },
    { key: 'privacy', label: t('privacyManagement') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('contentManagement')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage website content, FAQs, and legal pages
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-zinc-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--accent-600)] text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('faqManagement')}
                  </h2>
                  <div className="flex gap-2">
                    {faqs.length === 0 && (
                      <button
                        onClick={handleSeedFaqs}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 disabled:opacity-50"
                      >
                        {t('seedFaqs')}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setEditingFaq({
                          questionKa: '',
                          questionEn: '',
                          answerKa: '',
                          answerEn: '',
                          category: 'general',
                          order: 0,
                          isActive: true,
                        })
                      }
                      className="px-4 py-2 text-sm bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)]"
                    >
                      {t('addFaq')}
                    </button>
                  </div>
                </div>

                {/* FAQ Editor Modal */}
                {editingFaq && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                      <h3 className="text-lg font-semibold mb-4">
                        {editingFaq._id ? t('editFaq') : t('addFaq')}
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Question (Georgian)
                            </label>
                            <input
                              type="text"
                              value={editingFaq.questionKa || ''}
                              onChange={(e) =>
                                setEditingFaq({
                                  ...editingFaq,
                                  questionKa: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Question (English)
                            </label>
                            <input
                              type="text"
                              value={editingFaq.questionEn || ''}
                              onChange={(e) =>
                                setEditingFaq({
                                  ...editingFaq,
                                  questionEn: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Answer (Georgian)
                            </label>
                            <textarea
                              rows={4}
                              value={editingFaq.answerKa || ''}
                              onChange={(e) =>
                                setEditingFaq({
                                  ...editingFaq,
                                  answerKa: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Answer (English)
                            </label>
                            <textarea
                              rows={4}
                              value={editingFaq.answerEn || ''}
                              onChange={(e) =>
                                setEditingFaq({
                                  ...editingFaq,
                                  answerEn: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              {t('faqCategory')}
                            </label>
                            <select
                              value={editingFaq.category || 'general'}
                              onChange={(e) =>
                                setEditingFaq({
                                  ...editingFaq,
                                  category: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                            >
                              <option value="general">General</option>
                              <option value="sellers">Sellers</option>
                              <option value="buyers">Buyers</option>
                              <option value="couriers">Couriers</option>
                              <option value="payments">Payments</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              {t('faqOrder')}
                            </label>
                            <input
                              type="number"
                              value={editingFaq.order || 0}
                              onChange={(e) =>
                                setEditingFaq({
                                  ...editingFaq,
                                  order: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editingFaq.isActive !== false}
                                onChange={(e) =>
                                  setEditingFaq({
                                    ...editingFaq,
                                    isActive: e.target.checked,
                                  })
                                }
                              />
                              <span className="text-sm">{t('faqActive')}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-6">
                        <button
                          onClick={() => setEditingFaq(null)}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveFaq}
                          disabled={isSaving}
                          className="px-4 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* FAQ List */}
                {faqs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {t('noFaqs')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {faqs.map((faq) => (
                      <div
                        key={faq._id}
                        className="border dark:border-zinc-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400">
                                {faq.category}
                              </span>
                              {!faq.isActive && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {faq.questionKa}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {faq.questionEn}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingFaq(faq)}
                              className="text-sm text-[var(--accent-600)] hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFaq(faq._id)}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('aboutManagement')}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('missionKa')}
                    </label>
                    <textarea
                      rows={4}
                      value={about.missionKa}
                      onChange={(e) =>
                        setAbout({ ...about, missionKa: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('missionEn')}
                    </label>
                    <textarea
                      rows={4}
                      value={about.missionEn}
                      onChange={(e) =>
                        setAbout({ ...about, missionEn: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('storyKa')}
                    </label>
                    <textarea
                      rows={6}
                      value={about.storyKa}
                      onChange={(e) =>
                        setAbout({ ...about, storyKa: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('storyEn')}
                    </label>
                    <textarea
                      rows={6}
                      value={about.storyEn}
                      onChange={(e) =>
                        setAbout({ ...about, storyEn: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveContent('about', about)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('contactManagement')}
                </h2>

                {/* Note about email/phone in Site Settings */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {t('contactEmailPhoneNote')}
                      </p>
                      <a
                        href="/dashboard/admin/settings?tab=platform"
                        className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t('goToSiteSettings')}
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
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('contactAddress')}
                    </label>
                    <input
                      type="text"
                      value={contact.address}
                      onChange={(e) =>
                        setContact({ ...contact, address: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('workingHours')}
                    </label>
                    <input
                      type="text"
                      value={contact.workingHours}
                      onChange={(e) =>
                        setContact({ ...contact, workingHours: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('socialFacebook')}
                    </label>
                    <input
                      type="url"
                      value={contact.socialLinks?.facebook || ''}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          socialLinks: {
                            ...contact.socialLinks,
                            facebook: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('socialInstagram')}
                    </label>
                    <input
                      type="url"
                      value={contact.socialLinks?.instagram || ''}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          socialLinks: {
                            ...contact.socialLinks,
                            instagram: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('socialLinkedIn')}
                    </label>
                    <input
                      type="url"
                      value={contact.socialLinks?.linkedin || ''}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          socialLinks: {
                            ...contact.socialLinks,
                            linkedin: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveContent('contact', contact)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            {/* Terms Tab */}
            {activeTab === 'terms' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('termsManagement')}
                </h2>
                <p className="text-sm text-gray-500">
                  You can use placeholders: {'{commissionPercent}'},{' '}
                  {'{courierPercent}'}, {'{minWithdrawal}'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('contentKa')}
                    </label>
                    <textarea
                      rows={15}
                      value={terms.contentKa}
                      onChange={(e) =>
                        setTerms({ ...terms, contentKa: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('contentEn')}
                    </label>
                    <textarea
                      rows={15}
                      value={terms.contentEn}
                      onChange={(e) =>
                        setTerms({ ...terms, contentEn: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 font-mono text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveContent('terms', terms)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('privacyManagement')}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('contentKa')}
                    </label>
                    <textarea
                      rows={15}
                      value={privacy.contentKa}
                      onChange={(e) =>
                        setPrivacy({ ...privacy, contentKa: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t('contentEn')}
                    </label>
                    <textarea
                      rows={15}
                      value={privacy.contentEn}
                      onChange={(e) =>
                        setPrivacy({ ...privacy, contentEn: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 font-mono text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveContent('privacy', privacy)}
                  disabled={isSaving}
                  className="px-6 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
