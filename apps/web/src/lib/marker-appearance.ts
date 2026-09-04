import type { SpotGrade } from '../types/spot';

type MarkerTone = 'violet' | 'coral' | 'teal' | 'ochre' | 'slate';

export interface MarkerAppearance {
  grade: SpotGrade;
  label: string;
  symbol: string;
  tone: MarkerTone;
}

const markerAppearances: Record<SpotGrade, MarkerAppearance> = {
  S: { grade: 'S', label: 'S 등급 희귀 명소', symbol: '★', tone: 'violet' },
  A: { grade: 'A', label: 'A 등급 추천 명소', symbol: 'A', tone: 'coral' },
  B: { grade: 'B', label: 'B 등급 표준 명소', symbol: 'B', tone: 'teal' },
  C: { grade: 'C', label: 'C 등급 로컬 명소', symbol: 'C', tone: 'ochre' },
  UNRATED: { grade: 'UNRATED', label: '등급 미산정 명소', symbol: '·', tone: 'slate' },
};

export function getMarkerAppearance(grade?: SpotGrade): MarkerAppearance {
  return markerAppearances[grade ?? 'UNRATED'];
}
