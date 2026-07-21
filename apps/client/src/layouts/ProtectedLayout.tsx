import type { FC } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useIsAuthenticated } from '../store/authStore.js';
import styles from './ProtectedLayout.module.css';

export const ProtectedLayout: FC = () => {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Odinum</div>
      </aside>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};
