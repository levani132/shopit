'use client';

import {
  useState,
  useEffect,
  memo,
  createContext,
  useContext,
  ReactNode,
} from 'react';
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
  updateSetting: <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) => void;
  updateShipping: (
    type: 'bikeShipping' | 'carShipping' | 'suvShipping' | 'vanShipping',
    field: keyof VehicleShippingConfig,
    value: number,
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
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
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
    <div
      className={`bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 ${className}`}
    >
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
    <h3
      className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}
    >
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
  icon: ReactNode;
}

const TABS: Tab[] = [
  {
    id: 'commission',
    labelKey: 'commissionSettings',
    href: '/dashboard/admin/settings/commission',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'shipping',
    labelKey: 'shippingSettings',
    href: '/dashboard/admin/settings/shipping',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
        />
      </svg>
    ),
  },
  {
    id: 'contact',
    labelKey: 'contactSettings',
    href: '/dashboard/admin/settings/contact',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: 'features',
    labelKey: 'featureFlags',
    href: '/dashboard/admin/settings/features',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    id: 'faq',
    labelKey: 'faqManagement',
    href: '/dashboard/admin/settings/faq',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'about',
    labelKey: 'aboutManagement',
    href: '/dashboard/admin/settings/about',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'terms',
    labelKey: 'termsManagement',
    href: '/dashboard/admin/settings/terms',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    id: 'privacy',
    labelKey: 'privacyManagement',
    href: '/dashboard/admin/settings/privacy',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
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
        const message =
          err instanceof Error ? err.message : 'Failed to fetch settings';
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
      const message =
        err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const updateShipping = (
    type: 'bikeShipping' | 'carShipping' | 'suvShipping' | 'vanShipping',
    field: keyof VehicleShippingConfig,
    value: number,
  ) => {
    if (settings) {
      setSettings({
        ...settings,
        [type]: { ...settings[type], [field]: value },
      });
    }
  };

  // Get current tab from pathname
  const currentTab =
    TABS.find((tab) => pathname.includes(tab.id))?.id || 'commission';

  // Show save button only for settings-related tabs (not content tabs)
  const isSettingsTab = [
    'commission',
    'shipping',
    'contact',
    'features',
  ].includes(currentTab);

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
            <p className="text-green-600 dark:text-green-400">
              {t('settingsSaved')}
            </p>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-zinc-700">
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                title={t(tab.labelKey)}
                className={`pb-3 px-4 border-b-2 transition-colors ${
                  currentTab === tab.id
                    ? 'border-[var(--accent-500)] text-[var(--accent-600)] dark:text-[var(--accent-400)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
              </Link>
            ))}
          </nav>
        </div>

        {/* Content - Error state */}
        {!settings && error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">
              {error || 'Settings not found'}
            </p>
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
