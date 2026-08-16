import { zodResolver } from '@hookform/resolvers/zod';
import {
  type RegisterDTO,
  RegisterSchema,
} from '@project-odin-book/validation';
import { Loader2, UserPlus } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { apiFetch } from '../../../lib/api.js';
import { initiateGitHubLogin } from '../../../lib/githubOAuth.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import styles from '../auth.module.css';

export const RegisterPage: FC = () => {
  const navigate = useNavigate();
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const addToast = useUIStore((state) => state.addToast);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDTO>({
    resolver: zodResolver(RegisterSchema),
  });

  const onFormSubmit = async (payload: RegisterDTO) => {
    setGlobalError(null);
    setIsSubmitting(true);

    const { confirmPassword, ...registerPayload } = payload;

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerPayload),
        skipAuth: true,
      });

      const body = await response.json();

      if (!response.ok) {
        setGlobalError(
          body.message || 'Registration rejected. Please verify your inputs.',
        );
        return;
      }

      setAuthData(body.accessToken, body.user);
      addToast(
        `Welcome to the realm, @${body.user.username}! Your profile has been forged.`,
        'success',
      );

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
          <p className={styles.subtitle}>Create Your Account in the Realm</p>
        </header>

        {globalError && <div className={styles.globalError}>{globalError}</div>}

        <form className={styles.form} onSubmit={handleSubmit(onFormSubmit)}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="username">
              Username
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
            <label className={styles.label} htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isSubmitting}
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              {...register('email')}
            />
            {errors.email && (
              <span className={styles.errorMessage}>
                {errors.email.message}
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
              autoComplete="new-password"
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

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={isSubmitting}
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <span className={styles.errorMessage}>
                {errors.confirmPassword.message}
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
              <UserPlus size={18} />
            )}
            <span>{isSubmitting ? 'Creating Account...' : 'Sign Up'}</span>
          </button>
        </form>

        {/* 🔌 THE GITHUB OAUTH CONNECTOR STRIP */}
        <div className={styles.dividerContainer}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>Social Access</span>
          <div className={styles.dividerLine} />
        </div>

        <button
          type="button"
          className={styles.guestButton}
          onClick={initiateGitHubLogin}
          disabled={isSubmitting}
        >
          <span>Continue with GitHub</span>
        </button>

        <footer className={styles.footer}>
          <span>Already have an account?</span>
          <Link to="/login" className={styles.link}>
            Log In
          </Link>
        </footer>
      </div>
    </div>
  );
};
