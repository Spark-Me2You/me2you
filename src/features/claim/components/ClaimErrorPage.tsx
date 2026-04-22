import { useSearchParams, useNavigate } from 'react-router-dom';
import logo from '@/assets/me2you.png';
import styles from './ClaimErrorPage.module.css';

export function ClaimErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get('reason') ?? 'something went wrong';

  return (
    <div className={styles.page}>
      <img src={logo} alt="me2you" className={styles.logo} />

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.icon}>⚠️</div>
          <h1 className={styles.title}>claim failed</h1>
          <p className={styles.reason}>{reason.toLowerCase()}</p>
          <button
            className={styles.backButton}
            onClick={() => navigate('/user/profile', { replace: true })}
          >
            back to profile
          </button>
        </div>
      </div>
    </div>
  );
}
