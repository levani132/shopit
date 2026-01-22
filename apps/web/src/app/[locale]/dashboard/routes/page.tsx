'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import { Role, hasRole } from '@shopit/constants';
import Image from 'next/image';
import { RouteMap } from '../../../../components/ui/RouteMap';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

// ===================== Types =====================

type ShippingSize = 'regular' | 'large' | 'xl';

// Shipping size styling
const shippingSizeConfig: Record<
  ShippingSize,
  { label: string; icon: string; color: string; bg: string }
> = {
  regular: {
    label: 'sizeRegular',
    icon: '🚗',
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  large: {
    label: 'sizeLarge',
    icon: '🚙',
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  xl: {
    label: 'sizeXL',
    icon: '🚐',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
};

interface Location {
  lat: number;
  lng: number;
  address: string;
  city: string;
}

interface OrderItem {
  name: string;
  nameEn?: string;
  image: string;
  qty: number;
  price: number;
}

interface RouteStop {
  stopId: string;
  orderId?: string;
  type: 'pickup' | 'delivery' | 'break';
  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
  estimatedArrival: string;
  storeName?: string;
  contactName?: string;
  contactPhone?: string;
  orderValue?: number;
  courierEarning?: number;
  breakDurationMinutes?: number;
  shippingSize?: ShippingSize;
  deliveryDeadline?: string;
  orderItems?: OrderItem[];
}

interface RoutePreview {
  duration: number;
  durationLabel: string;
  stops: RouteStop[];
  orderCount: number;
  estimatedEarnings: number;
  estimatedTime: number;
  estimatedDistanceKm: number;
}

interface ActiveRoute {
  _id: string;
  status: string;
  startingPoint: {
    address: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  stops: {
    _id: string;
    orderId?: string;
    type: string;
    status: string;
    location: {
      address: string;
      city: string;
      coordinates: { lat: number; lng: number };
    };
    estimatedArrival?: string;
    actualArrival?: string;
    contactName?: string;
    contactPhone?: string;
    storeName?: string;
    orderValue?: number;
    courierEarning?: number;
    shippingSize?: ShippingSize;
    deliveryDeadline?: string;
    orderItems?: {
      name: string;
      nameEn?: string;
      image: string;
      qty: number;
      price: number;
    }[];
    breakDurationMinutes?: number;
  }[];
  currentStopIndex: number;
  completedStops: number;
  estimatedTotalTime: number;
  estimatedEndTime?: string;
  estimatedEarnings: number;
  actualEarnings: number;
  startedAt?: string;
}

interface SavedAddress {
  _id: string;
  label?: string;
  address: string;
  city: string;
  location?: { lat: number; lng: number };
  isDefault?: boolean;
}

// ===================== Helper Functions =====================

function formatTime(dateString: string, locale: string): string {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ===================== Component =====================

export default function RoutesPage() {
  const t = useTranslations('routes');
  const tCommon = useTranslations('common');
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';

  // State
  const [view, setView] = useState<
    'setup' | 'selection' | 'preview' | 'active'
  >('setup');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [startingPoint, setStartingPoint] = useState<Location | null>(null);
  const [includeBreaks, setIncludeBreaks] = useState(false);
  const [routes, setRoutes] = useState<RoutePreview[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RoutePreview | null>(null);
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [expandedStops, setExpandedStops] = useState<Set<string>>(new Set());

  // Toggle stop expansion
  const toggleStopExpansion = (stopId: string) => {
    setExpandedStops((prev) => {
      const next = new Set(prev);
      if (next.has(stopId)) {
        next.delete(stopId);
      } else {
        next.add(stopId);
      }
      return next;
    });
  };

  // Fetch saved addresses
  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/addresses`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSavedAddresses(data);

        // Auto-select default address if exists
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
      console.error('Error fetching addresses:', err);
    }
  }, []);

  // Check for active route
  const checkActiveRoute = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/routes/active`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.route) {
          setActiveRoute(data.route);
          setView('active');
          return true;
        }
      }
    } catch (err) {
      console.error('Error checking active route:', err);
    }
    return false;
  }, []);

  // Generate routes
  const generateRoutes = useCallback(async () => {
    if (!startingPoint) return;

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/routes/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startingPoint,
          includeBreaks,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoutes(data.routes);
        setView('selection');
        setRefreshCountdown(30);
      } else {
        const errorData = await response.json();
        setError(errorData.message || t('errorGenerating'));
      }
    } catch (err) {
      console.error('Error generating routes:', err);
      setError(t('errorGenerating'));
    } finally {
      setGenerating(false);
    }
  }, [startingPoint, includeBreaks, t]);

  // Claim route
  const claimRoute = async () => {
    if (!selectedRoute || !startingPoint) return;

    setClaiming(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/routes/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: selectedRoute.duration,
          stops: selectedRoute.stops.map((s) => ({
            stopId: s.stopId,
            orderId: s.orderId,
            type: s.type,
          })),
          orderIds: selectedRoute.stops
            .filter((s) => s.orderId)
            .map((s) => s.orderId)
            .filter((id, i, arr) => arr.indexOf(id) === i), // Unique
          startingPoint,
          includeBreaks,
        }),
      });

      if (response.ok) {
        const route = await response.json();
        setActiveRoute(route);
        setView('active');
      } else {
        const errorData = await response.json();
        setError(errorData.message || t('errorClaiming'));
        // Regenerate routes if orders were taken
        if (response.status === 400) {
          generateRoutes();
        }
      }
    } catch (err) {
      console.error('Error claiming route:', err);
      setError(t('errorClaiming'));
    } finally {
      setClaiming(false);
    }
  };

  // Update progress
  const updateProgress = async (
    stopIndex: number,
    action: 'arrived' | 'completed' | 'skipped',
  ) => {
    if (!activeRoute) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/routes/${activeRoute._id}/progress`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stopIndex, action }),
        },
      );

      if (response.ok) {
        const updatedRoute = await response.json();
        setActiveRoute(updatedRoute);

        // Check if route is complete
        if (updatedRoute.status === 'completed') {
          setView('setup');
          setActiveRoute(null);
        }
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  // Cannot carry more
  const handleCannotCarry = async () => {
    if (!activeRoute) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/routes/${activeRoute._id}/cannot-carry`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (response.ok) {
        const updatedRoute = await response.json();
        setActiveRoute(updatedRoute);
      }
    } catch (err) {
      console.error('Error handling cannot carry:', err);
    }
  };

  // Abandon route
  const abandonRoute = async () => {
    if (!activeRoute) return;

    if (!window.confirm(t('confirmAbandon'))) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/routes/${activeRoute._id}/abandon`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );

      if (response.ok) {
        setActiveRoute(null);
        setView('setup');
      }
    } catch (err) {
      console.error('Error abandoning route:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasRole(user.role ?? 0, Role.COURIER)) {
      setError('You must be a courier to access this page');
      setLoading(false);
      return;
    }

    const init = async () => {
      setLoading(true);
      const hasActive = await checkActiveRoute();
      if (!hasActive) {
        await fetchAddresses();
      }
      setLoading(false);
    };

    init();
  }, [authLoading, user, checkActiveRoute, fetchAddresses]);

  // Countdown timer for route refresh
  useEffect(() => {
    if (view !== 'selection' || refreshCountdown <= 0) return;

    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          generateRoutes();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [view, refreshCountdown, generateRoutes]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-200 dark:bg-zinc-700 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !routes.length && !activeRoute) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // ===================== View: Active Route =====================
  if (view === 'active' && activeRoute) {
    const currentStop = activeRoute.stops[activeRoute.currentStopIndex];
    const upcomingStops = activeRoute.stops.slice(
      activeRoute.currentStopIndex + 1,
    );

    // Check if any upcoming stop is about 1 hour away
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const callAheadStop = upcomingStops.find((stop) => {
      if (!stop.estimatedArrival) return false;
      const arrival = new Date(stop.estimatedArrival);
      const diff = Math.abs(arrival.getTime() - oneHourFromNow.getTime());
      return diff < 15 * 60 * 1000; // Within 15 minutes of 1 hour
    });

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              {t('activeRoute')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {activeRoute.completedStops}/{activeRoute.stops.length}{' '}
              {t('stopsCompleted')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('estimatedEnd')}
            </p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {activeRoute.estimatedEndTime
                ? formatTime(activeRoute.estimatedEndTime, locale)
                : '-'}
            </p>
          </div>
        </div>

        {/* Earnings Progress */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-zinc-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('earnings')}
            </span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              ₾{activeRoute.actualEarnings.toFixed(2)} / ₾
              {activeRoute.estimatedEarnings.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{
                width: `${(activeRoute.completedStops / activeRoute.stops.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Call Ahead Warning */}
        {callAheadStop && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📞</span>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {t('callAheadReminder')}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {callAheadStop.storeName || callAheadStop.contactName} -{' '}
                  {callAheadStop.location.address}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Stop */}
        {currentStop && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">
                {currentStop.type === 'pickup'
                  ? '📦'
                  : currentStop.type === 'delivery'
                    ? '🏠'
                    : '☕'}
              </span>
              <span className="px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded-full">
                {t('nextStop')}
              </span>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {currentStop.type === 'pickup'
                ? t('pickupFrom', { name: currentStop.storeName || '' })
                : currentStop.type === 'delivery'
                  ? t('deliverTo', { name: currentStop.contactName || '' })
                  : t('takeBreak')}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              📍 {currentStop.location.address}, {currentStop.location.city}
            </p>

            {/* Order Items */}
            {currentStop.orderItems && currentStop.orderItems.length > 0 && (
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('items')}:
                </p>
                <div className="space-y-2">
                  {currentStop.orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={item.image || '/placeholder.png'}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">
                          {locale === 'en' && item.nameEn
                            ? item.nameEn
                            : item.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          × {item.qty}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Courier Earning */}
            {currentStop.type === 'delivery' &&
              currentStop.courierEarning !== undefined && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-4">
                  💰 {t('yourEarning')}: ₾
                  {currentStop.courierEarning.toFixed(2)}
                </p>
              )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${currentStop.location.address} ${currentStop.location.city}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                🗺️ {t('navigate')}
              </a>

              {currentStop.contactPhone && (
                <a
                  href={`tel:${currentStop.contactPhone}`}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  📞 {t('call')}
                </a>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              {currentStop.status === 'pending' && (
                <button
                  onClick={() =>
                    updateProgress(activeRoute.currentStopIndex, 'arrived')
                  }
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                >
                  {t('markArrived')}
                </button>
              )}

              {currentStop.status === 'arrived' && (
                <button
                  onClick={() =>
                    updateProgress(activeRoute.currentStopIndex, 'completed')
                  }
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  ✓{' '}
                  {currentStop.type === 'pickup'
                    ? t('pickedUp')
                    : t('delivered')}
                </button>
              )}

              {currentStop.type === 'pickup' && (
                <button
                  onClick={handleCannotCarry}
                  className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium rounded-lg transition-colors hover:bg-orange-200 dark:hover:bg-orange-900/50"
                >
                  {t('cannotCarry')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {t('upcomingStops')}
          </h3>
          <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              📋 {t('list')}
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-zinc-700 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              🗺️ {t('map')}
            </button>
          </div>
        </div>

        {/* Upcoming Stops List */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {upcomingStops.map((stop, idx) => (
              <div
                key={stop._id}
                className={`bg-white dark:bg-zinc-800 rounded-lg p-4 border ${
                  stop.status === 'completed'
                    ? 'border-green-200 dark:border-green-800 opacity-60'
                    : 'border-gray-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {stop.type === 'pickup'
                      ? '📦'
                      : stop.type === 'delivery'
                        ? '🏠'
                        : '☕'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {stop.type === 'pickup'
                        ? stop.storeName
                        : stop.type === 'delivery'
                          ? stop.contactName
                          : t('break')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stop.location.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {stop.estimatedArrival
                        ? formatTime(stop.estimatedArrival, locale)
                        : '-'}
                    </p>
                    {stop.status === 'completed' && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <RouteMap
            stops={[
              // Current stop
              ...(currentStop
                ? [
                    {
                      id: currentStop._id,
                      type: currentStop.type as 'pickup' | 'delivery' | 'break',
                      coordinates: currentStop.location.coordinates,
                      address: `${currentStop.location.address}, ${currentStop.location.city}`,
                      label:
                        currentStop.type === 'pickup'
                          ? currentStop.storeName
                          : currentStop.contactName,
                      status: currentStop.status as
                        | 'pending'
                        | 'arrived'
                        | 'completed'
                        | 'skipped',
                      isCurrentStop: true,
                    },
                  ]
                : []),
              // Upcoming stops
              ...upcomingStops.map((stop) => ({
                id: stop._id,
                type: stop.type as 'pickup' | 'delivery' | 'break',
                coordinates: stop.location.coordinates,
                address: `${stop.location.address}, ${stop.location.city}`,
                label:
                  stop.type === 'pickup' ? stop.storeName : stop.contactName,
                status: stop.status as
                  | 'pending'
                  | 'arrived'
                  | 'completed'
                  | 'skipped',
              })),
            ]}
            startingPoint={activeRoute.startingPoint.coordinates}
            currentStopIndex={0}
            height="320px"
          />
        )}

        {/* Abandon Button */}
        <button
          onClick={abandonRoute}
          className="w-full mt-6 px-4 py-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors hover:bg-red-200 dark:hover:bg-red-900/40"
        >
          🚫 {t('abandonRoute')}
        </button>
      </div>
    );
  }

  // ===================== View: Route Preview =====================
  if (view === 'preview' && selectedRoute) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => {
            setSelectedRoute(null);
            setView('selection');
          }}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          ← {t('backToRoutes')}
        </button>

        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('routePreviewTitle', { duration: selectedRoute.durationLabel })}
        </h1>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <span>
            {selectedRoute.orderCount} {t('orders')}
          </span>
          <span>•</span>
          <span className="text-green-600 dark:text-green-400 font-medium">
            ₾{selectedRoute.estimatedEarnings.toFixed(2)}
          </span>
          <span>•</span>
          <span>{selectedRoute.estimatedDistanceKm} km</span>
          <span>•</span>
          <span>
            ⏱️{' '}
            {Math.floor(selectedRoute.estimatedTime / 60) > 0
              ? `${Math.floor(selectedRoute.estimatedTime / 60)}h `
              : ''}
            {selectedRoute.estimatedTime % 60}min
          </span>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1 w-fit mb-6">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-zinc-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            📋 {t('list')}
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-white dark:bg-zinc-700 shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            🗺️ {t('map')}
          </button>
        </div>

        {/* Stops List - Enhanced Card View */}
        {viewMode === 'list' && (
          <div className="space-y-4 mb-6">
            {selectedRoute.stops.map((stop, idx) => {
              const isExpanded = expandedStops.has(stop.stopId);
              const sizeConfig = stop.shippingSize
                ? shippingSizeConfig[stop.shippingSize]
                : null;
              const isPickup = stop.type === 'pickup';
              const isDelivery = stop.type === 'delivery';
              const isBreak = stop.type === 'break';

              return (
                <div
                  key={stop.stopId}
                  className={`bg-white dark:bg-zinc-800 rounded-xl border overflow-hidden transition-all ${
                    isPickup
                      ? 'border-blue-200 dark:border-blue-800'
                      : isDelivery
                        ? 'border-green-200 dark:border-green-800'
                        : 'border-gray-200 dark:border-zinc-700'
                  }`}
                >
                  {/* Stop Header */}
                  <div
                    className={`p-4 ${
                      isPickup
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : isDelivery
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-gray-50 dark:bg-zinc-900/50'
                    } border-b border-gray-200 dark:border-zinc-700`}
                  >
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      {/* Stop Number & Type */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-xl">
                              {isPickup ? '📦' : isDelivery ? '🏠' : '☕'}
                            </span>
                            {isPickup
                              ? t('pickup')
                              : isDelivery
                                ? t('delivery')
                                : t('break')}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {stop.storeName || stop.contactName || stop.address}
                          </p>
                        </div>
                      </div>

                      {/* Shipping Size */}
                      {sizeConfig && (
                        <div className="text-center">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${sizeConfig.bg} ${sizeConfig.color}`}
                          >
                            <span>{sizeConfig.icon}</span>
                            <span className="text-xs font-medium">
                              {t(sizeConfig.label)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ETA & Earnings */}
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('estimatedTime')}
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatTime(stop.estimatedArrival, locale)}
                        </p>
                        {isDelivery && stop.courierEarning !== undefined && (
                          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                            +₾{stop.courierEarning.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stop Body */}
                  <div className="p-4">
                    {/* Address with Mini Map Preview */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        📍 {stop.address}, {stop.city}
                      </p>
                      {/* Mini Map Preview */}
                      <div className="h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700">
                        <RouteMap
                          stops={[
                            {
                              id: stop.stopId,
                              type: stop.type as
                                | 'pickup'
                                | 'delivery'
                                | 'break',
                              coordinates: stop.coordinates,
                              address: `${stop.address}, ${stop.city}`,
                              label: stop.storeName || stop.contactName,
                            },
                          ]}
                          height="128px"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!isBreak && (
                      <div className="flex gap-2 mb-4">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${stop.address} ${stop.city}`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                            />
                          </svg>
                          {t('openInMaps')}
                        </a>
                        {stop.contactPhone && (
                          <a
                            href={`tel:${stop.contactPhone}`}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            {isPickup ? t('callShop') : t('callCustomer')}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Order Items Accordion (only for pickup/delivery with items) */}
                    {!isBreak &&
                      stop.orderItems &&
                      stop.orderItems.length > 0 && (
                        <>
                          <button
                            onClick={() => toggleStopExpansion(stop.stopId)}
                            className="w-full flex items-center justify-between py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                />
                              </svg>
                              {stop.orderItems.length} {t('items')}
                            </span>
                            <span className="flex items-center gap-1">
                              {isExpanded ? t('hideItems') : t('showItems')}
                              <svg
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2 bg-gray-50 dark:bg-zinc-900/50 rounded-lg p-3">
                              {stop.orderItems.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className="flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-lg p-2"
                                >
                                  <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                    <Image
                                      src={item.image || '/placeholder.png'}
                                      alt={item.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {locale === 'en' && item.nameEn
                                        ? item.nameEn
                                        : item.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      × {item.qty}
                                    </p>
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    ₾{(item.price * item.qty).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                    {/* Break info */}
                    {isBreak && stop.breakDurationMinutes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ☕ {stop.breakDurationMinutes} {t('minutes')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="mb-6">
            <RouteMap
              stops={selectedRoute.stops.map((stop) => ({
                id: stop.stopId,
                type: stop.type as 'pickup' | 'delivery' | 'break',
                coordinates: stop.coordinates,
                address: `${stop.address}, ${stop.city}`,
                label:
                  stop.type === 'pickup' ? stop.storeName : stop.contactName,
              }))}
              startingPoint={startingPoint || undefined}
              height="320px"
            />
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={claimRoute}
          disabled={claiming}
          className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {claiming ? t('starting') : t('startRoute')}
        </button>
      </div>
    );
  }

  // ===================== View: Route Selection =====================
  if (view === 'selection') {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('availableRoutes')}
        </h1>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            📍 {startingPoint?.address}
          </p>
          <button
            onClick={() => setView('setup')}
            className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
          >
            {tCommon('change')}
          </button>
        </div>

        {/* Breaks Toggle */}
        <label className="flex items-center gap-2 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={includeBreaks}
            onChange={(e) => {
              setIncludeBreaks(e.target.checked);
              generateRoutes();
            }}
            className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-gray-700 dark:text-gray-300">
            {t('includeBreaks')}
          </span>
        </label>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {routes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
              <span className="text-3xl">📦</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('noRoutesAvailable')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('noRoutesDescription')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {routes.map((route) => (
              <button
                key={route.duration}
                onClick={() => {
                  setSelectedRoute(route);
                  setView('preview');
                }}
                className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left"
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  ~{route.durationLabel}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  ⏱️{' '}
                  {Math.floor(route.estimatedTime / 60) > 0
                    ? `${Math.floor(route.estimatedTime / 60)}h `
                    : ''}
                  {route.estimatedTime % 60}min
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {route.orderCount} {t('orders')}
                </p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  ₾{route.estimatedEarnings.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {route.estimatedDistanceKm} km
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Refresh countdown */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          🔄 {t('refreshingIn', { seconds: refreshCountdown })}
        </p>
      </div>
    );
  }

  // ===================== View: Setup (Starting Position) =====================
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('planRoute')}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {t('setStartingPoint')}
      </p>

      {/* Saved Addresses */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          📍 {t('chooseStarting')}
        </h3>

        {savedAddresses.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            {t('noSavedAddresses')}
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
                  {addr.isDefault && (
                    <span className="text-xs bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                      {t('default')}
                    </span>
                  )}
                </label>
              ))}
          </div>
        )}

        <a
          href={`/${locale}/dashboard/addresses`}
          className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
        >
          + {t('addNewAddress')}
        </a>
      </div>

      {/* Breaks Option */}
      <label className="flex items-center gap-2 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={includeBreaks}
          onChange={(e) => setIncludeBreaks(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-gray-700 dark:text-gray-300">
          {t('includeBreaksDescription')}
        </span>
      </label>

      {/* Continue Button */}
      <button
        onClick={generateRoutes}
        disabled={!startingPoint || generating}
        className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? t('generating') : t('continue')}
      </button>
    </div>
  );
}
