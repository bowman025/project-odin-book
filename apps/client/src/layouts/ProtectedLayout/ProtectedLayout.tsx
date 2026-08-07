import type { FC } from 'react';
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router';
import { Header } from '../../components/Header/Header';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { CommentComposer } from '../../features/comments/CommentComposer/CommentComposer';
import type { PostComment } from '../../features/posts/PostDetailPage/postDetailLoader.js';
import { useAuthStore, useIsAuthenticated } from '../../store/authStore.js';
import { useChatStore } from '../../store/chatStore.js';
import styles from './ProtectedLayout.module.css';

export const ProtectedLayout: FC = () => {
  const isAuthenticated = useIsAuthenticated();
  const accessToken = useAuthStore((state) => state.accessToken);
  const connectSocket = useChatStore((state) => state.connectSocket);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSocket(accessToken);
    }
  }, [isAuthenticated, accessToken, connectSocket]);

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
      <Header />
      <Sidebar />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <CommentComposer onCommentCreated={handleGlobalCommentAppend} />
    </div>
  );
};
