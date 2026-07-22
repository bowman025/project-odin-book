import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginInput, LoginSchema } from '@project-odin-book/validation';
import { Loader2, LogIn, ShieldAlert } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { useAuthStore } from '../../../store/authStore.js';
import styles from './LoginPage.module.css';

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onFormSubmit = async (payload: LoginInput) => {
    setGlobalError(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });

      const body = await response.json();

      if (!response.ok) {
        setGlobalError(
          body.message ||
            'Authentication rejected. Please check your credentials.',
        );
        return;
      }

      setAuthData(body.accessToken, body.user);
      navigate('/', { replace: true });
    } catch {
      setGlobalError(
        'Unable to connect to the server network. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestSignIn = async () => {
    setGlobalError(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/auth/guest', {
        method: 'POST',
        skipAuth: true,
      });

      const body = await response.json();

      if (!response.ok) {
        setGlobalError(body.message || 'Failed to initialize guest session.');
        return;
      }

      setAuthData(body.accessToken, body.user);
      navigate('/', { replace: true });
    } catch {
      setGlobalError(
        'Unable to connect to the server network. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.viewport}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.brand}>Odinum</h1>
          <p className={styles.subtitle}>Connect with the Realm</p>
        </header>

        {globalError && <div className={styles.globalError}>{globalError}</div>}

        <form className={styles.form} onSubmit={handleSubmit(onFormSubmit)}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="username">
              Username or Email
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              disabled={isSubmitting}
              className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
              {...register('username')}
            />
            {errors.username && (
              <span className={styles.errorMessage}>
                {errors.username.message}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              {...register('password')}
            />
            {errors.password && (
              <span className={styles.errorMessage}>
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className={styles.spinner} size={18} />
            ) : (
              <LogIn size={18} />
            )}
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className={styles.dividerContainer}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>Recruiter Access</span>
          <div className={styles.dividerLine} />
        </div>

        <button
          type="button"
          className={styles.guestButton}
          onClick={handleGuestSignIn}
          disabled={isSubmitting}
        >
          <ShieldAlert size={18} />
          <span>Guest Sign-In (Instant Bypass)</span>
        </button>

        <footer className={styles.footer}>
          <span>Don't have an account?</span>
          <Link to="/register" className={styles.link}>
            Register
          </Link>
        </footer>
      </div>
    </div>
  );
};
