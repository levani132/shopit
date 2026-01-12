'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface Address {
  _id: string;
  label?: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const t = useTranslations('dashboard');
  const tCheckout = useTranslations('checkout');
  const { user, isLoading: authLoading } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    label: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Georgia',
    phoneNumber: '',
    isDefault: false,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAddresses = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/addresses`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setAddresses(data);
        }
      } catch (err) {
        console.error('Error fetching addresses:', err);
        setError('Failed to load addresses');
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [authLoading, user]);

  const openModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        label: address.label || '',
        address: address.address,
        city: address.city,
        postalCode: address.postalCode || '',
        country: address.country,
        phoneNumber: address.phoneNumber,
        isDefault: address.isDefault,
      });
    } else {
      setEditingAddress(null);
      setFormData({
        label: '',
        address: '',
        city: '',
        postalCode: '',
        country: 'Georgia',
        phoneNumber: '',
        isDefault: addresses.length === 0,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
    setFormData({
      label: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Georgia',
      phoneNumber: '',
      isDefault: false,
    });
  };

  const handleSave = async () => {
    if (!formData.address || !formData.city || !formData.phoneNumber) {
      return;
    }

    setIsSaving(true);
    try {
      const url = editingAddress
        ? `${API_URL}/api/v1/auth/addresses/${editingAddress._id}`
        : `${API_URL}/api/v1/auth/addresses`;

      const response = await fetch(url, {
        method: editingAddress ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (editingAddress) {
          setAddresses((prev) =>
            prev.map((a) => (a._id === editingAddress._id ? data : a)),
          );
        } else {
          setAddresses((prev) => [...prev, data]);
        }
        closeModal();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to save address');
      }
    } catch (err) {
      console.error('Error saving address:', err);
      setError('Failed to save address');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setAddresses((prev) => prev.filter((a) => a._id !== id));
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete address');
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      setError('Failed to delete address');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/addresses/${id}/default`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setAddresses((prev) =>
          prev.map((a) => ({ ...a, isDefault: a._id === id })),
        );
      }
    } catch (err) {
      console.error('Error setting default address:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('addresses')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('addressesDescription')}
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          {t('addAddress')}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('noAddresses')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('noAddressesDescription')}
          </p>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('addAddress')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <div
              key={address._id}
              className={`bg-white dark:bg-zinc-800 rounded-xl border p-6 ${
                address.isDefault
                  ? 'border-indigo-500 dark:border-indigo-400'
                  : 'border-gray-200 dark:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {address.label || tCheckout('shippingAddress')}
                    </h3>
                    {address.isDefault && (
                      <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded">
                        {t('default')}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {address.address}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {address.city}
                    {address.postalCode && `, ${address.postalCode}`},{' '}
                    {address.country}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 mt-1">
                    📞 {address.phoneNumber}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address._id)}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {t('setAsDefault')}
                    </button>
                  )}
                  <button
                    onClick={() => openModal(address)}
                    className="px-3 py-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(address._id)}
                    disabled={!!deletingId}
                    className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {deletingId === address._id ? '...' : t('delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingAddress ? t('editAddress') : t('addAddress')}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('label')}
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                  placeholder="Home, Work, etc."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tCheckout('fullAddress')} *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {tCheckout('city')} *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {tCheckout('postalCode')}
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tCheckout('phone')} *
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('setAsDefault')}
                </span>
              </label>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-zinc-700 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? '...' : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

