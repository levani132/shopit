interface ProductImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function ProductImage({
  src,
  alt,
  width,
  height,
  className,
  style,
}: ProductImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{
        objectFit: 'cover',
        ...style,
      }}
      loading="lazy"
    />
  );
}
