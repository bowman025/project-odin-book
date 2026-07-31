import { zodResolver } from '@hookform/resolvers/zod';
import type { UpdatePostInput } from '@project-odin-book/validation';
import { UpdatePostSchema } from '@project-odin-book/validation';
import { Image, X } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../../lib/api.js';
import { uploadImageToCloudinary } from '../../../lib/cloudinary.js';
import { extractHashtags } from '../../../lib/tags.js';
import { useUIStore } from '../../../store/uiStore.js';
import type { TimelinePost } from '../TimelinePage/timelineLoader.js';
import styles from './PostEditor.module.css';

type PostEditorProps = {
  post: TimelinePost;
  onCancel: () => void;
  onPostUpdated: (updatedPost: TimelinePost) => void;
};

export const PostEditor: FC<PostEditorProps> = ({
  post,
  onCancel,
  onPostUpdated,
}) => {
  const addToast = useUIStore((state) => state.addToast);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    post.imageUrl,
  );
  const [newEditFile, setNewEditFile] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePostInput>({
    resolver: zodResolver(UpdatePostSchema),
    defaultValues: { content: post.content },
  });

  useEffect(() => {
    reset({ content: post.content });
    setCurrentImageUrl(post.imageUrl);
    setNewEditFile(null);
    setEditPreviewUrl(null);
  }, [post.content, post.imageUrl, reset]);

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewEditFile(file);
    setCurrentImageUrl(null);

    const localUrl = URL.createObjectURL(file);
    setEditPreviewUrl(localUrl);
  };

  const handleRemoveEditImage = () => {
    setCurrentImageUrl(null);
    setNewEditFile(null);
    if (editPreviewUrl) {
      URL.revokeObjectURL(editPreviewUrl);
      setEditPreviewUrl(null);
    }
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleEditSubmit = async (payload: UpdatePostInput) => {
    setIsSubmitting(true);
    let finalImageUrl = currentImageUrl;

    try {
      if (newEditFile) {
        try {
          finalImageUrl = await uploadImageToCloudinary(newEditFile, 'posts');
        } catch (uploadErr) {
          const errorInstance =
            uploadErr instanceof Error
              ? uploadErr
              : new Error('Image upload failed');
          addToast(
            errorInstance.message || 'Image binary upload rejected.',
            'error',
          );
          setIsSubmitting(false);
          return;
        }
      }

      const automaticTags = extractHashtags(payload.content || '');

      const submissionData = {
        ...payload,
        imageUrl: finalImageUrl,
        tags: automaticTags,
      };

      const response = await apiFetch(`/posts/${post.id}`, {
        method: 'PATCH',
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        const body = await response.json();
        addToast('Chronicle log updated successfully.', 'success');
        setNewEditFile(null);
        setEditPreviewUrl(null);
        onPostUpdated(body.data.post);
      } else {
        addToast('Server rejected modifications.', 'error');
      }
    } catch {
      addToast('Network link connection failure.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentField = register('content');

  return (
    <form onSubmit={handleSubmit(handleEditSubmit)} className={styles.editForm}>
      <textarea
        className={styles.editTextarea}
        disabled={isSubmitting}
        {...contentField}
        ref={(el) => {
          contentField.ref(el);
        }}
      />
      {errors.content && (
        <span className={styles.fieldError}>{errors.content.message}</span>
      )}

      {(currentImageUrl || editPreviewUrl) && (
        <div className={styles.editImageSection}>
          <img
            src={currentImageUrl || editPreviewUrl || ''}
            alt="Modified composition preview"
            className={styles.editImagePreview}
          />
          <button
            type="button"
            className={styles.removePreviewBtn}
            onClick={handleRemoveEditImage}
            disabled={isSubmitting}
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className={styles.editWorkspaceTray}>
        <div className={styles.mediaSlot}>
          <input
            type="file"
            ref={editFileInputRef}
            onChange={handleEditFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
            className={styles.hiddenFileInput}
            disabled={isSubmitting}
          />
          {!currentImageUrl && !editPreviewUrl && (
            <button
              type="button"
              className={styles.workspaceMediaBtn}
              onClick={() => editFileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Image size={14} />
              <span>Change Image</span>
            </button>
          )}
        </div>

        <div className={styles.editActionRow}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={isSubmitting}
          >
            Save Changes
          </button>
        </div>
      </div>
    </form>
  );
};
