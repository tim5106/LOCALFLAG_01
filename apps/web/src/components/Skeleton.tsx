import type { CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
}

export function Skeleton({
  className = '',
  width,
  height,
  borderRadius,
  style,
}: SkeletonProps) {
  const customStyle: CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(borderRadius !== undefined ? { borderRadius } : {}),
    ...style,
  };

  return <div className={`skeleton ${className}`.trim()} style={customStyle} />;
}

