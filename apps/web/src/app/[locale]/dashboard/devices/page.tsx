'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../lib/api';

interface Device {
  fingerprint: string;
  userAgent?: string;
  lastSeen: string;
  trusted: boolean;
  isActive: boolean;
  isCurrent?: boolean;
}

export default function DevicesPage() {
  const t = useTranslations('dashboard');
  const { user, isLoading: authLoading } = useAuth();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingDevice, setRevokingDevice] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDevices = async () => {
      try {
        const data = await api.get('/api/v1/auth/devices');
        // API returns { devices: [...] }
        setDevices(Array.isArray(data) ? data : data.devices || []);
      } catch (err) {
        console.error('Error fetching devices:', err);
        setError('Failed to load devices');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [authLoading, user]);

  const parseUserAgent = (ua?: string) => {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Detect browser
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad'))
      os = 'iOS';

    // Detect device type
    if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
    else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'Tablet';

    return { browser, os, device };
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'Mobile':
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      case 'Tablet':
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
    }
  };

  const handleRevokeDevice = async (fingerprint: string) => {
    setRevokingDevice(fingerprint);
    try {
      await api.delete(`/api/v1/auth/devices/${fingerprint}`);
      setDevices((prev) => prev.filter((d) => d.fingerprint !== fingerprint));
    } catch (err) {
      console.error('Error revoking device:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Failed to revoke device';
      setError(errorMessage);
    } finally {
      setRevokingDevice(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm(t('revokeAllConfirm'))) return;

    setIsRevokingAll(true);
    try {
      await api.post('/api/v1/auth/devices/revoke-all', {});
      // Keep only current device
      setDevices((prev) => prev.filter((d) => d.isCurrent));
    } catch (err) {
      console.error('Error revoking all devices:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Failed to revoke devices';
      setError(errorMessage);
    } finally {
      setIsRevokingAll(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-zinc-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activeDevices = devices.filter((d) => d.isActive);
  const inactiveDevices = devices.filter((d) => !d.isActive);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('devices')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('devicesDescription')}
          </p>
        </div>
        {devices.length > 1 && (
          <button
            onClick={handleRevokeAll}
            disabled={isRevokingAll}
            className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isRevokingAll ? '...' : t('revokeAll')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {devices.length === 0 ? (
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
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('noDevices')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('noDevicesDescription')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Sessions */}
          {activeDevices.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('activeSessions')} ({activeDevices.length})
              </h2>
              <div className="space-y-3">
                {activeDevices.map((device) => {
                  const info = parseUserAgent(device.userAgent);
                  return (
                    <div
                      key={device.fingerprint}
                      className={`bg-white dark:bg-zinc-800 rounded-xl border p-4 flex items-center gap-4 ${
                        device.isCurrent
                          ? 'border-green-500 dark:border-green-400'
                          : 'border-gray-200 dark:border-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          device.isCurrent
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {getDeviceIcon(info.device)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {info.browser} on {info.os}
                          </p>
                          {device.isCurrent && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                              {t('currentDevice')}
                            </span>
                          )}
                          {device.trusted && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                              {t('trusted')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('lastSeen')}: {new Date(device.lastSeen).toLocaleString()}
                        </p>
                      </div>
                      {!device.isCurrent && (
                        <button
                          onClick={() => handleRevokeDevice(device.fingerprint)}
                          disabled={!!revokingDevice}
                          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                        >
                          {revokingDevice === device.fingerprint ? '...' : t('revoke')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inactive Sessions */}
          {inactiveDevices.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('inactiveSessions')} ({inactiveDevices.length})
              </h2>
              <div className="space-y-3">
                {inactiveDevices.map((device) => {
                  const info = parseUserAgent(device.userAgent);
                  return (
                    <div
                      key={device.fingerprint}
                      className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4 flex items-center gap-4 opacity-60"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-400">
                        {getDeviceIcon(info.device)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {info.browser} on {info.os}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('lastSeen')}: {new Date(device.lastSeen).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeDevice(device.fingerprint)}
                        disabled={!!revokingDevice}
                        className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                      >
                        {revokingDevice === device.fingerprint ? '...' : t('remove')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

