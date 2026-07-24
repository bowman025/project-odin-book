import type { FC } from 'react';
import { Navigate, Outlet } from 'react-router';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { CommentComposer } from '../../features/comments/CommentComposer';
import type { PostComment } from '../../features/posts/PostDetailPage/postDetailLoader.js';
import { useIsAuthenticated } from '../../store/authStore.js';
import styles from './ProtectedLayout.module.css';

export const ProtectedLayout: FC = () => {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleGlobalCommentAppend = (
    postId: string,
    newComment: PostComment,
  ) => {
    const event = new CustomEvent('odinum_global_comment_added', {
      detail: { postId, comment: newComment },
    });
    window.dispatchEvent(event);
  };

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <CommentComposer onCommentCreated={handleGlobalCommentAppend} />
    </div>
  );
};
