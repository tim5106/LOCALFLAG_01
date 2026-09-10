import { ImageOff } from 'lucide-react';
import { useState } from 'react';

function toSafeImageUrl(url: string | null | undefined) {
  const value = url?.trim();
  if (!value) return null;
  return value.startsWith('http://') ? `https://${value.slice('http://'.length)}` : value;
}

export function SpotImage({ src, alt, iconSize = 24 }: { src?: string | null; alt: string; iconSize?: number }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = toSafeImageUrl(src);
  if (!imageUrl || failed) return <div className="spot-card__fallback"><ImageOff size={iconSize} /><span>이미지 준비 중</span></div>;
  return <img src={imageUrl} alt={alt} onError={() => setFailed(true)} />;
}
