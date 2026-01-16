'use client';

import { useState, useEffect, memo, createContext, useContext, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Link } from '../../../i18n/routing';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { Role } from '@sellit/constants';
import { api } from '../../../lib/api';

// ============================================================================
// Types
// ============================================================================

export interface VehicleShippingConfig {
  ratePerMinute: number;
  minimumFee: number;
  maxWeight: number;
  maxDimension: number;
}

export interface SiteSettings {
  // Commission
  siteCommissionRate: number;
  // Shipping
  bikeShipping: VehicleShippingConfig;
  carShipping: VehicleShippingConfig;
  suvShipping: VehicleShippingConfig;
  vanShipping: VehicleShippingConfig;
  defaultDeliveryRatePerMinute: number;
  minimumDeliveryFee: number;
  deliveryFeePrecision: number;
  // Subdomain
  freeSubdomainChanges: number;
  subdomainChangePrice: number;
  // Courier
  courierEarningsPercentage: number;
  // Withdrawal
  minimumWithdrawalAmount: number;
  withdrawalFee: number;
  // Contact (moved from Platform)
  supportEmail: string;
  supportPhone: string;
  // Features
  allowStoreRegistrations: boolean;
  allowCourierRegistrations: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface FaqItem {
  _id: string;
  questionKa: string;
  questionEn: string;
  answerKa: string;
  answerEn: string;
  category: string;
  order: number;
  isActive: boolean;
}

export interface AboutContent {
  missionKa: string;
  missionEn: string;
  storyKa: string;
  storyEn: string;
}

export interface ContactContent {
  address: string;
  workingHours: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface LegalContent {
  contentKa: string;
  contentEn: string;
  lastUpdated?: string;
}

// ============================================================================
// Context for sharing settings state
// ============================================================================

interface SettingsContextType {
  settings: SiteSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
  loading: boolean;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  success: boolean;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  handleSave: () => Promise<void>;
  updateSetting: <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => void;
  updateShipping: (
    type: 'bikeShipping' | 'carShipping' | 'suvShipping' | 'vanShipping',
    field: keyof VehicleShippingConfig,
    value: number
  ) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsLayout');
  }
  return context;
}

// ============================================================================
// Reusable Form Components
// ============================================================================

export const InputField = memo(function InputField({
  label,
  value,
  onChange,
  type = 'number',
  suffix,
  min,
  max,
  step,
  helperText,
  placeholder,
}: {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
  type?: 'number' | 'text' | 'email' | 'url';
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  helperText?: string;
  placeholder?: string;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (type === 'number') {
      if (newValue === '' || newValue === '-' || newValue.endsWith('.')) {
        return;
      }
      const parsed = parseFloat(newValue);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    } else {
      onChange(newValue);
    }
  };

  const handleBlur = () => {
    if (type === 'number') {
      const parsed = parseFloat(localValue);
      if (!isNaN(parsed)) {
        onChange(parsed);
        setLocalValue(String(parsed));
      } else {
        setLocalValue(String(value));
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
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
});

export const ToggleField = memo(function ToggleField({
  label,
  checked,
  onChange,
  helperText,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helperText?: string;
}) {
  return (
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
});

export const ShippingCard = memo(function ShippingCard({
  title,
  icon,
  settings,
  onUpdate,
  t,
}: {
  title: string;
  icon: string;
  settings: VehicleShippingConfig;
  onUpdate: (field: keyof VehicleShippingConfig, value: number) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label={t('ratePerMinute')}
          value={settings.ratePerMinute}
          onChange={(v) => onUpdate('ratePerMinute', v as number)}
          suffix="₾/min"
          step={0.1}
          min={0}
        />
        <InputField
          label={t('minimumFee')}
          value={settings.minimumFee}
          onChange={(v) => onUpdate('minimumFee', v as number)}
          suffix="₾"
          min={0}
        />
        <InputField
          label={t('maxWeight')}
          value={settings.maxWeight}
          onChange={(v) => onUpdate('maxWeight', v as number)}
          suffix="kg"
          min={0}
        />
        <InputField
          label={t('maxDimension')}
          value={settings.maxDimension}
          onChange={(v) => onUpdate('maxDimension', v as number)}
          suffix="cm"
          min={0}
        />
      </div>
    </div>
  );
});

export const SectionCard = memo(function SectionCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 ${className}`}>
      {children}
    </div>
  );
});

export const SectionTitle = memo(function SectionTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
      {children}
    </h3>
  );
});

// ============================================================================
// Settings Layout Component
// ============================================================================

interface Tab {
  id: string;
  labelKey: string;
  href: string;
}

const TABS: Tab[] = [
  { id: 'commission', labelKey: 'commissionSettings', href: '/dashboard/admin/settings/commission' },
  { id: 'shipping', labelKey: 'shippingSettings', href: '/dashboard/admin/settings/shipping' },
  { id: 'contact', labelKey: 'contactSettings', href: '/dashboard/admin/settings/contact' },
  { id: 'features', labelKey: 'featureFlags', href: '/dashboard/admin/settings/features' },
  { id: 'faq', labelKey: 'faqManagement', href: '/dashboard/admin/settings/faq' },
  { id: 'about', labelKey: 'aboutManagement', href: '/dashboard/admin/settings/about' },
  { id: 'terms', labelKey: 'termsManagement', href: '/dashboard/admin/settings/terms' },
  { id: 'privacy', labelKey: 'privacyManagement', href: '/dashboard/admin/settings/privacy' },
];

function SettingsLayoutContent({ children }: { children: ReactNode }) {
  const t = useTranslations('admin');
  const pathname = usePathname();
  
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch settings on mount
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
    } catch (err: unknown) {
      console.error('Failed to fetch settings:', err);
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(message);
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
      const cleanSettings = {
        siteCommissionRate: settings.siteCommissionRate,
        bikeShipping: settings.bikeShipping,
        carShipping: settings.carShipping,
        suvShipping: settings.suvShipping,
        vanShipping: settings.vanShipping,
        defaultDeliveryRatePerMinute: settings.defaultDeliveryRatePerMinute,
        minimumDeliveryFee: settings.minimumDeliveryFee,
        deliveryFeePrecision: settings.deliveryFeePrecision,
        freeSubdomainChanges: settings.freeSubdomainChanges,
        subdomainChangePrice: settings.subdomainChangePrice,
        courierEarningsPercentage: settings.courierEarningsPercentage,
        minimumWithdrawalAmount: settings.minimumWithdrawalAmount,
        withdrawalFee: settings.withdrawalFee,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        allowStoreRegistrations: settings.allowStoreRegistrations,
        allowCourierRegistrations: settings.allowCourierRegistrations,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      };

      const response = await api.put('/admin/settings', cleanSettings);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Failed to save settings:', err);
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
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

  // Get current tab from pathname
  const currentTab = TABS.find((tab) => pathname.includes(tab.id))?.id || 'commission';

  // Show save button only for settings-related tabs (not content tabs)
  const isSettingsTab = ['commission', 'shipping', 'contact', 'features'].includes(currentTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-500)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSettings,
        loading,
        saving,
        setSaving,
        error,
        setError,
        success,
        setSuccess,
        handleSave,
        updateSetting,
        updateShipping,
      }}
    >
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
          {isSettingsTab && settings && (
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
          )}
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
        <div className="border-b border-gray-200 dark:border-zinc-700 overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  currentTab === tab.id
                    ? 'border-[var(--accent-500)] text-[var(--accent-600)] dark:text-[var(--accent-400)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {t(tab.labelKey)}
              </Link>
            ))}
          </nav>
        </div>

        {/* Content - Error state */}
        {!settings && error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error || 'Settings not found'}</p>
          </div>
        )}

        {/* Content - Loaded */}
        {settings && children}
      </div>
    </SettingsContext.Provider>
  );
}

export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <SettingsLayoutContent>{children}</SettingsLayoutContent>
    </ProtectedRoute>
  );
}
