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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);

  const isCloudinaryUrl =
    currentProfile.profilePicture?.includes('cloudinary.com');
  const safeProfilePictureDefault = isCloudinaryUrl
    ? currentProfile.profilePicture
    : undefined;

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
      profilePicture: safeProfilePictureDefault,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setLocalPreviewUrl(null);
      setIsUploadingImage(false);
      setIsAvatarRemoved(false);

      const isCloudinary =
        currentProfile.profilePicture?.includes('cloudinary.com');
      const safePicture = isCloudinary
        ? currentProfile.profilePicture
        : undefined;

      setValue('profilePicture', safePicture);
      setValue('bio', currentProfile.bio || '');
    }
  }, [isOpen, currentProfile, setValue]);

  const bioWatchValue = watch('bio') || '';
  const currentInitial = currentProfile.username.charAt(0);

  const RenderStagedPreview = localPreviewUrl ? (
    <img
      src={localPreviewUrl}
      alt="Staging preview"
      className={styles.previewAvatar}
    />
  ) : null;

  const RenderDatabaseAvatar = currentProfile.profilePicture ? (
    <img
      src={currentProfile.profilePicture}
      alt={currentProfile.username}
      className={styles.previewAvatar}
    />
  ) : null;

  const RenderDefaultFallback = (
    <div className={styles.previewAvatarFallback}>{currentInitial}</div>
  );

  const showStaged = !!localPreviewUrl;
  const showDatabase =
    !localPreviewUrl && !!currentProfile.profilePicture && !isAvatarRemoved;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    setIsAvatarRemoved(false);
    setIsUploadingImage(true);

    try {
      const secureCloudinaryUrl = await uploadImageToCloudinary(
        file,
        'profiles',
      );

      setValue('profilePicture', secureCloudinaryUrl, { shouldValidate: true });
      addToast('Image uploaded successfully!', 'success');
    } catch (uploadError) {
      const errMsg =
        uploadError instanceof Error
          ? uploadError.message
          : 'Image upload failed';
      addToast(errMsg, 'error');
      setLocalPreviewUrl(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveAvatarClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setLocalPreviewUrl(null);
    setIsAvatarRemoved(true);
    setValue('profilePicture', undefined, { shouldValidate: true });
  };

  const handleFormSubmission = async (values: UpdateProfileInput) => {
    setIsSubmitting(true);

    try {
      const patchPayload: UpdateProfileInput = {
        bio: values.bio === '' ? null : values.bio,
      };

      if (isAvatarRemoved) {
        patchPayload.profilePicture = null;
      } else if (values.profilePicture) {
        patchPayload.profilePicture = values.profilePicture;
      }

      const response = await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(patchPayload),
      });

      if (response.ok) {
        const payload = await response.json();
        const updated: UserProfile = payload.data.profile;

        addToast('Your Odinum profile was updated!', 'success');

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
        addToast('Server rejected updates.', 'error');
      }
    } catch {
      addToast('Network error.', 'error');
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
              {isUploadingImage ? (
                <div className={styles.previewAvatarFallback}>
                  <Loader2 size={18} className={styles.spinner} />
                </div>
              ) : (
                <>
                  {showStaged && RenderStagedPreview}
                  {!showStaged && showDatabase && RenderDatabaseAvatar}
                  {!showStaged && !showDatabase && RenderDefaultFallback}
                </>
              )}
            </div>

            <div className={styles.uploadActionsContainer}>
              <div className={styles.actionButtonsRow}>
                <label
                  htmlFor="avatar-file-input"
                  className={`${styles.fileInputLabel} ${isUploadingImage || isSubmitting ? styles.disabledLabel : ''}`}
                >
                  <Camera size={14} />
                  <span>Choose Image</span>
                </label>

                {(localPreviewUrl || showDatabase) && (
                  <button
                    type="button"
                    className={styles.removeAvatarBtn}
                    onClick={handleRemoveAvatarClick}
                    disabled={isSubmitting || isUploadingImage}
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
                disabled={isSubmitting || isUploadingImage}
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
              placeholder="Write your bio..."
              disabled={isSubmitting || isUploadingImage}
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
              disabled={isSubmitting || isUploadingImage}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || isUploadingImage}
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
