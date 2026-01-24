'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface ContactInfo {
  // These come from SiteSettings (public endpoint)
  email: string;
  phone: string;
  // These come from ContactContent
  address: string;
  workingHours: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export default function ContactPage() {
  const t = useTranslations('contact');
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');

  useEffect(() => {
    const fetchContactData = async () => {
      try {
        // Fetch both contact content and public site settings in parallel
        const [contactData, settingsData] = await Promise.all([
          api.get('/api/v1/content/contact'),
          api.get('/api/v1/admin/settings/public'),
        ]);

        setContactInfo({
          // Email and phone from Site Settings (single source of truth)
          email: settingsData.supportEmail || 'support@shopit.ge',
          phone: settingsData.supportPhone || '',
          // Other contact info from ContactContent
          address: (contactData as any).address || '',
          workingHours: (contactData as any).workingHours || '',
          socialLinks: (contactData as any).socialLinks || {},
        });
      } catch {
        // Fallback defaults
        setContactInfo({
          email: 'support@shopit.ge',
          phone: '',
          address: '',
          workingHours: '',
        });
      }
    };

    fetchContactData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post('/api/v1/content/contact/submit', formData);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      {/* Hero */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('title')}
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-300">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('formTitle')}
              </h2>

              {submitStatus === 'success' ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                  <svg
                    className="w-12 h-12 text-green-500 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                    {t('successTitle')}
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    {t('successMessage')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('subject')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('message')}
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent resize-none"
                    />
                  </div>

                  {submitStatus === 'error' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300">
                      {t('errorMessage')}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-4 bg-[var(--accent-600)] text-white rounded-xl hover:bg-[var(--accent-700)] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? t('sending') : t('send')}
                  </button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {t('infoTitle')}
                </h2>
                <div className="space-y-6">
                  {contactInfo?.email && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-[var(--accent-600)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('emailLabel')}
                        </h3>
                        <a
                          href={`mailto:${contactInfo.email}`}
                          className="text-[var(--accent-600)] hover:underline"
                        >
                          {contactInfo.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {contactInfo?.phone && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-[var(--accent-600)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('phoneLabel')}
                        </h3>
                        <a
                          href={`tel:${contactInfo.phone}`}
                          className="text-[var(--accent-600)] hover:underline"
                        >
                          {contactInfo.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {contactInfo?.address && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-[var(--accent-600)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('addressLabel')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          {contactInfo.address}
                        </p>
                      </div>
                    </div>
                  )}

                  {contactInfo?.workingHours && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-[var(--accent-600)]"
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
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {t('hoursLabel')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          {contactInfo.workingHours}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
