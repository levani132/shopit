'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import { Role, hasRole } from '@shopit/constants';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface BalanceData {
  balance: number;
  pendingWithdrawals: number;
  totalEarnings: number;
  totalWithdrawn: number;
  waitingEarnings: number;
}

interface Transaction {
  _id: string;
  amount: number;
  type: 'earning' | 'withdrawal';
  description: string;
  createdAt: string;
  status?: string;
}

export default function CourierBalancePage() {
  const t = useTranslations('dashboard');
  const tCourier = useTranslations('courier');
  const { user, isLoading: authLoading } = useAuth();

  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasRole(user.role ?? 0, Role.COURIER)) {
      setError('You must be a courier to access this page');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch balance info from courier endpoint
        const balanceResponse = await fetch(
          `${API_URL}/api/v1/balance/courier`,
          {
            credentials: 'include',
          },
        );
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setBalance(balanceData);
        } else {
          // Fallback to user data if endpoint fails
          setBalance({
            balance: user.balance || 0,
            pendingWithdrawals: user.pendingWithdrawals || 0,
            totalEarnings: user.totalEarnings || 0,
            totalWithdrawn: user.totalWithdrawn || 0,
            waitingEarnings: 0,
          });
        }

        // Fetch courier transactions
        const response = await fetch(
          `${API_URL}/api/v1/balance/courier/transactions`,
          {
            credentials: 'include',
          },
        );
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || data);
        }
      } catch (err) {
        console.error('Error fetching balance:', err);
        setError('Failed to load balance information');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, user]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || !balance || amount > balance.balance) {
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/balance/withdraw`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        setWithdrawAmount('');
        // Refresh data
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to process withdrawal');
      }
    } catch (err) {
      console.error('Error withdrawing:', err);
      setError('Failed to process withdrawal');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-zinc-700 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {tCourier('courierBalance')}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {t('balanceDescription')}
      </p>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('availableBalance')}
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            ₾{balance?.balance.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('waitingEarnings')}
          </p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            ₾{balance?.waitingEarnings?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {tCourier('pendingDeliveries')}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('pendingWithdrawals')}
          </p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            ₾{balance?.pendingWithdrawals.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('totalEarnings')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ₾{balance?.totalEarnings.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('totalWithdrawn')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ₾{balance?.totalWithdrawn.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Withdraw Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('requestWithdrawal')}
        </h2>
        <div className="flex gap-4">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            max={balance?.balance || 0}
            step="0.01"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleWithdraw}
            disabled={
              isWithdrawing ||
              !withdrawAmount ||
              parseFloat(withdrawAmount) <= 0
            }
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWithdrawing ? '...' : t('withdraw')}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
        <div className="p-6 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('transactionHistory')}
          </h2>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('noTransactions')}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-zinc-700">
            {transactions.map((tx) => (
              <div
                key={tx._id}
                className="p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tx.description}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p
                  className={`font-semibold ${
                    tx.type === 'earning'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {tx.type === 'earning' ? '+' : '-'}₾{tx.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
