import { LockKeyhole } from 'lucide-react';
import { flagSkins } from '../lib/flag-skins';

export function FlagSkinGrid() {
  return (
    <div className="skin-grid">
      {flagSkins.map((skin) => {
        const isActive = skin.unlock === 'default';
        const isLocked = skin.unlock === 'achievement';
        const meta = skin.price ? `${skin.price}P` : isLocked ? '플래그 10개로 해금' : '장착 중';

        return (
          <button
            type="button"
            className={['skin-card', isActive ? 'skin-card--active' : '', isLocked ? 'skin-card--locked' : ''].filter(Boolean).join(' ')}
            key={skin.id}
            aria-pressed={isActive}
          >
            <span className="skin-card__asset">
              <img src={skin.asset} alt="" />
              {isLocked ? <LockKeyhole size={16} /> : null}
            </span>
            <strong>{skin.name}</strong>
            <small>{meta}</small>
          </button>
        );
      })}
    </div>
  );
}
