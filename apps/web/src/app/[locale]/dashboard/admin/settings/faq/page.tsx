'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  SectionCard,
  FaqItem,
} from '../../../../../../components/dashboard/admin/SettingsLayout';
import { api } from '../../../../../../lib/api';

export default function FaqSettingsPage() {
  const t = useTranslations('admin');
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Partial<FaqItem> | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Fetch FAQs
  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await api.get('/content/admin/faq');
        setFaqs(data);
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveFaq = async () => {
    if (!editingFaq) return;
    setSaving(true);
    try {
      const method = editingFaq._id ? 'PUT' : 'POST';
      const url = editingFaq._id
        ? `/content/admin/faq/${editingFaq._id}`
        : '/content/admin/faq';

      const updated = await api[method.toLowerCase() as 'post' | 'put'](url, editingFaq);
      if (editingFaq._id) {
        setFaqs(faqs.map((f) => (f._id === updated._id ? updated : f)));
      } else {
        setFaqs([...faqs, updated]);
      }
      setEditingFaq(null);
      showMessage('success', t('faqSaved'));
    } catch (err) {
      console.error('Failed to save FAQ:', err);
      showMessage('error', t('faqSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm(t('confirmDeleteFaq'))) return;
    try {
      await api.delete(`/content/admin/faq/${id}`);
      setFaqs(faqs.filter((f) => f._id !== id));
      showMessage('success', t('faqDeleted'));
    } catch (err) {
      console.error('Failed to delete FAQ:', err);
      showMessage('error', t('faqDeleteFailed'));
    }
  };

  const handleSeedFaqs = async () => {
    setSaving(true);
    try {
      await api.post('/content/admin/faq/seed');
      const refreshed = await api.get('/content/admin/faq');
      setFaqs(refreshed);
      showMessage('success', t('faqsSeeded'));
    } catch (err) {
      console.error('Failed to seed FAQs:', err);
      showMessage('error', t('faqSeedFailed'));
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('faqManagement')}
          </h2>
          <div className="flex gap-2">
            {faqs.length === 0 && (
              <button
                onClick={handleSeedFaqs}
                disabled={saving}
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
                      {t('questionKa')}
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
                      {t('questionEn')}
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
                      {t('answerKa')}
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
                      {t('answerEn')}
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
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveFaq}
                  disabled={saving}
                  className="px-4 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] disabled:opacity-50"
                >
                  {saving ? t('saving') : t('save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAQ List */}
        {faqs.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noFaqs')}</p>
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
                          {t('inactive')}
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
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(faq._id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
