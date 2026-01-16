'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../../../../../i18n/routing';
import { useAuth } from '../../../../../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

type NotificationPreference = 'off' | 'important' | 'all';

interface NotificationSettings {
  inApp: NotificationPreference;
  email: NotificationPreference;
  push: NotificationPreference;
  hasPushSubscription: boolean;
}

export default function NotificationSettingsPage() {
  const t = useTranslations('notifications');
  const { isAuthenticated } = useAuth();

  const [settings, setSettings] = useState<NotificationSettings>({
    inApp: 'all',
    email: 'off',
    push: 'important',
    hasPushSubscription: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await fetch(
          `${API_URL}/api/v1/notifications/settings`,
          {
            credentials: 'include',
          },
        );

        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch notification settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [isAuthenticated]);

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!isAuthenticated) return;

    setSaving(true);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/notifications/settings`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setSuccessMessage(t('settingsSaved'));
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const PreferenceSelector = ({
    channel,
    value,
    disabled = false,
  }: {
    channel: 'inApp' | 'email' | 'push';
    value: NotificationPreference;
    disabled?: boolean;
  }) => (
    <div className="flex flex-col gap-2">
      {(['off', 'important', 'all'] as NotificationPreference[]).map((pref) => (
        <label
          key={pref}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            value === pref
              ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10'
              : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name={channel}
            value={pref}
            checked={value === pref}
            onChange={() => !disabled && updateSettings({ [channel]: pref })}
            disabled={disabled || saving}
            className="w-4 h-4 text-[var(--accent-500)] focus:ring-[var(--accent-500)] border-gray-300 dark:border-zinc-600"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">
              {t(`preference_${pref}`)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(`preference_${pref}_description`)}
            </p>
          </div>
        </label>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-zinc-700 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/notifications"
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('settingsTitle')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('settingsDescription')}
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-8">
        {/* In-App Notifications */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('channel_inApp')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('channel_inApp_description')}
              </p>
            </div>
          </div>
          <PreferenceSelector channel="inApp" value={settings.inApp} />
        </section>

        {/* Email Notifications */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('channel_email')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('channel_email_description')}
              </p>
            </div>
          </div>
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>TODO:</strong> {t('emailNotImplemented')}
            </p>
          </div>
          <PreferenceSelector channel="email" value={settings.email} />
        </section>

        {/* Push Notifications */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('channel_push')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('channel_push_description')}
              </p>
            </div>
          </div>
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>TODO:</strong> {t('pushNotImplemented')}
            </p>
          </div>
          <PreferenceSelector channel="push" value={settings.push} />
        </section>
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          {t('notificationTypesTitle')}
        </h4>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
            <span>
              <strong>{t('importantNotifications')}</strong>:{' '}
              {t('importantNotificationsDescription')}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
            <span>
              <strong>{t('promoNotifications')}</strong>:{' '}
              {t('promoNotificationsDescription')}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
