'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../../contexts/AuthContext';
import { Role, hasRole } from '@shopit/constants';
import { RouteMap } from '../../../../../components/ui/RouteMap';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

// ===================== Types =====================

interface Location {
  lat: number;
  lng: number;
  address: string;
  city: string;
}

interface SavedAddress {
  _id: string;
  label?: string;
  address: string;
  city: string;
  location?: { lat: number; lng: number };
  isDefault?: boolean;
}

interface HeuristicRoute {
  duration: number;
  durationLabel: string;
  stops: Array<{
    stopId: string;
    orderId?: string;
    type: 'pickup' | 'delivery' | 'break';
    address: string;
    city: string;
    coordinates: { lat: number; lng: number };
    estimatedArrival: string;
    storeName?: string;
    orderValue?: number;
    courierEarning?: number;
  }>;
  orderCount: number;
  estimatedEarnings: number;
  estimatedTime: number;
  estimatedDistanceKm: number;
}

interface HeuristicRoutesResponse {
  routes: HeuristicRoute[];
  generatedAt: string;
  expiresAt: string;
  availableOrderCount: number;
}

// ===================== Duration Options =====================
const DURATIONS = [
  { value: 60, label: '~1h' },
  { value: 120, label: '~2h' },
  { value: 180, label: '~3h' },
  { value: 240, label: '~4h' },
  { value: 300, label: '~5h' },
  { value: 360, label: '~6h' },
  { value: 420, label: '~7h' },
  { value: 480, label: '~8h' },
];

// ===================== Vehicle Types =====================
const VEHICLE_TYPES = [
  { value: 'walking', label: '🚶 Walking', emoji: '🚶' },
  { value: 'bicycle', label: '🚲 Bicycle', emoji: '🚲' },
  { value: 'motorcycle', label: '🏍️ Motorcycle', emoji: '🏍️' },
  { value: 'car', label: '🚗 Car', emoji: '🚗' },
  { value: 'suv', label: '🚙 SUV', emoji: '🚙' },
  { value: 'van', label: '🚐 Van', emoji: '🚐' },
] as const;

// ===================== Algorithm Options =====================
const ALGORITHM_OPTIONS = [
  { value: 'heuristic', label: 'Heuristic (Fast)', color: 'blue' },
  { value: 'optimal', label: 'Optimal (Accurate)', color: 'purple' },
] as const;

type AlgorithmType = 'heuristic' | 'optimal';

// ===================== Component =====================

