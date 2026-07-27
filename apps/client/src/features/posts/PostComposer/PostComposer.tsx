import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreatePostInput,
  CreatePostSchema,
} from '@project-odin-book/validation';
import { Image, Loader2, Send, X } from 'lucide-react';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../../lib/api.js';
import { uploadImageToCloudinary } from '../../../lib/cloudinary.js';
import { useAuthStore } from '../../../store/authStore.js';
import type { TimelinePost } from '../TimelinePage/timelineLoader.js';
import styles from './PostComposer.module.css';

type PostComposerProps = {
  onPostCreated: (newPost: TimelinePost) => void;
};

export const PostComposer: FC<PostComposerProps> = ({ onPostCreated }) => {
  const user = useAuthStore((state) => state.user);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(CreatePostSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onFormSubmit = async (payload: CreatePostInput) => {
    setGlobalError(null);
    setIsSubmitting(true);

    let finalImageUrl: string | null = null;

    try {
      if (selectedFile) {
        try {
          finalImageUrl = await uploadImageToCloudinary(selectedFile, 'posts');
        } catch (uploadErr) {
          const errorInstance =
            uploadErr instanceof Error
              ? uploadErr
              : new Error('Unknown upload failure');
          setGlobalError(
            errorInstance.message ||
              'Image binary upload rejected by asset servers.',
          );
          setIsSubmitting(false);
          return;
        }
      }

      const submissionData = {
        ...payload,
        imageUrl: finalImageUrl,
      };

      const response = await apiFetch('/posts', {
        method: 'POST',
        body: JSON.stringify(submissionData),
      });

      const body = await response.json();

      if (!response.ok) {
        setGlobalError(
          body.message || 'Failed to publish chronicle to the realm.',
        );
        return;
      }

      onPostCreated(body.data.post);

      handleRemoveImage();
      reset();
    } catch {
      setGlobalError('Unable to broadcast chronicle. Server network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarFallbackChar = user?.username.charAt(0) || 'O';

  return (
    <div className={styles.composerCard}>
      {globalError && <div className={styles.globalError}>{globalError}</div>}
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className={styles.formStructure}
      >
        <div className={styles.inputArea}>
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.username}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback}>{avatarFallbackChar}</div>
          )}
          <div className={styles.inputWrapper}>
            <textarea
              id="content"
              placeholder="What's unfolding in the realm?"
              disabled={isSubmitting}
              className={`${styles.textarea} ${errors.content ? styles.textareaError : ''}`}
              {...register('content')}
            />
            {errors.content && (
              <span className={styles.errorMessage}>
                {errors.content.message}
              </span>
            )}

            {previewUrl && (
              <div className={styles.previewContainer}>
                <img
                  src={previewUrl}
                  alt="Attached asset lookup preview"
                  className={styles.imagePreview}
                />
                <button
                  type="button"
                  className={styles.removePreviewBtn}
                  onClick={handleRemoveImage}
                  title="Remove graphic asset"
                  disabled={isSubmitting}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={styles.actionTray}>
          <div className={styles.mediaSlot}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
              className={styles.hiddenFileInput}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className={styles.mediaBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Attach media graphic"
              disabled={isSubmitting}
            >
              <Image size={18} />
              <span className={styles.mediaLabel}>Add Image</span>
            </button>
          </div>
          <button
            type="submit"
            className={styles.publishBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className={styles.spinner} size={16} />
            ) : (
              <Send size={16} />
            )}
            <span>{isSubmitting ? 'Publishing...' : 'Publish'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
