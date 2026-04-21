import { formatPrice } from '../utils/index.js';

interface PriceDisplayProps {
  price: number;
  salePrice?: number;
  isOnSale?: boolean;
  locale?: string;
  className?: string;
}

export function PriceDisplay({
  price,
  salePrice,
  isOnSale,
  locale = 'en',
  className,
}: PriceDisplayProps) {
  if (isOnSale && salePrice != null) {
    return (
      <span className={className}>
        <span style={{ textDecoration: 'line-through', opacity: 0.6, marginRight: 8 }}>
          {formatPrice(price, locale)}
        </span>
        <span style={{ color: '#dc2626', fontWeight: 600 }}>
          {formatPrice(salePrice, locale)}
        </span>
      </span>
    );
  }

  return (
    <span className={className} style={{ fontWeight: 600 }}>
      {formatPrice(price, locale)}
    </span>
  );
}
