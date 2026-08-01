import { zodResolver } from '@hookform/resolvers/zod';
import type { ChangePasswordDTO } from '@project-odin-book/validation';
import { ChangePasswordSchema } from '@project-odin-book/validation';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { apiFetch } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import styles from './SettingsPage.module.css';

export const SettingsPage: FC = () => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const addToast = useUIStore((state) => state.addToast);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordDTO>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const handlePasswordRotationSubmit = async (values: ChangePasswordDTO) => {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await apiFetch('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify(values),
      });

      const payload = await response.json();

      if (response.ok) {
        addToast(
          'Security parameters updated successfully. Please log back in with your fresh credentials.',
          'success',
        );

        clearAuth();
        navigate('/login', { replace: true });
      } else {
        setGlobalError(
          payload.message || 'Failed to modify account credentials.',
        );
        addToast(payload.message || 'Credential verification failed.', 'error');
      }
    } catch {
      setGlobalError('Network transmission link connection failure.');
      addToast('Network transmission failure.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.title}>Account Settings</h2>
        <p className={styles.subtitle}>
          Manage your Odinum profile security configurations.
        </p>
      </header>

      <div className={styles.workspaceCard}>
        <div className={styles.cardHeaderRow}>
          <KeyRound className={styles.headerIcon} size={20} />
          <h3 className={styles.cardTitle}>Rotate Access Password</h3>
        </div>

        {globalError && (
          <div className={styles.globalErrorBanner}>
            <span>{globalError}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit(handlePasswordRotationSubmit)}
          className={styles.rotationForm}
        >
          <div className={styles.inputFieldBlock}>
            <label htmlFor="current-pass-field" className={styles.fieldLabel}>
              Current Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="current-pass-field"
                type={showCurrentPassword ? 'text' : 'password'}
                className={styles.passwordInput}
                placeholder="Enter your current account password..."
                disabled={isSubmitting}
                {...register('currentPassword')}
              />
              <button
                type="button"
                className={styles.visibilityToggleBtn}
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                title={
                  showCurrentPassword
                    ? 'Hide password text'
                    : 'Reveal password text'
                }
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <span className={styles.validationError}>
                {errors.currentPassword.message}
              </span>
            )}
          </div>

          <div className={styles.inputFieldBlock}>
            <label htmlFor="new-pass-field" className={styles.fieldLabel}>
              New Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="new-pass-field"
                type={showNewPassword ? 'text' : 'password'}
                className={styles.passwordInput}
                placeholder="Compose a strong new access code..."
                disabled={isSubmitting}
                {...register('newPassword')}
              />
              <button
                type="button"
                className={styles.visibilityToggleBtn}
                onClick={() => setShowNewPassword((prev) => !prev)}
                title={
                  showNewPassword
                    ? 'Hide password text'
                    : 'Reveal password text'
                }
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <span className={styles.validationError}>
                {errors.newPassword.message}
              </span>
            )}
          </div>

          <div className={styles.inputFieldBlock}>
            <label htmlFor="confirm-pass-field" className={styles.fieldLabel}>
              Confirm New Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="confirm-pass-field"
                type={showConfirmPassword ? 'text' : 'password'}
                className={styles.passwordInput}
                placeholder="Re-type your strong new access code..."
                disabled={isSubmitting}
                {...register('confirmNewPassword')}
              />
              <button
                type="button"
                className={styles.visibilityToggleBtn}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                title={
                  showConfirmPassword
                    ? 'Hide password text'
                    : 'Reveal password text'
                }
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmNewPassword && (
              <span className={styles.validationError}>
                {errors.confirmNewPassword.message}
              </span>
            )}
          </div>

          <div className={styles.formActionsRow}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Computing Encryption Hashing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Update Account Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
