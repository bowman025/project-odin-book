import type { FC } from 'react';
import { Outlet } from 'react-router';
import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import { ToastContainer } from '../../components/ToastContainer/ToastContainer';
import { useAuthStore } from '../../store/authStore.js';

export const RootLayout: FC = () => {
  const isInitializing = useAuthStore((state) => state.isInitializing);

  return (
    <>
      <ToastContainer />

      {isInitializing ? <LoadingScreen /> : <Outlet />}
    </>
  );
};
