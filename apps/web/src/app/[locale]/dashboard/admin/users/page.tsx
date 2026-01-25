'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../../lib/api';
import { useAuth } from '../../../../../contexts/AuthContext';

// Role bitmask values
const RoleBit = {
  USER: 1,
  COURIER: 2,
  SELLER: 4,
  ADMIN: 8,
} as const;

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: number; // Now a bitmask number
  createdAt: string;
  balance?: number;
  profileImage?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function UsersManagementContent() {
  const t = useTranslations('admin');
  const nav = useTranslations('nav');
  const { impersonateUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleChangeModal, setRoleChangeModal] = useState<{
    userId: string;
    userName: string;
    currentRole: number;
  } | null>(null);
  const [newRole, setNewRole] = useState<number>(0);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);

      const data = await api.get<{ users: any[]; pagination: any }>(
        `/admin/users?${params.toString()}`,
      );
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleRoleChange = async () => {
    if (!roleChangeModal || newRole === 0) return;

    setProcessingId(roleChangeModal.userId);
    try {
      await api.put(`/admin/users/${roleChangeModal.userId}/role`, {
        role: newRole,
      });
      setUsers(
        users.map((u) =>
          u._id === roleChangeModal.userId ? { ...u, role: newRole } : u,
        ),
      );
      setRoleChangeModal(null);
      setNewRole(0);
    } catch (err: any) {
      console.error('Failed to change role:', err);
      setError(err.message || 'Failed to change role');
    } finally {
      setProcessingId(null);
    }
  };

  // Toggle a role bit in the newRole
  const toggleRoleBit = (roleBit: number) => {
    // USER role (bit 1) is always required
    if (roleBit === RoleBit.USER) return;

    if ((newRole & roleBit) !== 0) {
      // Remove the role
      setNewRole(newRole & ~roleBit);
    } else {
      // Add the role
      setNewRole(newRole | roleBit);
    }
  };

  // Get display-friendly role names from bitmask
  const getRoleNames = (role: number): string[] => {
    const roles: string[] = [];
    if ((role & RoleBit.ADMIN) !== 0) roles.push('Admin');
    if ((role & RoleBit.SELLER) !== 0) roles.push('Seller');
    if ((role & RoleBit.COURIER) !== 0) roles.push('Courier');
    if (roles.length === 0) roles.push('User');
    return roles;
  };

  const getRoleBadgeColor = (role: number) => {
    if ((role & RoleBit.ADMIN) !== 0) {
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    }
    if ((role & RoleBit.SELLER) !== 0) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
    if ((role & RoleBit.COURIER) !== 0) {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('usersManagementTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('usersManagementDescription')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchUsers')}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition-colors"
          >
            {t('search')}
          </button>
        </form>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
        >
          <option value="">{t('allRoles')}</option>
          <option value="user">{t('roleUser')}</option>
          <option value="seller">{t('roleSeller')}</option>
          <option value="courier">{t('roleCourier')}</option>
          <option value="admin">{t('roleAdmin')}</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-500)] border-t-transparent"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {t('noUsersFound')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-zinc-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('joinedAt')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.firstName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {user.firstName?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {getRoleNames(user.role).map((roleName) => (
                          <span
                            key={roleName}
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}
                          >
                            {roleName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => impersonateUser(user._id)}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          title={nav('loginAsUser')}
                        >
                          {nav('loginAsUser')}
                        </button>
                        <button
                          onClick={() => {
                            setRoleChangeModal({
                              userId: user._id,
                              userName: `${user.firstName} ${user.lastName}`,
                              currentRole: user.role,
                            });
                            setNewRole(user.role);
                          }}
                          className="text-sm text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:underline"
                        >
                          {t('changeRole')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('showingUsers', {
              from: (pagination.page - 1) * pagination.limit + 1,
              to: Math.min(
                pagination.page * pagination.limit,
                pagination.total,
              ),
              total: pagination.total,
            })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {t('previous')}
            </button>
            <button
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('changeUserRole')}
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('changeRoleFor', { name: roleChangeModal.userName })}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('selectRoles')}
              </label>
              <div className="space-y-3">
                {/* User role is always checked and disabled */}
                <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-[var(--accent-500)] focus:ring-[var(--accent-500)]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('roleUser')} (base)
                  </span>
                </label>
                {/* Seller */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(newRole & RoleBit.SELLER) !== 0}
                    onChange={() => toggleRoleBit(RoleBit.SELLER)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-[var(--accent-500)] focus:ring-[var(--accent-500)]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('roleSeller')}
                  </span>
                </label>
                {/* Courier */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(newRole & RoleBit.COURIER) !== 0}
                    onChange={() => toggleRoleBit(RoleBit.COURIER)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-[var(--accent-500)] focus:ring-[var(--accent-500)]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('roleCourier')}
                  </span>
                </label>
                {/* Admin */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(newRole & RoleBit.ADMIN) !== 0}
                    onChange={() => toggleRoleBit(RoleBit.ADMIN)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-[var(--accent-500)] focus:ring-[var(--accent-500)]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('roleAdmin')}
                  </span>
                </label>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Current role value: {newRole} (binary:{' '}
                {newRole.toString(2).padStart(4, '0')})
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRoleChangeModal(null);
                  setNewRole(0);
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-zinc-600 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRoleChange}
                disabled={
                  processingId === roleChangeModal.userId ||
                  newRole === roleChangeModal.currentRole
                }
                className="px-4 py-2 text-sm bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {processingId === roleChangeModal.userId && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {t('saveRole')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersManagementPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <UsersManagementContent />
    </ProtectedRoute>
  );
}
