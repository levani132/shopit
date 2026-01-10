'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface SellerBalance {
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
}

interface Transaction {
  _id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  order?: {
    _id: string;
  };
  commissionPercentage?: number;
  commissionAmount?: number;
  deliveryCost?: number;
}

const transactionTypeColors: Record<string, string> = {
  earning:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  withdrawal_pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  withdrawal_completed:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  withdrawal_rejected:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  withdrawal_failed:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  commission_deduction:
    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  refund: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export default function BalancePage() {
  const t = useTranslations('dashboard');
  const tBalance = useTranslations('balance');
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';

  const { isAuthenticated, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const [balanceRes, transactionsRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/balance`, { credentials: 'include' }),
          fetch(`${API_URL}/api/v1/balance/transactions`, {
            credentials: 'include',
          }),
        ]);

        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setBalance(balanceData);
        }
        if (transactionsRes.ok) {
          const txData = await transactionsRes.json();
          // Handle both array response and object with transactions property
          setTransactions(Array.isArray(txData) ? txData : txData.transactions || []);
        }
      } catch (err) {
        console.error('Error fetching balance data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, authLoading]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !balance) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError(tBalance('invalidAmount'));
      return;
    }
    if (amount > balance.availableBalance) {
      setWithdrawError(tBalance('insufficientBalance'));
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(false);

    try {
      const response = await fetch(`${API_URL}/api/v1/balance/withdraw`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        const result = await response.json();
        setBalance({
          ...balance,
          availableBalance: balance.availableBalance - amount,
          pendingBalance: balance.pendingBalance + amount,
        });
        setWithdrawAmount('');
        setWithdrawSuccess(true);

        // Refresh transactions
        const transactionsRes = await fetch(
          `${API_URL}/api/v1/balance/transactions`,
          { credentials: 'include' },
        );
        if (transactionsRes.ok) {
          setTransactions(await transactionsRes.json());
        }
      } else {
        const errorData = await response.json();
        setWithdrawError(errorData.message || tBalance('withdrawFailed'));
      }
    } catch (err) {
      console.error('Error withdrawing:', err);
      setWithdrawError(tBalance('withdrawFailed'));
    } finally {
      setWithdrawing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-zinc-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {tBalance('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {tBalance('description')}
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {tBalance('availableBalance')}
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            ₾{(balance?.availableBalance ?? 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {tBalance('pendingBalance')}
          </p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            ₾{(balance?.pendingBalance ?? 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {tBalance('totalEarnings')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ₾{(balance?.totalEarnings ?? 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {tBalance('totalWithdrawn')}
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ₾{(balance?.totalWithdrawn ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdraw form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {tBalance('withdrawFunds')}
            </h3>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {tBalance('amount')} (₾)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={balance?.availableBalance || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                />
              </div>

              {withdrawError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {withdrawError}
                </p>
              )}

              {withdrawSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  {tBalance('withdrawSuccess')}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  withdrawing ||
                  !withdrawAmount ||
                  !balance ||
                  parseFloat(withdrawAmount) > balance.availableBalance
                }
                className="w-full py-3 bg-[var(--accent-500)] text-white rounded-lg hover:bg-[var(--accent-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {withdrawing ? tBalance('processing') : tBalance('withdraw')}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {tBalance('withdrawNote')}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {tBalance('transactions')}
              </h3>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  {tBalance('noTransactions')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-zinc-700">
                {transactions.map((tx) => (
                  <div key={tx._id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${transactionTypeColors[tx.type] || transactionTypeColors.earning}`}
                        >
                          {tBalance(`types.${tx.type}`)}
                        </span>
                        {tx.order && (
                          <span className="text-xs text-gray-400 font-mono">
                            #{tx.order._id.slice(-8)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {tx.description}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString(locale, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          tx.amount >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {tx.amount >= 0 ? '+' : ''}₾{tx.amount.toFixed(2)}
                      </p>
                      {tx.commissionAmount && tx.commissionAmount > 0 && (
                        <p className="text-xs text-gray-400">
                          -{tx.commissionPercentage}% fee: ₾{tx.commissionAmount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

