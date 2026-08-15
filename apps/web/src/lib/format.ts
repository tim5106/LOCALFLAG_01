export function formatPoints(points: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(points)}P`;
}

