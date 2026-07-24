import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateCommentInput } from '@project-odin-book/validation';
import { CreateCommentSchema } from '@project-odin-book/validation';
import { Loader2, Send } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import type { PostComment } from '../posts/PostDetailPage/postDetailLoader.js';
import styles from './CommentComposer.module.css';

type CommentComposerProps = {
  postId: string;
  onCommentCreated: (newComment: PostComment) => void;
};

export const CommentComposer = forwardRef<
  HTMLTextAreaElement,
  CommentComposerProps
>(({ postId, onCommentCreated }, ref) => {
  const user = useAuthStore((state) => state.user);
  const [globalFormError, setGlobalFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(CreateCommentSchema),
  });

  const onCommentSubmit = async (payload: CreateCommentInput) => {
    setGlobalFormError(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      if (!response.ok) {
        setGlobalFormError(body.message || 'Comment rejected by the server.');
        return;
      }

      const freshlyPublishedComment: PostComment = {
        id: body.data.comment.id,
        content: body.data.comment.content,
        createdAt: body.data.comment.createdAt,
        author: {
          id: user?.id || '',
          username: user?.username || '',
          profilePicture: user?.profilePicture || null,
        },
      };

      onCommentCreated(freshlyPublishedComment);
      reset();
    } catch {
      setGlobalFormError(
        'Network transport connection failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const { ref: hookFormRef, ...restRegister } = register('content');

  return (
    <section className={styles.commentComposerSection}>
      <h3 className={styles.sectionTitle}>Join the conversation</h3>
      {globalFormError && (
        <div className={styles.composerErrorBlock}>{globalFormError}</div>
      )}

      <form
        onSubmit={handleSubmit(onCommentSubmit)}
        className={styles.composerForm}
      >
        <textarea
          id="content"
          placeholder="Write your response to this chronicle..."
          disabled={isSubmitting}
          className={`${styles.textarea} ${errors.content ? styles.textareaError : ''}`}
          {...restRegister}
          ref={(node) => {
            hookFormRef(node);
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
        />
        {errors.content && (
          <span className={styles.errorFieldMessage}>
            {errors.content.message}
          </span>
        )}

        <button
          type="submit"
          className={styles.submitReplyBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className={styles.spinner} size={16} />
          ) : (
            <Send size={16} />
          )}
          <span>{isSubmitting ? 'Broadcasting...' : 'Reply'}</span>
        </button>
      </form>
    </section>
  );
});

CommentComposer.displayName = 'CommentComposer';
