import {
  CircleAlert,
  LocateFixed,
  MapPinned,
  Navigation,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { getCheckInStateContent, type CheckInViewState } from '../lib/check-in-state';

const iconByTone: Record<ReturnType<typeof getCheckInStateContent>['tone'], LucideIcon> = {
  success: ShieldCheck,
  progress: LocateFixed,
  danger: CircleAlert,
  warning: Navigation,
  neutral: MapPinned,
};

interface CheckInStateCardProps {
  state: CheckInViewState;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

export function CheckInStateCard({ state, onPrimaryAction, onSecondaryAction }: CheckInStateCardProps) {
  const content = getCheckInStateContent(state);
  const Icon = iconByTone[content.tone];
  const isProgress = state.type === 'locating';

  return (
    <section className="check-in-state-card" data-tone={content.tone} aria-live="polite">
      <div className="check-in-state-card__icon"><Icon size={26} strokeWidth={2.3} /></div>
      <div className="check-in-state-card__status"><span className="status-dot" /><small>{content.eyebrow}</small></div>
      <h2>{content.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
      <p>{content.description}</p>
      <button type="button" className="primary-button" onClick={onPrimaryAction} disabled={isProgress}>
        <Icon size={19} /> {content.actionLabel}
      </button>
      {content.secondaryActionLabel ? (
        <button type="button" className="secondary-button" onClick={onSecondaryAction}>{content.secondaryActionLabel}</button>
      ) : null}
    </section>
  );
}
