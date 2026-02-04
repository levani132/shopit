'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  roleNumber: number;
  store?: {
    id: string;
    subdomain: string;
    name: string;
  };
}

interface Stats {
  users: number;
  stores: number;
  products: number;
  categories: number;
  orders: number;
  balanceTransactions: number;
}

export default function DevToolsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [seededUsers, setSeededUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const refreshStats = async () => {
    try {
      const data = await api.get('/dev-tools/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const refreshSeededUsers = async () => {
    try {
      const data = await api.get('/dev-tools/seeded-users');
      setSeededUsers(data.users || []);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : JSON.stringify(error);
      console.error('Failed to fetch seeded users:', errorMessage);
    }
  };

  // Cleanup handlers
  const handleCleanup = async (level: 'level_1' | 'level_2' | 'level_3') => {
    if (
      !confirm(
        `Are you sure you want to perform Level ${level.split('_')[1]} cleanup?`,
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/dev-tools/cleanup', { level });
      setMessage({
        type: 'success',
        text: `${response.message} - ${JSON.stringify(response.deleted)}`,
      });
      await refreshStats();
      await refreshSeededUsers();
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Cleanup failed',
      });
    } finally {
      setLoading(false);
    }
  };

  // Seed handlers
  const handleSeedUsers = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/dev-tools/seed/users', {
        count: 10,
        sellers: 3,
        couriers: 2,
      });

      setSeededUsers(response.users);
      setMessage({
        type: 'success',
        text: `Successfully seeded ${response.users.length} users`,
      });
      await refreshStats();
      await refreshSeededUsers();
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'User seeding failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedProducts = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/dev-tools/seed/products', {
        count: 30,
      });

      setMessage({
        type: 'success',
        text: `Successfully seeded ${response.productsCreated} products with ${response.categoriesCreated} categories`,
      });
      await refreshStats();
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Product seeding failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedOrders = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/dev-tools/seed/orders', {
        count: 50,
      });

      setMessage({
        type: 'success',
        text: `Successfully seeded ${response.ordersCreated} orders`,
      });
      await refreshStats();
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Order seeding failed',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load stats and seeded users on mount
  useState(() => {
    refreshStats();
    refreshSeededUsers();
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🛠️ Dev Tools
        </h1>
        <button
          onClick={refreshStats}
          className="px-4 py-2 text-sm bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
        >
          🔄 Refresh Stats
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Database Stats */}
      {stats && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            📊 Database Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Users" value={stats.users} />
            <StatCard label="Stores" value={stats.stores} />
            <StatCard label="Products" value={stats.products} />
            <StatCard label="Categories" value={stats.categories} />
            <StatCard label="Orders" value={stats.orders} />
            <StatCard label="Transactions" value={stats.balanceTransactions} />
          </div>
        </div>
      )}

      {/* Cleanup Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          🗑️ Database Cleanup
        </h2>
        <div className="space-y-3">
          <CleanupButton
            level={1}
            description="Clear orders & balances (safe)"
            onClick={() => handleCleanup('level_1')}
            disabled={loading}
            color="blue"
          />
          <CleanupButton
            level={2}
            description="Clear products, categories & attributes"
            onClick={() => handleCleanup('level_2')}
            disabled={loading}
            color="yellow"
          />
          <CleanupButton
            level={3}
            description="Clear users & stores (⚠️ admins preserved)"
            onClick={() => handleCleanup('level_3')}
            disabled={loading}
            color="red"
          />
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          💡 Tip: Run cleanup in sequence (Level 1 → 2 → 3) for complete reset
        </p>
      </div>

      {/* Seeding Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          🌱 Seed Test Data
        </h2>
        <div className="space-y-3">
          <SeedButton
            label="Seed Users (10 users: 3 sellers, 2 couriers, 5 buyers)"
            onClick={handleSeedUsers}
            disabled={loading}
            icon="👥"
          />
          <SeedButton
            label="Seed Products (30 products with categories)"
            onClick={handleSeedProducts}
            disabled={loading}
            icon="📦"
            requiresUsers
          />
          <SeedButton
            label="Seed Orders (50 random orders)"
            onClick={handleSeedOrders}
            disabled={loading}
            icon="🛒"
            requiresProducts
          />
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          💡 Tip: Seed in sequence (Users → Products → Orders) for best results
        </p>
      </div>

      {/* Seeded Users List */}
      {seededUsers.length > 0 && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            👤 Seeded Users ({seededUsers.length})
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {seededUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 bg-gray-50 dark:bg-zinc-700 rounded-lg border border-gray-200 dark:border-zinc-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        {user.role}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Email:</span>
                        <code className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-xs text-gray-900 dark:text-gray-200">
                          {user.email}
                        </code>
                        <button
                          onClick={() => copyToClipboard(user.email)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          title="Copy email"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Password:</span>
                        <code className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-xs text-gray-900 dark:text-gray-200">
                          {user.password}
                        </code>
                        <button
                          onClick={() => copyToClipboard(user.password)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          title="Copy password"
                        >
                          📋
                        </button>
                      </div>
                      {user.store && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Store:</span>
                            <span>{user.store.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Subdomain:</span>
                            <code className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-xs text-gray-900 dark:text-gray-200">
                              {user.store.subdomain}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 All passwords are{' '}
              <code className="font-mono">password123</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-zinc-700 rounded-lg border border-gray-200 dark:border-zinc-600">
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}

function CleanupButton({
  level,
  description,
  onClick,
  disabled,
  color,
}: {
  level: number;
  description: string;
  onClick: () => void;
  disabled: boolean;
  color: 'blue' | 'yellow' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white',
    yellow:
      'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white',
    red: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colors[color]}`}
    >
      Level {level}: {description}
    </button>
  );
}

function SeedButton({
  label,
  onClick,
  disabled,
  icon,
  requiresUsers,
  requiresProducts,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  icon: string;
  requiresUsers?: boolean;
  requiresProducts?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full p-4 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      <span>{icon}</span>
      <span>{label}</span>
      {requiresUsers && (
        <span className="text-xs opacity-75">(Requires users)</span>
      )}
      {requiresProducts && (
        <span className="text-xs opacity-75">(Requires products)</span>
      )}
    </button>
  );
}
