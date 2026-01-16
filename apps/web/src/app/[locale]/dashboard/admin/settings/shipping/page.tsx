'use client';

import { useTranslations } from 'next-intl';
import {
  useSettings,
  InputField,
  ShippingCard,
  SectionCard,
  SectionTitle,
} from '../../../../../../components/dashboard/admin/SettingsLayout';

export default function ShippingSettingsPage() {
  const t = useTranslations('admin');
  const { settings, updateSetting, updateShipping } = useSettings();

  if (!settings) return null;

  return (
    <SectionCard className="space-y-6">
      <SectionTitle>{t('deliveryFeeSettings')}</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InputField
          label={t('defaultRatePerMinute')}
          value={settings.defaultDeliveryRatePerMinute}
          onChange={(v) =>
            updateSetting('defaultDeliveryRatePerMinute', v as number)
          }
          suffix="₾/min"
          step={0.1}
          min={0}
        />
        <InputField
          label={t('minimumDeliveryFee')}
          value={settings.minimumDeliveryFee}
          onChange={(v) => updateSetting('minimumDeliveryFee', v as number)}
          suffix="₾"
          min={0}
        />
        <InputField
          label={t('deliveryFeePrecision')}
          value={settings.deliveryFeePrecision}
          onChange={(v) => updateSetting('deliveryFeePrecision', v as number)}
          suffix="₾"
          step={0.1}
          min={0.1}
          helperText={t('deliveryFeePrecisionHelp')}
        />
      </div>

      <SectionTitle className="pt-4">{t('vehicleShippingRates')}</SectionTitle>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('vehicleShippingRatesHelp')}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ShippingCard
          title={t('bikeMotorcycle')}
          icon="🏍️"
          settings={settings.bikeShipping}
          onUpdate={(field, value) =>
            updateShipping('bikeShipping', field, value)
          }
          t={t}
        />
        <ShippingCard
          title={t('car')}
          icon="🚗"
          settings={settings.carShipping}
          onUpdate={(field, value) =>
            updateShipping('carShipping', field, value)
          }
          t={t}
        />
        <ShippingCard
          title={t('suv')}
          icon="🚙"
          settings={settings.suvShipping}
          onUpdate={(field, value) =>
            updateShipping('suvShipping', field, value)
          }
          t={t}
        />
        <ShippingCard
          title={t('vanTruck')}
          icon="🚛"
          settings={settings.vanShipping}
          onUpdate={(field, value) =>
            updateShipping('vanShipping', field, value)
          }
          t={t}
        />
      </div>
    </SectionCard>
  );
}
