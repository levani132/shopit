'use client';

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
    handleStroke: 1.5,
  },
  md: {
    icon: 32,
    text: 'text-xl',
    gap: 'gap-2',
    fontSize: 'text-base',
    handleStroke: 2,
  },
  lg: {
    icon: 40,
    text: 'text-2xl',
    gap: 'gap-2.5',
    fontSize: 'text-lg',
    handleStroke: 2.5,
  },
  xl: {
    icon: 52,
    text: 'text-3xl',
    gap: 'gap-3',
    fontSize: 'text-xl',
    handleStroke: 3,
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
  const { icon: iconSize, text: textSize, gap, handleStroke } = SIZES[size];
  const topOffset = iconSize * 0.0625;

  // Determine text color based on variant
  const textColorClass =
    variant === 'light'
      ? 'text-white'
      : variant === 'dark'
        ? 'text-gray-900'
        : 'text-gray-900 dark:text-white';

  // Calculate proportions based on icon size
  const handleHeight = iconSize * 0.25;
  const handleWidth = iconSize * 0.5;
  const bagSize = iconSize * 0.85;
  const totalHeight = iconSize;

  // Accent color CSS variable
  const accentVar = useStoreAccent ? '--store-accent-500' : '--accent-500';
  const accentVarDark = useStoreAccent ? '--store-accent-700' : '--accent-700';

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {/* Shopping Bag Icon - S in gradient rectangle with handle */}
      <div
        className="relative flex-shrink-0"
        style={{ width: iconSize, height: totalHeight, top: -topOffset }}
      >
        {/* Handle - semi-circle on top */}
        <svg
          className="absolute"
          style={{
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: handleWidth,
            height: handleHeight,
          }}
          viewBox="0 0 20 10"
          fill="none"
        >
          <path
            d="M2 10 V6 C2 3 5 1 10 1 C15 1 18 3 18 6 V10"
            stroke="url(#handleGradient)"
            strokeWidth={handleStroke}
            strokeLinecap="round"
            fill="none"
          />
          <defs>
            <linearGradient
              id="handleGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={`var(${accentVar}, #6366f1)`} />
              <stop
                offset="100%"
                stopColor={`var(${accentVarDark}, #9333ea)`}
              />
            </linearGradient>
          </defs>
        </svg>

        {/* Bag body - gradient rectangle with S */}
        <div
          className="absolute rounded-lg flex items-center justify-center"
          style={{
            width: bagSize,
            height: bagSize,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            background: `linear-gradient(to bottom right, var(${accentVar}, #6366f1), var(${accentVarDark}, #9333ea))`,
          }}
        >
          <span
            className="text-white font-bold"
            style={{ fontSize: bagSize * 0.65 }}
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
export function ShopItIcon({
  size = 32,
  className = '',
}: ShopItIconProps) {
  const handleHeight = size * 0.25;
  const handleWidth = size * 0.5;
  const bagSize = size * 0.85;
  const handleStroke = size * 0.06;

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Handle */}
      <svg
        className="absolute"
        style={{
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: handleWidth,
          height: handleHeight,
        }}
        viewBox="0 0 20 10"
        fill="none"
      >
        <path
          d="M2 10 V6 C2 3 5 1 10 1 C15 1 18 3 18 6 V10"
          stroke="url(#handleGradientIcon)"
          strokeWidth={handleStroke}
          strokeLinecap="round"
          fill="none"
        />
        <defs>
          <linearGradient
            id="handleGradientIcon"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--accent-500, #6366f1)" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>
      </svg>

      {/* Bag body */}
      <div
        className="absolute rounded-lg flex items-center justify-center"
        style={{
          width: bagSize,
          height: bagSize,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          background:
            'linear-gradient(to bottom right, var(--accent-500, #6366f1), #9333ea)',
        }}
      >
        <span
          className="text-white font-bold"
          style={{ fontSize: bagSize * 0.55 }}
        >
          S
        </span>
      </div>
    </div>
  );
}

export default ShopItLogo;
