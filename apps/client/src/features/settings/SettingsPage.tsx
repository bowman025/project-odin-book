import { zodResolver } from '@hookform/resolvers/zod';
import type {
  ChangePasswordDTO,
  DeleteAccountInput,
} from '@project-odin-book/validation';
import {
  ChangePasswordSchema,
  DeleteAccountSchema,
} from '@project-odin-book/validation';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLoaderData, useNavigate } from 'react-router';
import { AccessibleModal } from '../../components/AccessibleModal/AccessibleModal';
import { apiFetch } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUIStore } from '../../store/uiStore.js';
import styles from './SettingsPage.module.css';
import type { SettingsLoaderResult } from './settingsLoader.js';

export const SettingsPage: FC = () => {
  const { hasPassword } = useLoaderData() as SettingsLoaderResult;
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const addToast = useUIStore((state) => state.addToast);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isTerminatingAccount, setIsTerminatingAccount] = useState(false);
  const [passwordRotationError, setPasswordRotationError] = useState<
    string | null
  >(null);
  const [terminationError, setTerminationError] = useState<string | null>(null);

  const [isTerminationModalOpen, setIsTerminationModalOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTerminationPassword, setShowTerminationPassword] = useState(false);

  const passwordForm = useForm<ChangePasswordDTO>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const terminationForm = useForm<DeleteAccountInput>({
    resolver: zodResolver(DeleteAccountSchema),
    defaultValues: { password: '', confirmation: undefined },
  });

  const handlePasswordRotationSubmit = async (values: ChangePasswordDTO) => {
    setIsChangingPassword(true);
    setPasswordRotationError(null);

    try {
      const response = await apiFetch('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      const payload = await response.json();

      if (response.ok) {
        addToast(
          'Password updated successfully. Please log back in.',
          'success',
        );
        clearAuth();
        navigate('/login', { replace: true });
      } else {
        setPasswordRotationError(
          payload.message || 'Failed to modify account credentials.',
        );
        addToast(payload.message || 'Credential verification failed.', 'error');
      }
    } catch {
      setPasswordRotationError('Network transmission link connection failure.');
      addToast('Network transmission failure.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAccountTerminationSubmit = async (values: DeleteAccountInput) => {
    setIsTerminatingAccount(true);
    setTerminationError(null);

    try {
      const payloadBody: DeleteAccountInput = {};
      if (hasPassword) {
        payloadBody.password = values.password;
      } else {
        payloadBody.confirmation = values.confirmation;
      }

      const response = await apiFetch('/auth/delete-account', {
        method: 'DELETE',
        body: JSON.stringify(payloadBody),
      });

      if (response.ok) {
        addToast(
          'Your account and entire digital footprint were successfully purged.',
          'success',
        );
        setIsTerminationModalOpen(false);
        clearAuth();
        navigate('/login', { replace: true });
      } else {
        const payload = await response.json();
        setTerminationError(
          payload.message || 'Verification failed. Unable to delete account.',
        );
        addToast(
          payload.message || 'Termination authorization rejected.',
          'error',
        );
      }
    } catch {
      setTerminationError('Network connection link failure.');
      addToast('Network transmission failure.', 'error');
    } finally {
      setIsTerminatingAccount(false);
    }
  };

  const handleCloseTerminationModal = () => {
    setIsTerminationModalOpen(false);
    setTerminationError(null);
    terminationForm.reset();
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h2 className={styles.title}>Account Settings</h2>
        <p className={styles.subtitle}>
          Manage your profile security workspace configurations.
        </p>
      </header>

      <div className={styles.workspaceCard}>
        <div className={styles.cardHeaderRow}>
          <Users className={styles.headerIcon} size={20} />
          <h3 className={styles.cardTitle}>Manage Requests</h3>
        </div>
        <p className={styles.dangerDescriptionText}>
          Audit incoming citizen follow requests waiting for your clearance, or
          manage and retract outbound relationship statuses.
        </p>
        <div className={styles.formActionsRow}>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => navigate('/settings/requests')}
          >
            <Users size={16} />
            <span>Open Inbox</span>
          </button>
        </div>
      </div>

      <div className={styles.workspaceCard}>
        <div className={styles.cardHeaderRow}>
          <KeyRound className={styles.headerIcon} size={20} />
          <h3 className={styles.cardTitle}>Change Password</h3>
        </div>

        {passwordRotationError && (
          <div className={styles.globalErrorBanner}>
            <span>{passwordRotationError}</span>
          </div>
        )}

        <form
          onSubmit={passwordForm.handleSubmit(handlePasswordRotationSubmit)}
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
                placeholder="Enter your current password..."
                disabled={isChangingPassword}
                {...passwordForm.register('currentPassword')}
              />
              <button
                type="button"
                className={styles.visibilityToggleBtn}
                onClick={() => setShowCurrentPassword((prev) => !prev)}
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordForm.formState.errors.currentPassword && (
              <span className={styles.validationError}>
                {passwordForm.formState.errors.currentPassword.message}
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
                placeholder="Compose a strong new password..."
                disabled={isChangingPassword}
                {...passwordForm.register('newPassword')}
              />
              <button
                type="button"
                className={styles.visibilityToggleBtn}
                onClick={() => setShowNewPassword((prev) => !prev)}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordForm.formState.errors.newPassword && (
              <span className={styles.validationError}>
                {passwordForm.formState.errors.newPassword.message}
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
                placeholder="Re-type your new password..."
                disabled={isChangingPassword}
                {...passwordForm.register('confirmNewPassword')}
              />
              <button
                type="button"
                className={styles.visibilityToggleBtn}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordForm.formState.errors.confirmNewPassword && (
              <span className={styles.validationError}>
                {passwordForm.formState.errors.confirmNewPassword.message}
              </span>
            )}
          </div>

          <div className={styles.formActionsRow}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : (
                <ShieldCheck size={16} />
              )}
              <span>
                {isChangingPassword
                  ? 'Updating Password...'
                  : 'Update Password'}
              </span>
            </button>
          </div>
        </form>
      </div>

      <div className={styles.dangerCard}>
        <div className={styles.dangerHeaderRow}>
          <Trash2 className={styles.dangerIcon} size={20} />
          <h3 className={styles.dangerTitle}>Danger Zone</h3>
        </div>

        <p className={styles.dangerDescriptionText}>
          Permanently erase your identity, digital footprint, chronicles, follow
          graphs, and conversation logs. This action is absolute and cannot be
          reversed.
        </p>

        <div className={styles.dangerActionsRow}>
          <button
            type="button"
            className={styles.terminateAccountBtn}
            onClick={() => setIsTerminationModalOpen(true)}
          >
            <Trash2 size={16} />
            <span>Terminate Account</span>
          </button>
        </div>
      </div>

      <AccessibleModal
        isOpen={isTerminationModalOpen}
        onClose={handleCloseTerminationModal}
        titleId="delete-title"
        descriptionId="delete-desc"
      >
        <div className={styles.modalContent}>
          <header className={styles.modalHeader}>
            <div className={styles.alertIconWrapper}>
              <AlertTriangle size={24} className={styles.alertIcon} />
            </div>
            <h3 id="delete-title" className={styles.modalTitle}>
              Are you absolutely sure?
            </h3>
            <p id="delete-desc" className={styles.modalSubtitle}>
              This will forcefully close your active credentials and completely
              scrub your profile from Odinum.
            </p>
          </header>

          {terminationError && (
            <div className={styles.globalErrorBanner}>
              <span>{terminationError}</span>
            </div>
          )}

          <form
            onSubmit={terminationForm.handleSubmit(
              handleAccountTerminationSubmit,
            )}
            className={styles.modalForm}
          >
            {hasPassword ? (
              <div className={styles.inputFieldBlock}>
                <label
                  htmlFor="termination-password"
                  className={styles.modalFieldLabel}
                >
                  Confirm Account Password
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="termination-password"
                    type={showTerminationPassword ? 'text' : 'password'}
                    className={styles.modalInput}
                    placeholder="Enter your password to verify ownership..."
                    disabled={isTerminatingAccount}
                    {...terminationForm.register('password')}
                  />
                  <button
                    type="button"
                    className={styles.visibilityToggleBtn}
                    onClick={() => setShowTerminationPassword((prev) => !prev)}
                  >
                    {showTerminationPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                {terminationForm.formState.errors.password && (
                  <span className={styles.validationError}>
                    {terminationForm.formState.errors.password.message}
                  </span>
                )}
              </div>
            ) : (
              <div className={styles.inputFieldBlock}>
                <label
                  htmlFor="termination-confirmation"
                  className={styles.modalFieldLabel}
                >
                  Type{' '}
                  <strong className={styles.literalHighlight}>DELETE</strong> to
                  confirm
                </label>
                <input
                  id="termination-confirmation"
                  type="text"
                  className={styles.modalInput}
                  placeholder="Type DELETE in capital letters..."
                  disabled={isTerminatingAccount}
                  autoComplete="off"
                  {...terminationForm.register('confirmation')}
                />
                {terminationForm.formState.errors.confirmation && (
                  <span className={styles.validationError}>
                    {terminationForm.formState.errors.confirmation.message ||
                      'Must match DELETE exactly'}
                  </span>
                )}
              </div>
            )}

            <div className={styles.modalActionsRow}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={handleCloseTerminationModal}
                disabled={isTerminatingAccount}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.modalDeleteBtn}
                disabled={isTerminatingAccount}
              >
                {isTerminatingAccount && (
                  <Loader2 size={14} className={styles.spinner} />
                )}
                <span>
                  {isTerminatingAccount
                    ? 'Deleting Your Account...'
                    : 'Delete My Account'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </AccessibleModal>
    </div>
  );
};