export default function RouteComparisonPage() {
  const t = useTranslations('routeComparison');
  const { user, isLoading: authLoading } = useAuth();

  // State
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [startingPoint, setStartingPoint] = useState<Location | null>(null);
  const [vehicleType, setVehicleType] = useState<string>('car');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Algorithm selection for each column
  const [leftAlgorithm, setLeftAlgorithm] =
    useState<AlgorithmType>('heuristic');
  const [rightAlgorithm, setRightAlgorithm] =
    useState<AlgorithmType>('optimal');

  // Route data
  const [leftRoutes, setLeftRoutes] = useState<HeuristicRoute[]>([]);
  const [rightRoutes, setRightRoutes] = useState<HeuristicRoute[]>([]);
  const [leftGenTime, setLeftGenTime] = useState<number>(0);
  const [rightGenTime, setRightGenTime] = useState<number>(0);
  const [leftAlgorithmNote, setLeftAlgorithmNote] = useState<string>('');
  const [orderCount, setOrderCount] = useState<number>(0);

  const [rightAlgorithmNote, setRightAlgorithmNote] = useState<string>('');

  // Selected route for map view
  const [selectedLeft, setSelectedLeft] = useState<HeuristicRoute | null>(null);
  const [selectedRight, setSelectedRight] = useState<HeuristicRoute | null>(
    null,
  );
  const [activeMapView, setActiveMapView] = useState<'left' | 'right' | null>(
    null,
  );

  // Check access - Admin only
  const isAdmin = user && hasRole(user.role, Role.ADMIN);

  // Fetch saved addresses
  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/addresses`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSavedAddresses(data);

        const defaultAddr = data.find((a: SavedAddress) => a.isDefault);
        if (defaultAddr && defaultAddr.location) {
          setSelectedAddressId(defaultAddr._id);
          setStartingPoint({
            lat: defaultAddr.location.lat,
            lng: defaultAddr.location.lng,
            address: defaultAddr.address,
            city: defaultAddr.city,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchAddresses();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAdmin, fetchAddresses]);

  // Helper to generate routes for a specific algorithm
  const generateForAlgorithm = async (
    algorithm: AlgorithmType,
    baseBody: {
      startingPoint: Location;
      vehicleType: string;
      includeBreaks: boolean;
    },
  ): Promise<{
    routes: HeuristicRoute[];
    time: number;
    note: string;
    orderCount: number;
  }> => {
    const body = JSON.stringify({
      ...baseBody,
      algorithm, // Pass algorithm parameter to the single endpoint
    });

    const start = performance.now();
    const response = await fetch(`${API_URL}/api/v1/routes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body,
    });

    if (!response.ok) {
      throw new Error(`Failed to generate ${algorithm} routes`);
    }

    const data = (await response.json()) as HeuristicRoutesResponse;
    const end = performance.now();

    return {
      routes: data.routes,
      time: Math.round(end - start),
      note:
        algorithm === 'optimal'
          ? 'Held-Karp/Branch-and-Bound'
          : 'Greedy nearest-neighbor',
      orderCount: data.availableOrderCount,
    };
  };

  // Generate both routes
  const generateBothRoutes = async () => {
    if (!startingPoint) return;

    setGenerating(true);
    setError(null);
    setLeftRoutes([]);
    setRightRoutes([]);

    try {
      const baseBody = {
        startingPoint,
        vehicleType,
        includeBreaks: false,
      };

      // Generate left column routes
      const leftResult = await generateForAlgorithm(leftAlgorithm, baseBody);
      setLeftGenTime(leftResult.time);
      setLeftRoutes(leftResult.routes);
      setLeftAlgorithmNote(leftResult.note);
      setOrderCount(leftResult.orderCount);

      // Generate right column routes
      const rightResult = await generateForAlgorithm(rightAlgorithm, baseBody);
      setRightGenTime(rightResult.time);
      setRightRoutes(rightResult.routes);
      setRightAlgorithmNote(rightResult.note);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate routes',
      );
    } finally {
      setGenerating(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('accessDenied')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{t('adminsOnly')}</p>
      </div>
    );
  }

  // Find matching routes for comparison
  const getMatchingLeftRoute = (duration: number) => {
    return leftRoutes.find((r) => r.duration === duration);
  };

  const getMatchingRightRoute = (duration: number) => {
    return rightRoutes.find((r) => r.duration === duration);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('title')}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {t('description')}
      </p>

      {/* Starting Point Selection */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          📍 {t('startingPoint')}
        </h3>

        {savedAddresses.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            {t('noAddresses')}
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {savedAddresses
              .filter((addr) => addr.location)
              .map((addr) => (
                <label
                  key={addr._id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedAddressId === addr._id
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700'
                      : 'bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="startingAddress"
                    checked={selectedAddressId === addr._id}
                    onChange={() => {
                      setSelectedAddressId(addr._id);
                      if (addr.location) {
                        setStartingPoint({
                          lat: addr.location.lat,
                          lng: addr.location.lng,
                          address: addr.address,
                          city: addr.city,
                        });
                      }
                    }}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {addr.label || addr.address}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {addr.address}, {addr.city}
                    </p>
                  </div>
                </label>
              ))}
          </div>
        )}

        {/* Vehicle Type Selection */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            🚗 {t('vehicleType')}
          </h4>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {VEHICLE_TYPES.map((vehicle) => (
              <button
                key={vehicle.value}
                onClick={() => setVehicleType(vehicle.value)}
                className={`p-3 rounded-lg text-center transition-all ${
                  vehicleType === vehicle.value
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                    : 'bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="text-2xl block mb-1">{vehicle.emoji}</span>
                <span className="text-xs font-medium">
                  {vehicle.value.charAt(0).toUpperCase() +
                    vehicle.value.slice(1)}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('vehicleTypeHelp')}
          </p>
        </div>

        <button
          onClick={generateBothRoutes}
          disabled={!startingPoint || generating}
          className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? t('generating') : t('generateAndCompare')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {(leftRoutes.length > 0 || rightRoutes.length > 0) && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-gray-200 dark:border-zinc-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('availableOrders')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {orderCount}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-gray-200 dark:border-zinc-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('leftColumnTime')}
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {leftGenTime}ms
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-gray-200 dark:border-zinc-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('rightColumnTime')}
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {rightGenTime}ms
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-gray-200 dark:border-zinc-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('leftAlgorithm')}
              </p>
              <p
                className="text-sm font-medium text-gray-900 dark:text-white truncate"
                title={leftAlgorithmNote}
              >
                {leftAlgorithmNote ||
                  ALGORITHM_OPTIONS.find((a) => a.value === leftAlgorithm)
                    ?.label}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-gray-200 dark:border-zinc-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('rightAlgorithm')}
              </p>
              <p
                className="text-sm font-medium text-gray-900 dark:text-white truncate"
                title={rightAlgorithmNote}
              >
                {rightAlgorithmNote ||
                  ALGORITHM_OPTIONS.find((a) => a.value === rightAlgorithm)
                    ?.label}
              </p>
            </div>
          </div>

          {/* Side by Side Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left Column Routes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  {t('leftColumn')}
                </h2>
                <select
                  value={leftAlgorithm}
                  onChange={(e) =>
                    setLeftAlgorithm(e.target.value as AlgorithmType)
                  }
                  className="text-sm border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-1.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ALGORITHM_OPTIONS.map((algo) => (
                    <option key={algo.value} value={algo.value}>
                      {algo.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                {DURATIONS.map(({ value, label }) => {
                  const route = getMatchingLeftRoute(value);
                  const otherRoute = getMatchingRightRoute(value);

                  if (!route) {
                    return (
                      <div
                        key={value}
                        className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-700 opacity-50"
                      >
                        <p className="text-lg font-bold text-gray-400">
                          {label}
                        </p>
                        <p className="text-sm text-gray-400">
                          {t('noRouteAvailable')}
                        </p>
                      </div>
                    );
                  }

                  const isSelected =
                    selectedLeft?.duration === value &&
                    activeMapView === 'left';
                  const earningsPerHour =
                    route.estimatedTime > 0
                      ? route.estimatedEarnings / (route.estimatedTime / 60)
                      : 0;

                  // Calculate gap if other column route exists
                  const gap = otherRoute
                    ? otherRoute.estimatedEarnings - route.estimatedEarnings
                    : 0;
                  const gapPercent =
                    route.estimatedEarnings > 0
                      ? (gap / route.estimatedEarnings) * 100
                      : 0;

                  return (
                    <button
                      key={value}
                      onClick={() => {
                        setSelectedLeft(route);
                        setActiveMapView('left');
                      }}
                      className={`w-full text-left bg-white dark:bg-zinc-800 rounded-xl p-4 border transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                          : 'border-gray-200 dark:border-zinc-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {label}
                          </p>
                          <p className="text-xs text-gray-400">
                            ⏱️ {Math.floor(route.estimatedTime / 60)}h{' '}
                            {route.estimatedTime % 60}min
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            ₾{route.estimatedEarnings.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">
                            ₾{earningsPerHour.toFixed(2)}/h
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          {route.orderCount} {t('orders')}
                        </span>
                        <span className="text-gray-500">
                          {route.estimatedDistanceKm} km
                        </span>
                      </div>
                      {gap > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-700">
                          <p className="text-xs text-red-500">
                            ⚠️ {t('missingEarnings')}: ₾{gap.toFixed(2)} (
                            {gapPercent.toFixed(1)}%)
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column Routes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  {t('rightColumn')}
                </h2>
                <select
                  value={rightAlgorithm}
                  onChange={(e) =>
                    setRightAlgorithm(e.target.value as AlgorithmType)
                  }
                  className="text-sm border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-1.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {ALGORITHM_OPTIONS.map((algo) => (
                    <option key={algo.value} value={algo.value}>
                      {algo.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                {DURATIONS.map(({ value, label }) => {
                  const route = getMatchingRightRoute(value);
                  const otherRoute = getMatchingLeftRoute(value);

                  if (!route) {
                    return (
                      <div
                        key={value}
                        className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-700 opacity-50"
                      >
                        <p className="text-lg font-bold text-gray-400">
                          {label}
                        </p>
                        <p className="text-sm text-gray-400">
                          {t('noRouteAvailable')}
                        </p>
                      </div>
                    );
                  }

                  const isSelected =
                    selectedRight?.duration === value &&
                    activeMapView === 'right';
                  const earningsPerHour =
                    route.estimatedTime > 0
                      ? route.estimatedEarnings / (route.estimatedTime / 60)
                      : 0;

                  // Calculate improvement over other column
                  const improvement = otherRoute
                    ? route.estimatedEarnings - otherRoute.estimatedEarnings
                    : 0;
                  const improvementPercent =
                    otherRoute && otherRoute.estimatedEarnings > 0
                      ? (improvement / otherRoute.estimatedEarnings) * 100
                      : 0;

                  return (
                    <button
                      key={value}
                      onClick={() => {
                        setSelectedRight(route);
                        setActiveMapView('right');
                      }}
                      className={`w-full text-left bg-white dark:bg-zinc-800 rounded-xl p-4 border transition-all ${
                        isSelected
                          ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-900'
                          : 'border-gray-200 dark:border-zinc-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {label}
                          </p>
                          <p className="text-xs text-gray-400">
                            ⏱️ {Math.floor(route.estimatedTime / 60)}h{' '}
                            {Math.round(route.estimatedTime % 60)}min
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            ₾{route.estimatedEarnings.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">
                            ₾{earningsPerHour.toFixed(2)}/h
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          {route.orderCount} {t('orders')}
                        </span>
                        <span className="text-gray-500">
                          {typeof route.estimatedDistanceKm === 'number'
                            ? route.estimatedDistanceKm.toFixed(1)
                            : route.estimatedDistanceKm}{' '}
                          km
                        </span>
                      </div>
                      {improvement !== 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-700">
                          <span
                            className={`text-xs ${improvement > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}
                          >
                            {improvement > 0 ? '+' : ''}₾
                            {improvement.toFixed(2)} (
                            {improvement > 0 ? '+' : ''}
                            {improvementPercent.toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Map View */}
          {(selectedLeft || selectedRight) && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-200 dark:border-zinc-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {activeMapView === 'left'
                    ? t('leftColumn')
                    : t('rightColumn')}
                  {activeMapView === 'left' &&
                    selectedLeft &&
                    ` - ${selectedLeft.durationLabel}`}
                  {activeMapView === 'right' &&
                    selectedRight &&
                    ` - ${selectedRight.durationLabel}`}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveMapView('left')}
                    disabled={!selectedLeft}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      activeMapView === 'left'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
                    } disabled:opacity-50`}
                  >
                    {
                      ALGORITHM_OPTIONS.find(
                        (a) => a.value === leftAlgorithm,
                      )?.label.split(' ')[0]
                    }
                  </button>
                  <button
                    onClick={() => setActiveMapView('right')}
                    disabled={!selectedRight}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      activeMapView === 'right'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
                    } disabled:opacity-50`}
                  >
                    {
                      ALGORITHM_OPTIONS.find(
                        (a) => a.value === rightAlgorithm,
                      )?.label.split(' ')[0]
                    }
                  </button>
                </div>
              </div>
              <div className="h-[500px]">
                {activeMapView === 'left' && selectedLeft && startingPoint && (
                  <RouteMap
                    startingPoint={{
                      lat: startingPoint.lat,
                      lng: startingPoint.lng,
                    }}
                    stops={selectedLeft.stops.map((stop, idx) => ({
                      id: stop.stopId,
                      type: stop.type,
                      coordinates: stop.coordinates,
                      address: stop.address,
                      status: 'pending' as const,
                      isCurrentStop: idx === 0,
                    }))}
                    currentStopIndex={0}
                  />
                )}
                {activeMapView === 'right' &&
                  selectedRight &&
                  startingPoint && (
                    <RouteMap
                      startingPoint={{
                        lat: startingPoint.lat,
                        lng: startingPoint.lng,
                      }}
                      stops={selectedRight.stops.map((stop, idx) => ({
                        id: stop.stopId,
                        type: stop.type,
                        coordinates: stop.coordinates,
                        address: stop.address,
                        status: 'pending' as const,
                        isCurrentStop: idx === 0,
                      }))}
                      currentStopIndex={0}
                    />
                  )}
              </div>
            </div>
          )}

          {/* Detailed Comparison Table */}
          {leftRoutes.length > 0 && rightRoutes.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('detailedComparison')}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-zinc-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-500 dark:text-gray-400">
                        {t('duration')}
                      </th>
                      <th className="px-4 py-3 text-right text-blue-600">
                        {t('leftEarnings')}
                      </th>
                      <th className="px-4 py-3 text-right text-purple-600">
                        {t('rightEarnings')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {t('gap')}
                      </th>
                      <th className="px-4 py-3 text-right text-blue-600">
                        {t('leftPerHour')}
                      </th>
                      <th className="px-4 py-3 text-right text-purple-600">
                        {t('rightPerHour')}
                      </th>
                      <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {t('improvement')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                    {DURATIONS.map(({ value, label }) => {
                      const lRoute = getMatchingLeftRoute(value);
                      const rRoute = getMatchingRightRoute(value);

                      if (!lRoute && !rRoute) return null;

                      const lEarnings = lRoute?.estimatedEarnings ?? 0;
                      const rEarnings = rRoute?.estimatedEarnings ?? 0;
                      const gap = rEarnings - lEarnings;
                      const gapPercent =
                        lEarnings > 0 ? (gap / lEarnings) * 100 : 0;

                      const lPerHour =
                        lRoute && lRoute.estimatedTime > 0
                          ? lRoute.estimatedEarnings /
                            (lRoute.estimatedTime / 60)
                          : 0;
                      const rPerHour =
                        rRoute && rRoute.estimatedTime > 0
                          ? rRoute.estimatedEarnings /
                            (rRoute.estimatedTime / 60)
                          : 0;
                      const perHourImprovement =
                        lPerHour > 0
                          ? ((rPerHour - lPerHour) / lPerHour) * 100
                          : 0;

                      return (
                        <tr
                          key={value}
                          className="hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {label}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                            {lRoute ? `₾${lEarnings.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                            {rRoute ? `₾${rEarnings.toFixed(2)}` : '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${gap > 0 ? 'text-green-600' : gap < 0 ? 'text-red-600' : 'text-gray-500'}`}
                          >
                            {lRoute && rRoute ? (
                              <>
                                {gap > 0 ? '+' : ''}₾{gap.toFixed(2)} (
                                {gapPercent > 0 ? '+' : ''}
                                {gapPercent.toFixed(1)}%)
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                            {lRoute ? `₾${lPerHour.toFixed(2)}/h` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                            {rRoute ? `₾${rPerHour.toFixed(2)}/h` : '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${perHourImprovement > 0 ? 'text-green-600' : perHourImprovement < 0 ? 'text-red-600' : 'text-gray-500'}`}
                          >
                            {lRoute && rRoute ? (
                              <>
                                {perHourImprovement > 0 ? '+' : ''}
                                {perHourImprovement.toFixed(1)}%
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
