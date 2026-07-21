import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema } from '@project-odin-book/validation';
import { Loader2, UserPlus } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { z } from 'zod';
import { apiFetch } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import styles from './RegisterPage.module.css';

type RegisterFormInputs = z.infer<typeof RegisterSchema>;

export const RegisterPage: FC = () => {
  const navigate = useNavigate();
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(RegisterSchema),
  });

  const onFormSubmit = async (payload: RegisterFormInputs) => {
    setGlobalError(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
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
          <h1 className={styles.brand}>odinum</h1>
          <p className={styles.subtitle}>create your account in the realm</p>
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
