import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreatePostInput,
  CreatePostSchema,
} from '@project-odin-book/validation';
import { Image, Loader2, Send } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../../lib/api.js';
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(CreatePostSchema),
  });

  const onFormSubmit = async (payload: CreatePostInput) => {
    setGlobalError(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      if (!response.ok) {
        setGlobalError(body.message || 'Failed to publish post to the realm.');
        return;
      }

      const fullyTypedNewPost: TimelinePost = {
        ...body.data.post,
        author: {
          id: user?.id || '',
          username: user?.username || '',
          profilePicture: user?.profilePicture || null,
        },
        _count: { likes: 0, comments: 0 },
      };

      onPostCreated(fullyTypedNewPost);
      reset();
    } catch {
      setGlobalError('Unable to broadcast post. Server network error.');
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
          </div>
        </div>

        <div className={styles.actionTray}>
          <div className={styles.mediaSlot}>
            <button
              type="button"
              className={styles.mediaBtn}
              title="Attach media graphic"
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
