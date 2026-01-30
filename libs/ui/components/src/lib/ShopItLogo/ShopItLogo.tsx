'use client';

// ============================================
// ICON PROPORTIONS - Adjust these to match PNG icons
// All values are percentages (0.0 - 1.0)
// ============================================
const ICON_PROPORTIONS = {
  bagSize: 0.84, // Bag size relative to total icon size
  handleHeight: 0.2, // Handle height relative to total icon size
  handleWidth: 0.5, // Handle width relative to total icon size
  handleTopOffset: 0.02, // Handle top offset relative to total icon size (0 = flush top)
  handleStrokeWidth: 2, // Handle stroke width (in SVG viewBox units, viewBox is 24x12)
  borderRadius: 0.4, // Border radius relative to bag size (0.5 = circle)
  sFontSize: 0.7, // 'S' font size relative to bag size
  sStretchX: 1.1, // Horizontal stretch for 'S' (1.0 = normal, >1 = wider)
};

export interface ShopItLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'auto' | 'light' | 'dark'; // auto = follows theme, light = for dark backgrounds, dark = for light backgrounds
  useStoreAccent?: boolean; // Use store's accent color instead of global accent
  className?: string;
}

const SIZES = {
  sm: {
    icon: 24,
    text: 'text-lg',
    gap: 'gap-1.5',
    fontSize: 'text-sm',
  },
  md: {
    icon: 32,
    text: 'text-xl',
    gap: 'gap-2',
    fontSize: 'text-base',
  },
  lg: {
    icon: 40,
    text: 'text-2xl',
    gap: 'gap-2.5',
    fontSize: 'text-lg',
  },
  xl: {
    icon: 52,
    text: 'text-3xl',
    gap: 'gap-3',
    fontSize: 'text-xl',
  },
};

/**
 * ShopIt logo component with shopping bag icon and text.
 * Supports multiple sizes, variants, and theming options.
 */
export function ShopItLogo({
  size = 'md',
  showText = true,
  variant = 'auto',
  useStoreAccent = false,
  className = '',
}: ShopItLogoProps) {
  const { icon: iconSize, text: textSize, gap } = SIZES[size];

  // Determine text color based on variant
  const textColorClass =
    variant === 'light'
      ? 'text-white'
      : variant === 'dark'
        ? 'text-gray-900'
        : 'text-gray-900 dark:text-white';

  // Use shared proportions
  const bagSize = iconSize * ICON_PROPORTIONS.bagSize;
  const handleHeight = iconSize * ICON_PROPORTIONS.handleHeight;
  const handleWidth = iconSize * ICON_PROPORTIONS.handleWidth;
  const handleTopOffset = iconSize * ICON_PROPORTIONS.handleTopOffset;
  const totalHeight = iconSize;
  const borderRadius = bagSize * ICON_PROPORTIONS.borderRadius;
  const sFontSize = bagSize * ICON_PROPORTIONS.sFontSize;

  // Accent color CSS variable
  const accentVar = useStoreAccent ? '--store-accent-500' : '--accent-500';
  const accentVarDark = useStoreAccent ? '--store-accent-700' : '--accent-700';

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {/* Shopping Bag Icon - S in gradient rectangle with handle */}
      <div
        className="relative flex-shrink-0"
        style={{ width: iconSize, height: totalHeight }}
      >
        {/* Handle - smooth arch on top */}
        <svg
          className="absolute"
          style={{
            top: handleTopOffset,
            left: '50%',
            transform: 'translateX(-50%)',
            width: handleWidth,
            height: handleHeight,
          }}
          viewBox="0 0 24 12"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M4 12 L4 7 Q4 2 12 2 Q20 2 20 7 L20 12"
            stroke={`var(${accentVar}, #3b82f6)`}
            strokeWidth={ICON_PROPORTIONS.handleStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        {/* Bag body - gradient rounded square with S */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            width: bagSize,
            height: bagSize,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            borderRadius: borderRadius,
            background: `linear-gradient(160deg, var(${accentVar}, #3b82f6) 0%, var(${accentVarDark}, #1d4ed8) 100%)`,
          }}
        >
          <span
            style={{
              color: 'white',
              fontSize: sFontSize,
              fontWeight: 700,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transform: `scaleX(${ICON_PROPORTIONS.sStretchX})`,
            }}
          >
            S
          </span>
        </div>
      </div>

      {/* Text */}
      {showText && (
        <span className={`font-bold ${textColorClass} ${textSize}`}>
          ShopIt
        </span>
      )}
    </div>
  );
}

export interface ShopItIconProps {
  size?: number;
  className?: string;
}

/**
 * Icon-only version of the ShopIt logo for compact spaces.
 */
export function ShopItIcon({ size = 32, className = '' }: ShopItIconProps) {
  // Use shared proportions
  const bagSize = size * ICON_PROPORTIONS.bagSize;
  const handleHeight = size * ICON_PROPORTIONS.handleHeight;
  const handleWidth = size * ICON_PROPORTIONS.handleWidth;
  const handleTopOffset = size * ICON_PROPORTIONS.handleTopOffset;
  const borderRadius = bagSize * ICON_PROPORTIONS.borderRadius;
  const sFontSize = bagSize * ICON_PROPORTIONS.sFontSize;

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Handle - smooth arch on top */}
      <svg
        className="absolute"
        style={{
          top: handleTopOffset,
          left: '50%',
          transform: 'translateX(-50%)',
          width: handleWidth,
          height: handleHeight,
        }}
        viewBox="0 0 24 12"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M4 12 L4 7 Q4 2 12 2 Q20 2 20 7 L20 12"
          stroke="var(--accent-500, #3b82f6)"
          strokeWidth={ICON_PROPORTIONS.handleStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {/* Bag body */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          width: bagSize,
          height: bagSize,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: borderRadius,
          background:
            'linear-gradient(160deg, var(--accent-500, #3b82f6) 0%, var(--accent-700, #1d4ed8) 100%)',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: sFontSize,
            fontWeight: 700,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transform: `scaleX(${ICON_PROPORTIONS.sStretchX})`,
          }}
        >
          S
        </span>
      </div>
    </div>
  );
}

export default ShopItLogo;
