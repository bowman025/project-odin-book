import type { FC } from 'react';
import { useEffect, useState } from 'react';
import styles from './GatewayLoader.module.css';

type GatewayLoaderProps = {
  onAwake: () => void;
};

const INITIAL_COUNTDOWN = 50;

export const GatewayLoader: FC<GatewayLoaderProps> = ({ onAwake }) => {
  const [timeLeft, setTimeLeft] = useState(INITIAL_COUNTDOWN);
  const [statusText, setStatusText] = useState('Kindling the eternal forge...');

  useEffect(() => {
    if (timeLeft > 35) {
      setStatusText('Kindling the eternal forge...');
    } else if (timeLeft > 15) {
      setStatusText('Summoning database conduits across the realms...');
    } else if (timeLeft > 0) {
      setStatusText('Connecting Bifröst bridges to the server core...');
    } else {
      setStatusText('Holding the gateway open...');
    }
  }, [timeLeft]);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let pollInterval: NodeJS.Timeout;

    const checkServerStatus = async () => {
      try {
        const response = await window.fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/status`,
          {
            method: 'GET',
            cache: 'no-store',
          },
        );

        if (response.ok && !isCancelled) {
          clearInterval(pollInterval);
          setTimeout(() => {
            if (!isCancelled) onAwake();
          }, 1500);
        }
      } catch {
        console.log('Waiting for the Odinum core modules to awaken...');
      }
    };

    checkServerStatus();
    pollInterval = setInterval(checkServerStatus, 3000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, [onAwake]);

  const progressPercent = Math.min(
    ((INITIAL_COUNTDOWN - timeLeft) / INITIAL_COUNTDOWN) * 100,
    100,
  );

  return (
    <div className={styles.viewport}>
      <main className={styles.card}>
        <h1 className={styles.brand}>Odinum</h1>
        <p className={styles.subtitle}>Awakening the Realm</p>

        <div className={styles.progressContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className={styles.timerDisplay}>
          {timeLeft > 0
            ? `00:${timeLeft.toString().padStart(2, '0')}`
            : 'MANIFESTING...'}
        </div>

        <p className={styles.tickerStatus}>{statusText}</p>

        <footer className={styles.footnote}>
          Odinum is hosted on a free cloud tier. This transient spell takes
          roughly 45 seconds to awaken the servers on cold starts. Your patience
          honors the Realm!
        </footer>
      </main>
    </div>
  );
};
