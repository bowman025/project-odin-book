import type { FC } from 'react';
import { Navigate, Outlet } from 'react-router';
import { Sidebar } from '../../components/Sidebar/Sidebar.js';
import { useIsAuthenticated } from '../../store/authStore.js';
import styles from './ProtectedLayout.module.css';

export const ProtectedLayout: FC = () => {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};
