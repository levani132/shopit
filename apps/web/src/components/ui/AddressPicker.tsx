'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

// Tbilisi default coordinates
const TBILISI_CENTER = { lat: 41.7151, lng: 44.8271 };
const DEFAULT_ZOOM = 13;

// CartoDB Voyager tiles - we'll use CSS filters for dark mode
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

// Photon API for geocoding (free, OpenStreetMap-based)
const PHOTON_API_SEARCH = 'https://photon.komoot.io/api';
const PHOTON_API_REVERSE = 'https://photon.komoot.io/reverse';

interface Location {
  lat: number;
  lng: number;
}

interface AddressResult {
  address: string;
  location: Location;
}

interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

interface AddressPickerProps {
  value?: AddressResult;
  onChange: (result: AddressResult) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

// Format address from Photon result
function formatAddress(props: PhotonFeature['properties']): string {
  const parts: string[] = [];

  if (props.housenumber && props.street) {
    parts.push(`${props.street} ${props.housenumber}`);
  } else if (props.street) {
    parts.push(props.street);
  } else if (props.name) {
    parts.push(props.name);
  }

  if (props.city) {
    parts.push(props.city);
  }

  if (props.country) {
    parts.push(props.country);
  }

  return parts.join(', ');
}

// The actual map component (loaded dynamically to avoid SSR issues)
function AddressPickerMap({
  value,
  onChange,
  placeholder,
  disabled,
  error,
  className,
}: AddressPickerProps) {
  const t = useTranslations('common');
  // Initialize searchQuery from value prop
  const [searchQuery, setSearchQuery] = useState(value?.address || '');
  const [searchResults, setSearchResults] = useState<PhotonFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mapCenter, setMapCenter] = useState<Location>(
    value?.location || TBILISI_CENTER,
  );
  const [markerPosition, setMarkerPosition] = useState<Location | null>(
    value?.location || null,
  );
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync searchQuery when value prop changes (e.g., on page load with saved data)
  useEffect(() => {
    if (value?.address && value.address !== searchQuery) {
      setSearchQuery(value.address);
    }
    if (value?.location) {
      setMarkerPosition(value.location);
      setMapCenter(value.location);
    }
  }, [value?.address, value?.location]);

  // Dark mode detection
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for dark mode - prioritize the 'dark' class on html element
    const checkDarkMode = () => {
      // Check if html has 'dark' class (Tailwind dark mode)
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDarkMode(hasDarkClass);
    };

    checkDarkMode();

    // Watch for dark mode changes on html element
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Also listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

  // Import Leaflet dynamically
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
  const [useMapEvents, setUseMapEvents] = useState<
    typeof import('react-leaflet').useMapEvents | null
  >(null);
  const [useMap, setUseMap] = useState<
    typeof import('react-leaflet').useMap | null
  >(null);

  useEffect(() => {
    // Dynamic imports for Leaflet (SSR-safe)
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
        setUseMapEvents(() => reactLeaflet.useMapEvents);
        setUseMap(() => reactLeaflet.useMap);
      },
    );
  }, []);

  // Search for addresses using Photon API
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Bias results towards Georgia
      const response = await fetch(
        `${PHOTON_API_SEARCH}?q=${encodeURIComponent(query)}&lat=${TBILISI_CENTER.lat}&lon=${TBILISI_CENTER.lng}&limit=5&lang=en`,
      );
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowResults(true);
    } catch (err) {
      console.error('Address search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(query);
    }, 300);
  };

  // Select address from search results
  const handleSelectAddress = (feature: PhotonFeature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const address = formatAddress(feature.properties);
    const location = { lat, lng };

    setSearchQuery(address);
    setMarkerPosition(location);
    setMapCenter(location);
    setShowResults(false);
    onChange({ address, location });
  };

  // Reverse geocode from coordinates
  const reverseGeocode = useCallback(
    async (location: Location) => {
      try {
        const response = await fetch(
          `${PHOTON_API_REVERSE}?lat=${location.lat}&lon=${location.lng}&lang=en`,
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const address = formatAddress(data.features[0].properties);
          setSearchQuery(address);
          onChange({ address, location });
        } else {
          // If no address found, use coordinates
          const address = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
          setSearchQuery(address);
          onChange({ address, location });
        }
      } catch (err) {
        console.error('Reverse geocode error:', err);
        const address = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        setSearchQuery(address);
        onChange({ address, location });
      }
    },
    [onChange],
  );

  // Map click handler component
  const MapClickHandler = () => {
    if (!useMapEvents) return null;

    useMapEvents({
      click: (e) => {
        if (disabled) return;
        const location = { lat: e.latlng.lat, lng: e.latlng.lng };
        setMarkerPosition(location);
        reverseGeocode(location);
      },
    });
    return null;
  };

  // Component to update map center when it changes
  const MapCenterUpdater = ({ center }: { center: Location }) => {
    const map = useMap?.();
    useEffect(() => {
      if (map && center) {
        map.flyTo([center.lat, center.lng], 16, { duration: 0.5 });
      }
    }, [map, center]);
    return null;
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Custom marker icon with accent color
  // Note: When dark mode filter is applied, we counter-invert the marker
  const customIcon = L?.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 42px;
        position: relative;
        ${isDarkMode ? 'filter: invert(1) hue-rotate(180deg) brightness(1.1) contrast(1.1);' : ''}
      ">
        <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="var(--accent-500, #6366f1)"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  });

  if (!MapContainer || !TileLayer || !Marker || !L) {
    return (
      <div className={`rounded-xl overflow-hidden ${className}`}>
        <div className="h-64 bg-gray-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center">
          <span className="text-gray-400 dark:text-gray-500">
            {t('loadingMap')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder={placeholder || t('searchAddress')}
            disabled={disabled}
            className={`w-full px-4 py-3 pl-11 border rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent transition-all ${
              error
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-zinc-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            {isSearching ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-[1000] w-full mt-1 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
            {searchResults.map((feature, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectAddress(feature)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors flex items-start gap-3 border-b border-gray-100 dark:border-zinc-700 last:border-0"
              >
                <svg
                  className="w-5 h-5 text-[var(--accent-500)] flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {feature.properties.name ||
                      feature.properties.street ||
                      'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {formatAddress(feature.properties)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div
        className={`rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 shadow-sm transition-all duration-300 ${
          isDarkMode ? 'map-dark-mode' : ''
        }`}
        style={
          isDarkMode
            ? {
                filter:
                  'invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)',
              }
            : undefined
        }
      >
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={DEFAULT_ZOOM}
          style={{ height: '280px', width: '100%' }}
          className="z-0"
        >
          {/* CartoDB Voyager tiles - CSS filter applied for dark mode */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url={TILE_URL}
          />

          <MapClickHandler />
          {markerPosition && <MapCenterUpdater center={markerPosition} />}

          {markerPosition && (
            <Marker
              position={[markerPosition.lat, markerPosition.lng]}
              icon={customIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  const location = { lat: position.lat, lng: position.lng };
                  setMarkerPosition(location);
                  reverseGeocode(location);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('addressPickerHelp')}
      </p>

      {/* Error message */}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Export with dynamic import (no SSR)
export const AddressPicker = dynamic(() => Promise.resolve(AddressPickerMap), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl overflow-hidden">
      <div className="h-64 bg-gray-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center">
        <span className="text-gray-400 dark:text-gray-500">Loading map...</span>
      </div>
    </div>
  ),
});

export type { AddressResult, Location };
