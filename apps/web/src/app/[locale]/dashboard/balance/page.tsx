'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../lib/api';

interface SellerBalance {
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  waitingEarnings: number;
}

interface Transaction {
  _id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  orderId?: {
    _id: string;
  };
  commissionPercentage?: number;
  commissionAmount?: number;
  productPrice?: number;
  finalAmount?: number;
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
  refund:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export default function BalancePage() {
  const tBalance = useTranslations('balance');
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';

  const { isAuthenticated, isLoading: authLoading } = useAuth();
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
        const [balanceData, txData] = await Promise.all([
          api.get<SellerBalance>('/api/v1/balance'),
          api.get<Transaction[] | { transactions: Transaction[] }>(
            '/api/v1/balance/transactions',
          ),
        ]);

        setBalance(balanceData);
        setTransactions(Array.isArray(txData) ? txData : txData.transactions || []);
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
      await api.post('/api/v1/balance/withdraw', { amount });

      setBalance({
        ...balance,
        availableBalance: balance.availableBalance - amount,
        pendingBalance: balance.pendingBalance + amount,
      });
      setWithdrawAmount('');
      setWithdrawSuccess(true);

      // Refresh transactions
      try {
        const txData = await api.get<Transaction[] | { transactions: Transaction[] }>(
          '/api/v1/balance/transactions',
        );
        setTransactions(Array.isArray(txData) ? txData : txData.transactions || []);
      } catch (err) {
        console.error('Error refreshing transactions:', err);
      }
    } catch (err) {
      console.error('Error withdrawing:', err);
      const message =
        err instanceof Error && 'message' in err
          ? (err as any).message
          : tBalance('withdrawFailed');
      setWithdrawError(message);
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
              <div
                key={i}
                className="h-24 bg-gray-200 dark:bg-zinc-700 rounded-xl"
              />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {tBalance('availableBalance')}
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            ₾{(balance?.availableBalance ?? 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tBalance('waitingEarnings')}
            </p>
            <div className="relative group">
              <svg
                className="w-4 h-4 text-gray-400 cursor-help"
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
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-zinc-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {tBalance('waitingEarningsTooltip')}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-zinc-700" />
              </div>
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            ₾{(balance?.waitingEarnings ?? 0).toFixed(2)}
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
                {transactions.map((tx) => {
                  // For earnings, use absolute value (they should always be positive)
                  const isEarning = tx.type === 'earning';
                  const isWithdrawal = tx.type.startsWith('withdrawal');
                  const displayAmount = isEarning
                    ? Math.abs(tx.finalAmount ?? tx.amount)
                    : tx.amount;
                  const isPositive = isEarning || displayAmount >= 0;

                  // Calculate total deductions for display (site commission only)
                  const totalDeductions = tx.commissionAmount ?? 0;

                  return (
                    <div
                      key={tx._id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${transactionTypeColors[tx.type] || transactionTypeColors.earning}`}
                          >
                            {tBalance(`types.${tx.type}`)}
                          </span>
                          {tx.orderId && (
                            <span className="text-xs text-gray-400 font-mono">
                              #{tx.orderId._id.slice(-8)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
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
                      <div className="text-right ml-4">
                        <p
                          className={`font-semibold ${
                            isPositive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}₾{displayAmount.toFixed(2)}
                        </p>
                        {isEarning &&
                          tx.productPrice &&
                          tx.productPrice > 0 && (
                            <div className="text-xs text-gray-400 space-y-0.5">
                              <p>
                                {tBalance('productPrice')}: ₾
                                {tx.productPrice.toFixed(2)}
                              </p>
                              {totalDeductions > 0 && (
                                <p className="text-red-400">
                                  {tBalance('deductions')}: -₾
                                  {totalDeductions.toFixed(2)}
                                </p>
                              )}
                            </div>
                          )}
                        {isWithdrawal && (
                          <p className="text-xs text-gray-400">
                            {tBalance(`types.${tx.type}`)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
