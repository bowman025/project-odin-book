import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router';
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { apiFetch } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';

export const RootLayout: FC = () => {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    const bootstrapSession = async () => {
      try {
        const response = await apiFetch('/auth/refresh', {
          method: 'POST',
          skipAuth: true,
        });

        if (response.ok) {
          const data = await response.json();

          if (data.accessToken && data.user) {
            setAuthData(data.accessToken, data.user);
            return;
          }
        }

        clearAuth();
      } catch {
        clearAuth();
      }
    };

    bootstrapSession();
  }, [setAuthData, clearAuth]);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return <Outlet />;
};
