'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import { Role, hasRole } from '@shopit/constants';
import {
  GEORGIAN_BANKS,
  detectBankFromIban,
  isValidGeorgianIban,
} from '../../../../utils/georgian-banks';
import { api } from '../../../../lib/api';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  identificationNumber?: string;
  accountNumber?: string;
  beneficiaryBankCode?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export default function ProfilePage() {
  const t = useTranslations('dashboard');
  const tRegister = useTranslations('register');
  const { user, refreshAuth } = useAuth();

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');

  // Bank info
  const [accountNumber, setAccountNumber] = useState('');
  const [beneficiaryBankCode, setBeneficiaryBankCode] = useState('');

  // Courier info
  const [vehicleType, setVehicleType] = useState('');
  const [workingAreas, setWorkingAreas] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingCourier, setIsSavingCourier] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhoneNumber(user.phoneNumber || '');
      setIdentificationNumber(user.identificationNumber || '');
      setAccountNumber(user.accountNumber || '');
      setBeneficiaryBankCode(user.beneficiaryBankCode || '');
      setVehicleType(user.vehicleType || '');
      setWorkingAreas((user.workingAreas || []).join(', '));
    }
  }, [user]);

  const isCourier = hasRole(user?.role ?? 0, Role.COURIER);
  const isSeller = hasRole(user?.role ?? 0, Role.SELLER);
  const isAdmin = hasRole(user?.role ?? 0, Role.ADMIN);
  const [isDeletingStore, setIsDeletingStore] = useState(false);
  const [isDeletingCourierRole, setIsDeletingCourierRole] = useState(false);

  const handleDeleteStore = async () => {
    if (!confirm(t('deleteStoreConfirm'))) {
      return;
    }

    setIsDeletingStore(true);
    try {
      await api.delete('/api/v1/stores/my-store');

      await refreshAuth();
      showSuccess('Store deleted successfully');
      // Redirect to home or show a message
      window.location.href = '/';
    } catch (err) {
      console.error('Error deleting store:', err);
      const message = err instanceof Error && 'message' in err ? (err as any).message : 'Failed to delete store';
      setErrors({ general: message });
    } finally {
      setIsDeletingStore(false);
    }
  };

  const handleDeleteCourierRole = async () => {
    if (!confirm(t('removeCourierConfirm'))) {
      return;
    }

    setIsDeletingCourierRole(true);
    try {
      await api.delete('/api/v1/auth/courier/remove');

      await refreshAuth();
      showSuccess('Courier account removed successfully');
      window.location.href = '/';
    } catch (err) {
      console.error('Error removing courier role:', err);
      const message = err instanceof Error && 'message' in err ? (err as any).message : 'Failed to remove courier role';
      setErrors({ general: message });
    } finally {
      setIsDeletingCourierRole(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleIbanChange = (iban: string) => {
    setAccountNumber(iban.toUpperCase());
    const bankCode = detectBankFromIban(iban);
    if (bankCode) {
      setBeneficiaryBankCode(bankCode);
    }
  };

  const validatePersonalInfo = (): boolean => {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = tRegister('firstNameRequired');
    }
    if (!lastName.trim()) {
      newErrors.lastName = tRegister('lastNameRequired');
    }
    // Validate Georgian phone: +995XXXXXXXXX, 995XXXXXXXXX, or 5XXXXXXXX
    if (phoneNumber) {
      const cleaned = phoneNumber.replace(/[\s\-()]/g, '');
      const isValid =
        /^\+995[5]\d{8}$/.test(cleaned) || // +995 5XX XXX XXX
        /^995[5]\d{8}$/.test(cleaned) || // 995 5XX XXX XXX
        /^5\d{8}$/.test(cleaned); // 5XX XXX XXX (local)
      if (!isValid) {
        newErrors.phoneNumber = tRegister('phoneInvalid');
      }
    }
    if (identificationNumber && identificationNumber.length !== 11) {
      newErrors.identificationNumber = tRegister('idNumberInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBankInfo = (): boolean => {
    const newErrors: FormErrors = {};

    if (accountNumber && !isValidGeorgianIban(accountNumber)) {
      newErrors.accountNumber = tRegister('ibanInvalid');
    }
    if (accountNumber && !beneficiaryBankCode) {
      newErrors.beneficiaryBankCode = tRegister('bankRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (): boolean => {
    const newErrors: FormErrors = {};

    if (!currentPassword) {
      newErrors.currentPassword = t('currentPasswordRequired');
    }
    if (!newPassword) {
      newErrors.newPassword = t('newPasswordRequired');
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t('passwordMinLength');
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSavePersonalInfo = async () => {
    if (!validatePersonalInfo()) return;

    setIsSavingPersonal(true);
    setErrors({});

    try {
      await api.patch('/api/v1/auth/me', {
        firstName,
        lastName,
        phoneNumber: phoneNumber || undefined,
        identificationNumber: identificationNumber || undefined,
      });

      await refreshAuth();
      showSuccess('Personal information updated successfully!');
    } catch (err) {
      const message = err instanceof Error && 'message' in err ? (err as any).message : 'Failed to update profile';
      setErrors({ general: message });
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleSaveBankInfo = async () => {
    if (!validateBankInfo()) return;

    setIsSavingBank(true);
    setErrors({});

    try {
      await api.patch('/api/v1/auth/me', {
        accountNumber: accountNumber || undefined,
        beneficiaryBankCode: beneficiaryBankCode || undefined,
      });

      await refreshAuth();
      showSuccess('Banking information updated successfully!');
    } catch (err) {
      const message = err instanceof Error && 'message' in err ? (err as any).message : 'Failed to update banking info';
      setErrors({ general: message });
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSaveCourierInfo = async () => {
    setIsSavingCourier(true);
    setErrors({});

    try {
      const areasArray = workingAreas
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a);

      await api.patch('/api/v1/auth/me', {
        vehicleType: vehicleType || undefined,
        workingAreas: areasArray.length > 0 ? areasArray : undefined,
      });

      await refreshAuth();
      showSuccess('Courier information updated successfully!');
    } catch (err) {
      const message = err instanceof Error && 'message' in err ? (err as any).message : 'Failed to save courier information';
      setErrors({ general: message });
    } finally {
      setIsSavingCourier(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setIsSavingPassword(true);
    setErrors({});

    try {
      await api.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Password changed successfully!');
    } catch (err) {
      const message = err instanceof Error && 'message' in err ? (err as any).message : 'Failed to change password';
      setErrors({ general: message });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const isGoogleUser = user?.authProvider === 'GOOGLE';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {t('profile')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('profileDescription')}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* General Error */}
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {errors.general}
        </div>
      )}

      <div className="space-y-6">
        {/* Account Info (read-only) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('account')}
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-500)] flex items-center justify-center text-white font-bold text-2xl">
              {firstName?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() ||
                '?'}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {user?.email}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isGoogleUser ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    {t('signedInWithGoogle')}
                  </span>
                ) : (
                  t('emailAccount')
                )}
              </p>
              {user?.isProfileComplete && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t('profileComplete')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {tRegister('personalInformation')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tRegister('firstName')} *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={tRegister('enterFirstName')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tRegister('lastName')} *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={tRegister('enterLastName')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tRegister('phoneNumber')}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="5XX XXX XXX"
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition"
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tRegister('idNumber')}
              </label>
              <input
                type="text"
                value={identificationNumber}
                onChange={(e) =>
                  setIdentificationNumber(
                    e.target.value.replace(/\D/g, '').slice(0, 11),
                  )
                }
                placeholder="01234567890"
                maxLength={11}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition"
              />
              {errors.identificationNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.identificationNumber}
                </p>
              )}
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                {tRegister('idNumberHint')}
              </p>
            </div>
          </div>

          <button
            onClick={handleSavePersonalInfo}
            disabled={isSavingPersonal}
            className="px-6 py-2.5 bg-[var(--accent-500)] text-white rounded-lg hover:bg-[var(--accent-600)] transition-colors disabled:opacity-50"
          >
            {isSavingPersonal ? t('saving') : t('savePersonalInfo')}
          </button>
        </div>

        {/* Banking Information - Only for sellers and couriers */}
        {(isSeller || isCourier || isAdmin) && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {tRegister('bankInformation')}
            </h2>

            {/* Hidden decoy fields to prevent browser autofill on IBAN */}
            <div
              style={{
                position: 'absolute',
                opacity: 0,
                height: 0,
                overflow: 'hidden',
              }}
              aria-hidden="true"
            >
              <input
                type="text"
                name="fake_username_field"
                tabIndex={-1}
                autoComplete="username"
              />
              <input
                type="email"
                name="fake_email_field"
                tabIndex={-1}
                autoComplete="email"
              />
              <input
                type="password"
                name="fake_password_field"
                tabIndex={-1}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tRegister('iban')}
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => handleIbanChange(e.target.value)}
                  placeholder="GE29TB7777777777777777"
                  maxLength={22}
                  name="iban_account_ge"
                  id="iban_account_ge"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  aria-autocomplete="none"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition font-mono uppercase"
                />
                {errors.accountNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.accountNumber}
                  </p>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  {tRegister('ibanHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tRegister('bank')}
                </label>
                <select
                  value={beneficiaryBankCode}
                  onChange={(e) => setBeneficiaryBankCode(e.target.value)}
                  disabled={!!detectBankFromIban(accountNumber)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition disabled:opacity-60"
                >
                  <option value="">{tRegister('selectBank')}</option>
                  {GEORGIAN_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name} ({bank.nameEn})
                    </option>
                  ))}
                </select>
                {errors.beneficiaryBankCode && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.beneficiaryBankCode}
                  </p>
                )}
                {detectBankFromIban(accountNumber) && (
                  <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                    ✓ {tRegister('bankDetectedAutomatically')}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleSaveBankInfo}
              disabled={isSavingBank}
              className="px-6 py-2.5 bg-[var(--accent-500)] text-white rounded-lg hover:bg-[var(--accent-600)] transition-colors disabled:opacity-50"
            >
              {isSavingBank ? t('saving') : t('saveBankingInfo')}
            </button>
          </div>
        )}

        {/* Security - Only for email users */}
        {!isGoogleUser && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('security')}
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('currentPassword')}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('enterCurrentPassword')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition"
                />
                {errors.currentPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('newPassword')}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('enterNewPassword')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition"
                  />
                  {errors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('confirmNewPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirmNewPasswordPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={isSavingPassword}
              className="px-6 py-2.5 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isSavingPassword ? t('changingPassword') : t('changePassword')}
            </button>
          </div>
        )}

        {/* Courier Settings - Only for couriers */}
        {isCourier && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('courierSettings')}
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('vehicleType')}
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition"
                >
                  <option value="">{t('selectVehicleType')}</option>
                  <option value="walking">🚶 {t('vehicleWalking')}</option>
                  <option value="bicycle">🚲 {t('vehicleBicycle')}</option>
                  <option value="motorcycle">
                    🏍️ {t('vehicleMotorcycle')}
                  </option>
                  <option value="car">🚗 {t('vehicleCar')}</option>
                  <option value="suv">🚙 {t('vehicleSuv')}</option>
                  <option value="van">🚐 {t('vehicleVan')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('workingAreas')}
                </label>
                <input
                  type="text"
                  value={workingAreas}
                  onChange={(e) => setWorkingAreas(e.target.value)}
                  placeholder={t('workingAreasPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('workingAreasHint')}
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveCourierInfo}
              disabled={isSavingCourier}
              className="px-6 py-2.5 bg-[var(--accent-500)] text-white rounded-lg hover:bg-[var(--accent-600)] transition-colors disabled:opacity-50"
            >
              {isSavingCourier ? t('saving') : t('saveCourierSettings')}
            </button>
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            {t('dangerZone')}
          </h2>
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">
            {t('dangerZoneDescription')}
          </p>
          <div className="flex flex-wrap gap-3">
            {isSeller && (
              <button
                onClick={handleDeleteStore}
                disabled={isDeletingStore}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeletingStore ? t('deletingStore') : t('deleteStore')}
              </button>
            )}
            {isCourier && (
              <button
                onClick={handleDeleteCourierRole}
                disabled={isDeletingCourierRole}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeletingCourierRole
                  ? t('removingCourierAccount')
                  : t('removeCourierAccount')}
              </button>
            )}
            <button
              onClick={() => {
                if (confirm(t('deleteAccountConfirm'))) {
                  // TODO: Implement account deletion
                  alert('Account deletion is not yet implemented.');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {t('deleteAccount')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
