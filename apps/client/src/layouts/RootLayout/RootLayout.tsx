import type { FC } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen.js';
import { ToastContainer } from '../../components/ToastContainer/ToastContainer';
import { useAuthStore } from '../../store/authStore.js';

export const RootLayout: FC = () => {
  const isInitializing = useAuthStore((state) => state.isInitializing);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <>
      <ScrollRestoration />
      <ToastContainer />
      <Outlet />
    </>
  );
};
