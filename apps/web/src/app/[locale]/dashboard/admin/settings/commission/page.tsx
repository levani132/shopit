'use client';

import { useTranslations } from 'next-intl';
import {
  useSettings,
  InputField,
  SectionCard,
  SectionTitle,
} from '../../../../../../components/dashboard/admin/SettingsLayout';

export default function CommissionSettingsPage() {
  const t = useTranslations('admin');
  const { settings, updateSetting } = useSettings();

  if (!settings) return null;

  return (
    <SectionCard className="space-y-6">
      <SectionTitle>{t('siteCommission')}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label={t('siteCommissionRate')}
          value={(settings.siteCommissionRate * 100).toFixed(0)}
          onChange={(v) =>
            updateSetting('siteCommissionRate', (v as number) / 100)
          }
          suffix="%"
          min={0}
          max={100}
          helperText={t('siteCommissionRateHelp')}
        />
      </div>

      <SectionTitle className="pt-4">{t('courierSettings')}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label={t('courierEarningsPercentage')}
          value={(settings.courierEarningsPercentage * 100).toFixed(0)}
          onChange={(v) =>
            updateSetting('courierEarningsPercentage', (v as number) / 100)
          }
          suffix="%"
          min={0}
          max={100}
          helperText={t('courierEarningsPercentageHelp')}
        />
      </div>

      <SectionTitle className="pt-4">{t('withdrawalSettings')}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label={t('minimumWithdrawalAmount')}
          value={settings.minimumWithdrawalAmount}
          onChange={(v) =>
            updateSetting('minimumWithdrawalAmount', v as number)
          }
          suffix="₾"
          min={0}
        />
        <InputField
          label={t('withdrawalFee')}
          value={settings.withdrawalFee}
          onChange={(v) => updateSetting('withdrawalFee', v as number)}
          suffix="₾"
          min={0}
        />
      </div>

      <SectionTitle className="pt-4">{t('subdomainSettings')}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label={t('freeSubdomainChanges')}
          value={settings.freeSubdomainChanges}
          onChange={(v) => updateSetting('freeSubdomainChanges', v as number)}
          min={0}
          helperText={t('freeSubdomainChangesHelp')}
        />
        <InputField
          label={t('subdomainChangePrice')}
          value={settings.subdomainChangePrice}
          onChange={(v) => updateSetting('subdomainChangePrice', v as number)}
          suffix="₾"
          min={0}
          helperText={t('subdomainChangePriceHelp')}
        />
      </div>
    </SectionCard>
  );
}
