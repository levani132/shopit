'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  useSettings,
  InputField,
  SectionCard,
  SectionTitle,
  ContactContent,
} from '../../../../../../components/dashboard/admin/SettingsLayout';
import { api } from '../../../../../../lib/api';

export default function ContactSettingsPage() {
  const t = useTranslations('admin');
  const { settings, updateSetting, handleSave, saving } = useSettings();

  // Contact content state (address, working hours, social links)
  const [contact, setContact] = useState<ContactContent>({
    address: '',
    workingHours: '',
    socialLinks: {},
  });
  const [contactLoading, setContactLoading] = useState(true);
  const [contactSaving, setContactSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Fetch contact content
  useEffect(() => {
    const fetchContact = async () => {
      try {
        const data = await api.get('/content/contact');
        setContact(data);
      } catch (error) {
        console.error('Failed to fetch contact:', error);
      } finally {
        setContactLoading(false);
      }
    };
    fetchContact();
  }, []);

  const handleSaveAll = async () => {
    // Save site settings (email, phone)
    await handleSave();

    // Save contact content
    setContactSaving(true);
    try {
      await api.put('/content/admin/contact', contact);
      setMessage({ type: 'success', text: t('settingsSaved') });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save contact:', err);
      setMessage({ type: 'error', text: t('saveFailed') });
    } finally {
      setContactSaving(false);
    }
  };

  if (!settings) return null;

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

      {/* Support Contact */}
      <SectionCard className="space-y-6">
        <SectionTitle>{t('supportContact')}</SectionTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('supportContactDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label={t('supportEmail')}
            value={settings.supportEmail}
            onChange={(v) => updateSetting('supportEmail', v as string)}
            type="email"
            placeholder="support@example.com"
          />
          <InputField
            label={t('supportPhone')}
            value={settings.supportPhone}
            onChange={(v) => updateSetting('supportPhone', v as string)}
            type="text"
            placeholder="+995 XXX XXX XXX"
          />
        </div>
      </SectionCard>

      {/* Address & Working Hours */}
      <SectionCard className="space-y-6">
        <SectionTitle>{t('addressAndHours')}</SectionTitle>
        {contactLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--accent-500)] border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label={t('contactAddress')}
              value={contact.address}
              onChange={(v) => setContact({ ...contact, address: v as string })}
              type="text"
              placeholder={t('addressPlaceholder')}
            />
            <InputField
              label={t('workingHours')}
              value={contact.workingHours}
              onChange={(v) =>
                setContact({ ...contact, workingHours: v as string })
              }
              type="text"
              placeholder="Mon-Fri: 9:00 - 18:00"
            />
          </div>
        )}
      </SectionCard>

      {/* Social Links */}
      <SectionCard className="space-y-6">
        <SectionTitle>{t('socialLinks')}</SectionTitle>
        {contactLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--accent-500)] border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InputField
              label={t('socialFacebook')}
              value={contact.socialLinks?.facebook || ''}
              onChange={(v) =>
                setContact({
                  ...contact,
                  socialLinks: {
                    ...contact.socialLinks,
                    facebook: v as string,
                  },
                })
              }
              type="url"
              placeholder="https://facebook.com/..."
            />
            <InputField
              label={t('socialInstagram')}
              value={contact.socialLinks?.instagram || ''}
              onChange={(v) =>
                setContact({
                  ...contact,
                  socialLinks: {
                    ...contact.socialLinks,
                    instagram: v as string,
                  },
                })
              }
              type="url"
              placeholder="https://instagram.com/..."
            />
            <InputField
              label={t('socialLinkedIn')}
              value={contact.socialLinks?.linkedin || ''}
              onChange={(v) =>
                setContact({
                  ...contact,
                  socialLinks: {
                    ...contact.socialLinks,
                    linkedin: v as string,
                  },
                })
              }
              type="url"
              placeholder="https://linkedin.com/..."
            />
          </div>
        )}
      </SectionCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveAll}
          disabled={saving || contactSaving}
          className="px-6 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {(saving || contactSaving) && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {t('saveSettings')}
        </button>
      </div>
    </div>
  );
}
