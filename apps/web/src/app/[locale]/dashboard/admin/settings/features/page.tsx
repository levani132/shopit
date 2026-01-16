'use client';

import { useTranslations } from 'next-intl';
import {
  useSettings,
  ToggleField,
  SectionCard,
  SectionTitle,
} from '../../../../../../components/dashboard/admin/SettingsLayout';

export default function FeaturesSettingsPage() {
  const t = useTranslations('admin');
  const { settings, updateSetting } = useSettings();

  if (!settings) return null;

  return (
    <SectionCard className="space-y-4">
      <SectionTitle className="mb-4">{t('featureFlags')}</SectionTitle>

      <ToggleField
        label={t('allowStoreRegistrations')}
        checked={settings.allowStoreRegistrations}
        onChange={(v) => updateSetting('allowStoreRegistrations', v)}
        helperText={t('allowStoreRegistrationsHelp')}
      />

      <ToggleField
        label={t('allowCourierRegistrations')}
        checked={settings.allowCourierRegistrations}
        onChange={(v) => updateSetting('allowCourierRegistrations', v)}
        helperText={t('allowCourierRegistrationsHelp')}
      />

      <ToggleField
        label={t('maintenanceMode')}
        checked={settings.maintenanceMode}
        onChange={(v) => updateSetting('maintenanceMode', v)}
        helperText={t('maintenanceModeHelp')}
      />

      {settings.maintenanceMode && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('maintenanceMessage')}
          </label>
          <textarea
            value={settings.maintenanceMessage}
            onChange={(e) =>
              updateSetting('maintenanceMessage', e.target.value)
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
          />
        </div>
      )}
    </SectionCard>
  );
}
