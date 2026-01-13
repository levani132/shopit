'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { api } from '../../../../../lib/api';

interface VehicleShippingConfig {
  ratePerMinute: number;
  minimumFee: number;
  maxWeight: number;
  maxDimension: number;
}

interface SiteSettings {
  siteCommissionRate: number;
  sellerCourierFee: number;
  deliveryCommissionRate: number;
  deliveryCommissionMin: number;
  deliveryCommissionMax: number;
  bikeShipping: VehicleShippingConfig;
  carShipping: VehicleShippingConfig;
  suvShipping: VehicleShippingConfig;
  vanShipping: VehicleShippingConfig;
  defaultDeliveryRatePerMinute: number;
  minimumDeliveryFee: number;
  deliveryFeePrecision: number;
  subdomainChangePrice: number;
  courierEarningsPerDelivery: number;
  courierEarningsIsPercentage: boolean;
  minimumWithdrawalAmount: number;
  withdrawalFee: number;
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  allowStoreRegistrations: boolean;
  allowCourierRegistrations: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

function SiteSettingsContent() {
  const t = useTranslations('admin');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'commission' | 'shipping' | 'platform' | 'features'>('commission');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await api.get('/admin/settings');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch settings');
        }
        const data = await response.json();
        setSettings(data.settings);
      } catch (err: any) {
        console.error('Failed to fetch settings:', err);
        setError(err.message || 'Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api.put('/admin/settings', settings);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const updateShipping = (
    type: 'bikeShipping' | 'carShipping' | 'suvShipping' | 'vanShipping',
    field: keyof VehicleShippingConfig,
    value: number
  ) => {
    if (settings) {
      setSettings({
        ...settings,
        [type]: { ...settings[type], [field]: value },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-500)] border-t-transparent"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error || 'Settings not found'}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'commission', label: t('commissionSettings') },
    { id: 'shipping', label: t('shippingSettings') },
    { id: 'platform', label: t('platformSettings') },
    { id: 'features', label: t('featureFlags') },
  ];

  const InputField = ({
    label,
    value,
    onChange,
    type = 'number',
    suffix,
    min,
    max,
    step,
    helperText,
  }: {
    label: string;
    value: number | string;
    onChange: (value: number | string) => void;
    type?: 'number' | 'text';
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
    helperText?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) =>
            onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)
          }
          min={min}
          max={max}
          step={step}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
        />
        {suffix && (
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {suffix}
          </span>
        )}
      </div>
      {helperText && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );

  const ToggleField = ({
    label,
    checked,
    onChange,
    helperText,
  }: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    helperText?: string;
  }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {helperText && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[var(--accent-500)]' : 'bg-gray-200 dark:bg-zinc-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const ShippingCard = ({
    title,
    type,
    icon,
  }: {
    title: string;
    type: 'bikeShipping' | 'carShipping' | 'suvShipping' | 'vanShipping';
    icon: string;
  }) => (
    <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label={t('ratePerMinute')}
          value={settings[type].ratePerMinute}
          onChange={(v) => updateShipping(type, 'ratePerMinute', v as number)}
          suffix="₾/min"
          step={0.1}
          min={0}
        />
        <InputField
          label={t('minimumFee')}
          value={settings[type].minimumFee}
          onChange={(v) => updateShipping(type, 'minimumFee', v as number)}
          suffix="₾"
          min={0}
        />
        <InputField
          label={t('maxWeight')}
          value={settings[type].maxWeight}
          onChange={(v) => updateShipping(type, 'maxWeight', v as number)}
          suffix="kg"
          min={0}
        />
        <InputField
          label={t('maxDimension')}
          value={settings[type].maxDimension}
          onChange={(v) => updateShipping(type, 'maxDimension', v as number)}
          suffix="cm"
          min={0}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('siteSettingsTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('siteSettingsDescription')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {t('saveSettings')}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{t('settingsSaved')}</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-700">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--accent-500)] text-[var(--accent-600)] dark:text-[var(--accent-400)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Commission Settings */}
      {activeTab === 'commission' && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('commissionRates')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label={t('siteCommissionRate')}
              value={(settings.siteCommissionRate * 100).toFixed(0)}
              onChange={(v) => updateSetting('siteCommissionRate', (v as number) / 100)}
              suffix="%"
              min={0}
              max={100}
              helperText={t('siteCommissionRateHelp')}
            />
            <InputField
              label={t('sellerCourierFee')}
              value={settings.sellerCourierFee}
              onChange={(v) => updateSetting('sellerCourierFee', v as number)}
              suffix="₾"
              min={0}
              helperText={t('sellerCourierFeeHelp')}
            />
            <InputField
              label={t('deliveryCommissionRate')}
              value={(settings.deliveryCommissionRate * 100).toFixed(0)}
              onChange={(v) => updateSetting('deliveryCommissionRate', (v as number) / 100)}
              suffix="%"
              min={0}
              max={100}
            />
            <InputField
              label={t('deliveryCommissionMin')}
              value={settings.deliveryCommissionMin}
              onChange={(v) => updateSetting('deliveryCommissionMin', v as number)}
              suffix="₾"
              min={0}
            />
            <InputField
              label={t('deliveryCommissionMax')}
              value={settings.deliveryCommissionMax}
              onChange={(v) => updateSetting('deliveryCommissionMax', v as number)}
              suffix="₾"
              min={0}
            />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white pt-4">
            {t('withdrawalSettings')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label={t('minimumWithdrawalAmount')}
              value={settings.minimumWithdrawalAmount}
              onChange={(v) => updateSetting('minimumWithdrawalAmount', v as number)}
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

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white pt-4">
            {t('otherPricing')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label={t('subdomainChangePrice')}
              value={settings.subdomainChangePrice}
              onChange={(v) => updateSetting('subdomainChangePrice', v as number)}
              suffix="₾"
              min={0}
              helperText={t('subdomainChangePriceHelp')}
            />
            <InputField
              label={t('courierEarningsPerDelivery')}
              value={settings.courierEarningsPerDelivery}
              onChange={(v) => updateSetting('courierEarningsPerDelivery', v as number)}
              suffix={settings.courierEarningsIsPercentage ? '%' : '₾'}
              min={0}
            />
          </div>
        </div>
      )}

      {/* Shipping Settings */}
      {activeTab === 'shipping' && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('deliveryFeeSettings')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InputField
              label={t('defaultRatePerMinute')}
              value={settings.defaultDeliveryRatePerMinute}
              onChange={(v) => updateSetting('defaultDeliveryRatePerMinute', v as number)}
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

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white pt-4">
            {t('vehicleShippingRates')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('vehicleShippingRatesHelp')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ShippingCard title={t('bikeMotorcycle')} type="bikeShipping" icon="🏍️" />
            <ShippingCard title={t('car')} type="carShipping" icon="🚗" />
            <ShippingCard title={t('suv')} type="suvShipping" icon="🚙" />
            <ShippingCard title={t('vanTruck')} type="vanShipping" icon="🚛" />
          </div>
        </div>
      )}

      {/* Platform Settings */}
      {activeTab === 'platform' && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('platformInfo')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label={t('platformName')}
              value={settings.platformName}
              onChange={(v) => updateSetting('platformName', v as string)}
              type="text"
            />
            <InputField
              label={t('supportEmail')}
              value={settings.supportEmail}
              onChange={(v) => updateSetting('supportEmail', v as string)}
              type="text"
            />
            <InputField
              label={t('supportPhone')}
              value={settings.supportPhone}
              onChange={(v) => updateSetting('supportPhone', v as string)}
              type="text"
            />
          </div>
        </div>
      )}

      {/* Feature Flags */}
      {activeTab === 'features' && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('featureFlags')}
          </h3>
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
                onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SiteSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <SiteSettingsContent />
    </ProtectedRoute>
  );
}

