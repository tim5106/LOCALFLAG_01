export type CheckInViewState =
  | { type: 'ready' }
  | { type: 'locating' }
  | { type: 'permission-denied' }
  | { type: 'gps-inaccurate'; accuracyM: number }
  | { type: 'out-of-range'; distanceM: number }
  | { type: 'empty-nearby' };

export interface CheckInStateContent {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  secondaryActionLabel?: string;
  tone: 'success' | 'progress' | 'danger' | 'warning' | 'neutral';
}

export function getCheckInStateContent(state: CheckInViewState): CheckInStateContent {
  switch (state.type) {
    case 'locating':
      return { eyebrow: '위치 확인 중', title: '현재 위치를\n확인하고 있어요.', description: '가까운 플래그와 GPS 정확도를 함께 확인합니다.', actionLabel: '확인 중', tone: 'progress' };
    case 'permission-denied':
      return { eyebrow: '위치 권한 필요', title: '위치 권한을 켜야\n현장 인증을 시작할 수 있어요.', description: '브라우저 주소창의 자물쇠 아이콘에서 위치 권한을 허용한 뒤 다시 시도해 주세요.', actionLabel: '권한 설정 방법 보기', secondaryActionLabel: '다른 지역 둘러보기', tone: 'danger' };
    case 'gps-inaccurate':
      return { eyebrow: 'GPS 신호 불안정', title: 'GPS 신호가 조금 흔들리고 있어요.', description: `현재 정확도는 약 ${Math.round(state.accuracyM)}m예요. 하늘이 보이는 곳에서 다시 측정해 주세요.`, actionLabel: '위치 다시 측정하기', tone: 'warning' };
    case 'out-of-range':
      return { eyebrow: '인증 범위 밖', title: `플래그까지 약 ${Math.round(state.distanceM)}m 남았어요.`, description: '장소 중심 100m 안으로 이동하면 인증 버튼이 활성화됩니다.', actionLabel: '거리 다시 확인하기', tone: 'warning' };
    case 'empty-nearby':
      return { eyebrow: '주변 플래그 없음', title: '주변에 인증 가능한 플래그가 없어요.', description: '탐색 지도에서 다음에 방문할 숨은 장소를 찾아보세요.', actionLabel: '다른 지역 둘러보기', tone: 'neutral' };
    case 'ready':
      return { eyebrow: '인증 가능', title: '플래그 범위 안에\n도착했어요.', description: 'GPS 정확도와 중복 인증 검사를 통과하면 포인트가 적립됩니다.', actionLabel: '현장 인증하기', tone: 'success' };
  }
}
