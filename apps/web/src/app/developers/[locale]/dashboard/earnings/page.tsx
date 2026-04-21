'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '../../../../../lib/api';

interface EarningsData {
  total: number;
  pending: number;
  withdrawn: number;
}

export default function DeveloperEarningsPage() {
  const t = useTranslations('developer');
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const profile = await api.get('/developers/me');
        setEarnings(profile.earnings);
      } catch (err) {
        console.error('Failed to fetch earnings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">{t('dashEarnings')}</h1>
        <p className="text-gray-400">{t('earningsDescription')}</p>
      </div>

      {/* Earnings Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <div className="text-gray-400 text-sm mb-1">{t('totalEarnings')}</div>
          <div className="text-3xl font-bold text-white">₾{(earnings?.total || 0).toFixed(2)}</div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-emerald-500/30 p-6">
          <div className="text-gray-400 text-sm mb-1">{t('pendingEarnings')}</div>
          <div className="text-3xl font-bold text-emerald-400">₾{(earnings?.pending || 0).toFixed(2)}</div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
          <div className="text-gray-400 text-sm mb-1">{t('withdrawn')}</div>
          <div className="text-3xl font-bold text-white">₾{(earnings?.withdrawn || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Revenue Split Info */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">{t('revenueModel')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-lg">80%</span>
            </div>
            <div>
              <div className="text-white font-medium">{t('yourShare')}</div>
              <div className="text-gray-400 text-sm">{t('yourShareDescription')}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
              <span className="text-gray-400 font-bold text-lg">20%</span>
            </div>
            <div>
              <div className="text-white font-medium">{t('platformFee')}</div>
              <div className="text-gray-400 text-sm">{t('platformFeeDescription')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for payouts */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t('payoutHistory')}</h2>
        <div className="text-center py-8">
          <p className="text-gray-400">{t('noPayoutsYet')}</p>
        </div>
      </div>
    </div>
  );
}
