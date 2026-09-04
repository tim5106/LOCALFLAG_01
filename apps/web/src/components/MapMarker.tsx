import type { SpotGrade } from '../types/spot';
import { getMarkerAppearance } from '../lib/marker-appearance';

interface MapMarkerProps {
  grade?: SpotGrade;
  selected?: boolean;
  visited?: boolean;
  checkInAvailable?: boolean;
  checkInUnavailable?: boolean;
  label?: string;
  statusLabel?: string;
  estimatedReward?: number;
}

export function MapMarker({
  grade,
  selected = false,
  visited = false,
  checkInAvailable = false,
  checkInUnavailable = false,
  label,
  statusLabel,
  estimatedReward,
}: MapMarkerProps) {
  const appearance = getMarkerAppearance(grade);

  return (
    <span
      className="map-marker"
      data-tone={appearance.tone}
      data-selected={selected}
      data-visited={visited}
      data-check-in-available={checkInAvailable}
      data-check-in-unavailable={checkInUnavailable}
      aria-hidden="true"
    >
      {selected && label ? (
        <span className="map-marker__bubble">
          <strong>{label}</strong>
          <small>{checkInAvailable && estimatedReward ? `예상 보상 ${estimatedReward}P` : statusLabel}</small>
        </span>
      ) : null}
      <span className="map-marker__pin"><span>{appearance.symbol}</span></span>
      {checkInAvailable ? <span className="map-marker__range">100m</span> : null}
      {checkInUnavailable ? <span className="map-marker__area">AREA</span> : null}
      {visited ? <span className="map-marker__check">✓</span> : null}
      <span className="sr-only">{appearance.label}</span>
    </span>
  );
}
