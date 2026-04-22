import { useLocation, useNavigate } from 'react-router-dom';
import type { ClaimPayload } from '../types';
import logo from '@/assets/me2you.png';
import styles from './ClaimSuccessPage.module.css';

const ICON_MAP: Record<string, string> = {
  trophy: '🏆',
  badge: '🎖️',
  gift: '🎁',
  star: '⭐',
  art: '🎨',
};

export function ClaimSuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const payload = (state as { payload?: ClaimPayload } | null)?.payload;

  const display = payload?.display;
  const icon = display?.icon ? (ICON_MAP[display.icon] ?? '✅') : '✅';

  return (
    <div className={styles.page}>
      <img src={logo} alt="me2you" className={styles.logo} />

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.icon}>{icon}</div>
          <h1 className={styles.title}>{display?.title ?? 'claimed!'}</h1>
          {display?.description && (
            <p className={styles.description}>{display.description}</p>
          )}
          <button
            className={styles.backButton}
            onClick={() => navigate('/user/profile', { replace: true })}
          >
            view my profile
          </button>
        </div>
      </div>
    </div>
  );
}
