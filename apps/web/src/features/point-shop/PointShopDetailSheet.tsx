import { useQueryClient } from '@tanstack/react-query';
import { Check, Flag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { equipFlagSkin, purchaseFlagSkin, type FlagSkin } from '../../api/client';

interface PointShopDetailSheetProps {
  skin: FlagSkin;
  userBalance: number | null | undefined;
  isBalanceLoading?: boolean;
  isBalanceError?: boolean;
  isEquipped: boolean;
  onClose: () => void;
}

export function PointShopDetailSheet({
  skin,
  userBalance,
  isBalanceLoading = false,
  isBalanceError = false,
  isEquipped: initialEquipped,
  onClose,
}: PointShopDetailSheetProps) {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const [imgError, setImgError] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [equipped, setEquipped] = useState(initialEquipped);
  const [errorMessage, setErrorMessage] = useState('');

  // 접근성: Escape 키 감지 및 포커스 설정
  useEffect(() => {
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const owned = skin.owned || purchaseSuccess;
  const hasValidBalance = !isBalanceLoading && !isBalanceError && typeof userBalance === 'number';
  const canAfford = hasValidBalance && (userBalance as number) >= skin.price;

  const currentBalanceText = isBalanceLoading
    ? '— P'
    : !hasValidBalance
      ? '확인 불가'
      : `${(userBalance as number).toLocaleString()} P`;

  const afterBalanceText = !hasValidBalance || (userBalance as number) < skin.price
    ? '—'
    : `${((userBalance as number) - skin.price).toLocaleString()} P`;

  const invalidateShopQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['me'] }),
      queryClient.invalidateQueries({ queryKey: ['flag-skins'] }),
      queryClient.invalidateQueries({ queryKey: ['my-map'] }),
    ]);
  };

  const handlePurchase = async () => {
    if (isPurchasing || !canAfford) return;
    setIsPurchasing(true);
    setErrorMessage('');
    try {
      await purchaseFlagSkin(skin.id);
      await invalidateShopQueries();
      setPurchaseSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '구매에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleEquip = async () => {
    if (isEquipping) return;
    setIsEquipping(true);
    setErrorMessage('');
    try {
      await equipFlagSkin(skin.id);
      await invalidateShopQueries();
      setEquipped(true);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '장착에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsEquipping(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="point-shop-sheet-backdrop"
      onClick={handleBackdropClick}
      data-testid="point-shop-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skin-detail-title"
        className="point-shop-sheet"
      >
        <div className="point-shop-sheet__handle" aria-hidden="true" />
        <button
          ref={closeBtnRef}
          type="button"
          className="point-shop-sheet__close-btn"
          aria-label="닫기"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="point-shop-sheet__preview">
          {skin.assetUrl && !imgError ? (
            <img
              src={skin.assetUrl}
              alt={skin.name}
              className="point-shop-sheet__img"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="point-shop-card__icon-circle" style={{ width: 64, height: 64 }}>
              <Flag size={32} color="#173F35" />
            </div>
          )}
        </div>

        <h2 id="skin-detail-title" className="point-shop-sheet__title">
          {skin.name}
        </h2>
        <p className="point-shop-sheet__desc">
          {skin.description || '깃발을 개성 있게 꾸밀 수 있는 스킨입니다.'}
        </p>

        {/* 잔액 계산 영역 */}
        <div className="point-shop-sheet__calc" aria-label="결제 및 잔액 안내">
          <div className="point-shop-sheet__calc-row">
            <span>상품 가격</span>
            <span className="point-shop-sheet__calc-val">
              {skin.price.toLocaleString()} P
            </span>
          </div>
          <div className="point-shop-sheet__calc-row">
            <span>현재 잔액</span>
            <span className="point-shop-sheet__calc-val">
              {currentBalanceText}
            </span>
          </div>
          {!owned && (
            <div className="point-shop-sheet__calc-row point-shop-sheet__calc-row--final">
              <span>구매 후 잔액</span>
              <span className="point-shop-sheet__calc-val point-shop-sheet__calc-val--final">
                {afterBalanceText}
              </span>
            </div>
          )}
        </div>

        {/* 에러 메시지 알림 */}
        {errorMessage && (
          <div className="point-shop-sheet__error-box" role="alert">
            {errorMessage}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="point-shop-sheet__actions">
          {equipped ? (
            <button
              type="button"
              className="point-shop-sheet__btn point-shop-sheet__btn--disabled"
              disabled
              aria-label={`${skin.name} 장착 중`}
            >
              <Check size={18} />
              <span>장착 중</span>
            </button>
          ) : purchaseSuccess ? (
            <>
              <button
                type="button"
                className="point-shop-sheet__btn point-shop-sheet__btn--success"
                onClick={handleEquip}
                disabled={isEquipping}
              >
                {isEquipping ? '장착 중...' : '바로 장착'}
              </button>
              <button
                type="button"
                className="point-shop-sheet__btn point-shop-sheet__btn--secondary"
                onClick={onClose}
              >
                계속 둘러보기
              </button>
            </>
          ) : owned ? (
            <button
              type="button"
              className="point-shop-sheet__btn point-shop-sheet__btn--primary"
              onClick={handleEquip}
              disabled={isEquipping}
            >
              {isEquipping ? '장착 처리 중...' : '장착하기'}
            </button>
          ) : !canAfford ? (
            <button
              type="button"
              className="point-shop-sheet__btn point-shop-sheet__btn--disabled"
              disabled
              aria-label={!hasValidBalance ? '잔액 확인 불가' : '포인트 부족'}
            >
              {!hasValidBalance ? '잔액 확인 불가' : '포인트 부족'}
            </button>
          ) : (
            <button
              type="button"
              className="point-shop-sheet__btn point-shop-sheet__btn--primary"
              onClick={handlePurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? '구매 처리 중...' : `${skin.price.toLocaleString()}P로 구매하기`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
