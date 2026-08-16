import { Loader2 } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { consumeGitHubState } from '../../../lib/githubOAuth.js';
import { useAuthStore } from '../../../store/authStore.js';
import styles from './AuthCallbackPage.module.css';

export const AuthCallbackPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const oauthError = searchParams.get('error');
    const code = searchParams.get('code');
    const returnedState = searchParams.get('state');
    const expectedState = consumeGitHubState();

    if (oauthError) {
      setErrorMessage('GitHub authorization was cancelled.');
      return;
    }

    if (!code) {
      setErrorMessage('Missing authorization code from GitHub.');
      return;
    }

    if (!expectedState || returnedState !== expectedState) {
      setErrorMessage(
        'Invalid or expired authorization request. Please try again.',
      );
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await apiFetch('/auth/github', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const body = await response.json();
          setErrorMessage(body.message ?? 'GitHub sign-in failed.');
          return;
        }

        const { accessToken, user } = await response.json();
        setAuthData(accessToken, user);
        navigate('/', { replace: true });
      } catch {
        setErrorMessage('Network error while contacting the server.');
      }
    };

    exchangeCode();
  }, [searchParams, setAuthData, navigate]);

  return (
    <div className={styles.container}>
      <main className={styles.card}>
        {errorMessage ? (
          <div className={styles.errorState}>
            <h3 className={styles.errorTitle}>Sign-in failed</h3>
            <p className={styles.errorText}>{errorMessage}</p>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate('/login', { replace: true })}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={36} />
            <h3 className={styles.loadingTitle}>Signing you in…</h3>
            <p className={styles.loadingText}>Verifying your GitHub account.</p>
          </div>
        )}
      </main>
    </div>
  );
};
