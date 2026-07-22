import { AlertOctagon, Home, RotateCcw } from 'lucide-react';
import type { FC } from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';
import styles from './ErrorPage.module.css';

export const ErrorPage: FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage =
    'An unexpected distortion has fractured the realm script layout layers.';
  let errorStatusText = '';

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data || error.statusText;
    errorStatusText = `Code ${error.status}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <AlertOctagon size={32} />
        </div>

        <h1 className={styles.title}>Realm Distortion</h1>

        <p className={styles.message}>{errorMessage}</p>

        {errorStatusText && (
          <div className={styles.debugBox}>
            <strong>Status Check:</strong> {errorStatusText}
          </div>
        )}

        <div className={styles.actionRow}>
          <button
            type="button"
            onClick={handleReload}
            className={styles.btnSecondary}
          >
            <RotateCcw size={16} />
            <span>Retry</span>
          </button>

          <button
            type="button"
            onClick={handleGoHome}
            className={styles.btnPrimary}
          >
            <Home size={16} />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
