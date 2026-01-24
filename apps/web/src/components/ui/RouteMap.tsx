'use client';

import { useState, useEffect, useMemo } from 'react';

// Tbilisi center coordinates
const DEFAULT_CENTER = { lat: 41.7151, lng: 44.8271 };
const DEFAULT_ZOOM = 13;

// Valid coordinate bounds for Georgia region
const VALID_LAT_MIN = 41.0;
const VALID_LAT_MAX = 43.5;
const VALID_LNG_MIN = 40.0;
const VALID_LNG_MAX = 47.0;

// CartoDB Voyager tiles - same as AddressPicker
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

/**
 * Check if coordinates are valid (within Georgia region and not default 0,0)
 */
function isValidCoordinate(
  coord: { lat: number; lng: number } | undefined | null,
): boolean {
  if (!coord) return false;
  if (typeof coord.lat !== 'number' || typeof coord.lng !== 'number')
    return false;
  if (isNaN(coord.lat) || isNaN(coord.lng)) return false;
  // Filter out 0,0 (null island) and coordinates outside Georgia region
  if (coord.lat === 0 && coord.lng === 0) return false;
  if (coord.lat < VALID_LAT_MIN || coord.lat > VALID_LAT_MAX) return false;
  if (coord.lng < VALID_LNG_MIN || coord.lng > VALID_LNG_MAX) return false;
  return true;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface RouteStop {
  id: string;
  type: 'pickup' | 'delivery' | 'break' | 'start';
  coordinates: Coordinates;
  address: string;
  label?: string;
  status?: 'pending' | 'arrived' | 'completed' | 'skipped';
  isCurrentStop?: boolean;
}

interface RouteMapProps {
  stops: RouteStop[];
  startingPoint?: Coordinates;
  currentLocation?: Coordinates;
  vehicleType?: string;
  currentStopIndex?: number;
  height?: string;
  className?: string;
}

// Dynamic import wrapper component for Leaflet map
function LeafletMap({
  stops,
  startingPoint,
  currentLocation,
  vehicleType = 'car',
  currentStopIndex = 0,
  height = '320px',
}: RouteMapProps) {
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const [MapContainer, setMapContainer] = useState<
    typeof import('react-leaflet').MapContainer | null
  >(null);
  const [TileLayer, setTileLayer] = useState<
    typeof import('react-leaflet').TileLayer | null
  >(null);
  const [Marker, setMarker] = useState<
    typeof import('react-leaflet').Marker | null
  >(null);
  const [Popup, setPopup] = useState<
    typeof import('react-leaflet').Popup | null
  >(null);
  const [Polyline, setPolyline] = useState<
    typeof import('react-leaflet').Polyline | null
  >(null);
  const [useMap, setUseMap] = useState<
    typeof import('react-leaflet').useMap | null
  >(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Dark mode detection
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDarkMode(hasDarkClass);
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  // Dynamic import of Leaflet and React-Leaflet
  useEffect(() => {
    Promise.all([import('leaflet'), import('react-leaflet')]).then(
      ([leaflet, reactLeaflet]) => {
        // Fix default marker icons
        delete (
          leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown }
        )._getIconUrl;
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        setL(leaflet);
        setMapContainer(() => reactLeaflet.MapContainer);
        setTileLayer(() => reactLeaflet.TileLayer);
        setMarker(() => reactLeaflet.Marker);
        setPopup(() => reactLeaflet.Popup);
        setPolyline(() => reactLeaflet.Polyline);
        setUseMap(() => reactLeaflet.useMap);
        setIsLoaded(true);
      },
    );
  }, []);

  // Filter stops with valid coordinates
  const validStops = useMemo(() => {
    return stops.filter((s) => isValidCoordinate(s.coordinates));
  }, [stops]);

  // Calculate bounds to fit all markers
  const bounds = useMemo(() => {
    if (!L || validStops.length === 0) return null;

    const allPoints: Coordinates[] = [
      ...(startingPoint && isValidCoordinate(startingPoint)
        ? [startingPoint]
        : []),
      ...(currentLocation && isValidCoordinate(currentLocation)
        ? [currentLocation]
        : []),
      ...validStops.map((s) => s.coordinates),
    ];

    if (allPoints.length === 0) return null;

    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);

    return L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    );
  }, [L, validStops, startingPoint, currentLocation]);

  // Create custom icons for different stop types
  const createIcon = useMemo(() => {
    if (!L) return null;

    return (
      type: 'pickup' | 'delivery' | 'break' | 'start',
      isCurrentStop: boolean,
      status?: string,
    ) => {
      const colors = {
        start: '#6366f1', // Indigo
        pickup: '#f59e0b', // Amber
        delivery: '#10b981', // Emerald
        break: '#8b5cf6', // Violet
      };

      const icons = {
        start: '🏠',
        pickup: '📦',
        delivery: '🏠',
        break: '☕',
      };

      const bgColor =
        status === 'completed' ? '#9ca3af' : colors[type] || '#6b7280';
      const size = isCurrentStop ? 40 : 32;
      const emoji = icons[type] || '📍';

      const html = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${bgColor};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isCurrentStop ? '18px' : '14px'};
          ${isCurrentStop ? 'animation: pulse 2s infinite;' : ''}
        ">
          ${emoji}
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>
      `;

      return L.divIcon({
        html,
        className: 'custom-marker route-map-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });
    };
  }, [L]);

  // Create numbered icon
  const createNumberedIcon = useMemo(() => {
    if (!L) return null;

    return (
      number: number,
      type: 'pickup' | 'delivery' | 'break' | 'start',
      isCurrentStop: boolean,
      status?: string,
    ) => {
      const colors = {
        start: '#6366f1',
        pickup: '#f59e0b',
        delivery: '#10b981',
        break: '#8b5cf6',
      };

      const bgColor =
        status === 'completed' ? '#9ca3af' : colors[type] || '#6b7280';
      const size = isCurrentStop ? 44 : 36;

      const html = `
        <div class="route-map-marker" style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${bgColor};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isCurrentStop ? '16px' : '13px'};
          font-weight: bold;
          color: white;
          ${isCurrentStop ? 'animation: pulse 2s infinite;' : ''}
        ">
          ${number}
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>
      `;

      return L.divIcon({
        html,
        className: 'custom-marker route-map-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });
    };
  }, [L]);

  // Route line coordinates (only valid coordinates)
  const routeLine = useMemo(() => {
    const points: [number, number][] = [];
    // Start route line from current location (not home)
    if (currentLocation && isValidCoordinate(currentLocation)) {
      points.push([currentLocation.lat, currentLocation.lng]);
    }
    validStops.forEach((stop) => {
      points.push([stop.coordinates.lat, stop.coordinates.lng]);
    });
    return points;
  }, [validStops, currentLocation]);

  // Map center (use first valid coordinate or default)
  const center = useMemo(() => {
    if (startingPoint && isValidCoordinate(startingPoint)) return startingPoint;
    if (validStops.length > 0) return validStops[0].coordinates;
    return DEFAULT_CENTER;
  }, [startingPoint, validStops]);

  // Fit bounds component
  const FitBounds = ({
    bounds: b,
  }: {
    bounds: import('leaflet').LatLngBounds;
  }) => {
    const map = useMap?.();
    useEffect(() => {
      if (map && b) {
        map.fitBounds(b, { padding: [50, 50] });
      }
    }, [map, b]);
    return null;
  };

  if (
    !isLoaded ||
    !MapContainer ||
    !TileLayer ||
    !Marker ||
    !Popup ||
    !Polyline ||
    !L
  ) {
    return (
      <div
        className="bg-gray-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  // Dark mode filter style - same as AddressPicker
  const mapStyle = {
    height,
    width: '100%',
    borderRadius: '0.75rem',
  };

  // Counter-invert style for markers in dark mode
  const markerCounterInvertStyle = isDarkMode
    ? 'filter: invert(1) hue-rotate(180deg) brightness(1.6);'
    : '';

  // Container style with dark mode filter
  const containerStyle = isDarkMode
    ? {
        filter: 'invert(1) hue-rotate(180deg) brightness(3) contrast(0.95)',
      }
    : undefined;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <style>{`
        .route-map-marker {
          ${markerCounterInvertStyle}
        }
      `}</style>
      <div
        className="border border-gray-200 dark:border-zinc-700 shadow-sm rounded-xl overflow-hidden"
        style={containerStyle}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={DEFAULT_ZOOM}
          style={mapStyle}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url={TILE_URL}
          />

          {/* Fit bounds */}
          {bounds && useMap && <FitBounds bounds={bounds} />}

          {/* Route line */}
          {routeLine.length > 1 && (
            <Polyline
              positions={routeLine}
              pathOptions={{
                color: '#6366f1',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10',
              }}
            />
          )}

          {/* Current location marker (where the courier is now) */}
          {currentLocation &&
            isValidCoordinate(currentLocation) &&
            L &&
            (() => {
              // Vehicle icons based on courier's selected vehicle type
              const vehicleIcons: Record<string, string> = {
                bicycle: '🚲',
                bike: '🚲',
                motorcycle: '🏍️',
                scooter: '🛵',
                car: '🚗',
                suv: '🚙',
                van: '🚐',
                truck: '🚚',
                walking: '🚶',
              };
              const vehicleIcon = vehicleIcons[vehicleType] || '🚗';

              // Apply counter-invert filter directly inline for dark mode
              const filterStyle = isDarkMode
                ? 'filter: invert(1) hue-rotate(180deg) brightness(1.6);'
                : '';

              const html = `
              <div style="
                width: 44px;
                height: 44px;
                background-color: #ef4444;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                ${filterStyle}
              ">
                ${vehicleIcon}
              </div>
            `;

              return (
                <Marker
                  position={[currentLocation.lat, currentLocation.lng]}
                  icon={L.divIcon({
                    html,
                    className: 'custom-marker',
                    iconSize: [44, 44],
                    iconAnchor: [22, 22],
                    popupAnchor: [0, -22],
                  })}
                >
                  <Popup>
                    <div className="text-center">
                      <strong>Your Location</strong>
                    </div>
                  </Popup>
                </Marker>
              );
            })()}

          {/* Stop markers (only valid coordinates) */}
          {validStops.map((stop, index) => {
            const isCurrentStop = index === currentStopIndex;
            const icon = createNumberedIcon
              ? createNumberedIcon(
                  index + 1,
                  stop.type,
                  isCurrentStop,
                  stop.status,
                )
              : undefined;

            return (
              <Marker
                key={stop.id}
                position={[stop.coordinates.lat, stop.coordinates.lng]}
                icon={icon}
              >
                <Popup>
                  <div className="min-w-[150px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {stop.type === 'pickup'
                          ? '📦'
                          : stop.type === 'delivery'
                            ? '🏠'
                            : '☕'}
                      </span>
                      <strong>
                        {stop.type === 'pickup'
                          ? 'Pickup'
                          : stop.type === 'delivery'
                            ? 'Delivery'
                            : 'Break'}
                      </strong>
                    </div>
                    {stop.label && (
                      <p className="text-sm font-medium">{stop.label}</p>
                    )}
                    <p className="text-sm text-gray-600">{stop.address}</p>
                    {stop.status && (
                      <p
                        className={`text-xs mt-1 ${
                          stop.status === 'completed'
                            ? 'text-green-600'
                            : stop.status === 'arrived'
                              ? 'text-blue-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {stop.status === 'completed'
                          ? '✓ Completed'
                          : stop.status === 'arrived'
                            ? '📍 Arrived'
                            : stop.status === 'skipped'
                              ? '⏭ Skipped'
                              : '⏳ Pending'}
                      </p>
                    )}
                    {isCurrentStop && (
                      <p className="text-xs text-indigo-600 font-medium mt-1">
                        ➤ Current Stop
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}

export function RouteMap(props: RouteMapProps) {
  const { className = '', height = '320px' } = props;

  return (
    <div className={`rounded-xl overflow-hidden ${className}`}>
      <LeafletMap {...props} height={height} />
    </div>
  );
}

export default RouteMap;
