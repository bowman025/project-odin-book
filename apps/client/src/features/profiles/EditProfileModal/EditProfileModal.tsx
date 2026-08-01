import { zodResolver } from '@hookform/resolvers/zod';
import type { UpdateProfileInput } from '@project-odin-book/validation';
import { UpdateProfileSchema } from '@project-odin-book/validation';
import { Camera, Loader2 } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AccessibleModal } from '../../../components/AccessibleModal/AccessibleModal';
import { apiFetch } from '../../../lib/api.js';
import { uploadImageToCloudinary } from '../../../lib/cloudinary.js';
import { useAuthStore } from '../../../store/authStore.js';
import { useUIStore } from '../../../store/uiStore.js';
import type { UserProfile } from '../ProfilePage/profileLoader.js';
import styles from './EditProfileModal.module.css';

type EditProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
};

export const EditProfileModal: FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated,
}) => {
  const addToast = useUIStore((state) => state.addToast);
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const currentAccessToken = useAuthStore((state) => state.accessToken);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      bio: currentProfile.bio || '',
      profilePicture: currentProfile.profilePicture || undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setLocalPreviewUrl(null);
      setIsAvatarRemoved(false);
      setValue('profilePicture', currentProfile.profilePicture || undefined);
      setValue('bio', currentProfile.bio || '');
    }
  }, [isOpen, currentProfile, setValue]);

  const bioWatchValue = watch('bio') || '';
  const currentInitial = currentProfile.username.charAt(0);
  const profilePictureWatchValue = watch('profilePicture');

  const RenderStagedPreview = localPreviewUrl ? (
    <img
      src={localPreviewUrl}
      alt="Staging preview"
      className={styles.previewAvatar}
    />
  ) : null;

  const RenderDatabaseAvatar = profilePictureWatchValue ? (
    <img
      src={profilePictureWatchValue}
      alt={currentProfile.username}
      className={styles.previewAvatar}
    />
  ) : null;

  const RenderDefaultFallback = (
    <div className={styles.previewAvatarFallback}>{currentInitial}</div>
  );

  const showStaged = !!localPreviewUrl;
  const showDatabase =
    !localPreviewUrl &&
    profilePictureWatchValue !== null &&
    profilePictureWatchValue !== undefined;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsAvatarRemoved(false);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
  };

  const handleRemoveAvatarClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    setIsAvatarRemoved(true);
    setValue('profilePicture', null);
  };

  const handleFormSubmission = async (values: UpdateProfileInput) => {
    setIsSubmitting(true);

    let uploadedImageUrl = currentProfile.profilePicture;

    if (isAvatarRemoved) {
      uploadedImageUrl = null;
    } else if (selectedFile) {
      try {
        uploadedImageUrl = await uploadImageToCloudinary(
          selectedFile,
          'profiles',
        );
      } catch (uploadError) {
        const errMsg =
          uploadError instanceof Error
            ? uploadError.message
            : 'Image upload failed';
        addToast(errMsg, 'error');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const patchPayload: UpdateProfileInput = {
        bio: values.bio === '' ? null : values.bio,
        profilePicture: uploadedImageUrl,
      };

      const response = await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(patchPayload),
      });

      if (response.ok) {
        const payload = await response.json();
        const updated: UserProfile = payload.data.profile;

        addToast('Your Odinum profile was successfully updated.', 'success');

        const existingUser = useAuthStore.getState().user;
        if (currentAccessToken && existingUser) {
          setAuthData(currentAccessToken, {
            id: updated.id,
            username: updated.username,
            email: existingUser.email,
            profilePicture: updated.profilePicture,
          });
        }

        onProfileUpdated(updated);
        onClose();
      } else {
        addToast('Server rejected identity updates.', 'error');
      }
    } catch {
      addToast('Network link connection failure.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      titleId="edit-profile-title"
      descriptionId="edit-profile-desc"
    >
      <div className={styles.modalContent}>
        <header className={styles.modalHeader}>
          <h3 id="edit-profile-title" className={styles.title}>
            Edit Profile
          </h3>
          <p id="edit-profile-desc" className={styles.subtitle}>
            Update your public bio and avatar.
          </p>
        </header>

        <form
          onSubmit={handleSubmit(handleFormSubmission)}
          className={styles.editForm}
        >
          <div className={styles.avatarUploadGroup}>
            <div className={styles.previewWrapper}>
              {showStaged && RenderStagedPreview}
              {!showStaged && showDatabase && RenderDatabaseAvatar}
              {!showStaged && !showDatabase && RenderDefaultFallback}
            </div>

            <div className={styles.uploadActionsContainer}>
              <div className={styles.actionButtonsRow}>
                <label
                  htmlFor="avatar-file-input"
                  className={styles.fileInputLabel}
                >
                  <Camera size={14} />
                  <span>Choose Image</span>
                </label>

                {(localPreviewUrl || showDatabase) && (
                  <button
                    type="button"
                    className={styles.removeAvatarBtn}
                    onClick={(e) => handleRemoveAvatarClick(e)}
                    disabled={isSubmitting}
                  >
                    Remove Image
                  </button>
                )}
              </div>

              <input
                id="avatar-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={styles.hiddenFileInput}
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
              <span className={styles.uploadInstructionText}>
                Supports JPEG, PNG, or WEBP up to 5MB.
              </span>
            </div>
          </div>

          <div className={styles.inputFieldBlock}>
            <label htmlFor="bio-input-field" className={styles.fieldLabel}>
              Biography Text
            </label>
            <textarea
              id="bio-input-field"
              className={styles.bioTextarea}
              placeholder="Script your chronicle background narrative summary..."
              disabled={isSubmitting}
              maxLength={160}
              {...register('bio')}
            />
            <div className={styles.characterMetaRow}>
              {errors.bio && (
                <span className={styles.validationError}>
                  {errors.bio.message}
                </span>
              )}
              <span className={styles.charCount}>
                {bioWatchValue.length} / 160
              </span>
            </div>
          </div>

          <div className={styles.actionFooterRow}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 size={14} className={styles.spinner} />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </AccessibleModal>
  );
};
