import type { FC } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { useAuthStore } from '../store/authStore.js';

export const RootLayout: FC = () => {
  const isInitializing = useAuthStore((state) => state.isInitializing);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
};
