import { useAuthStore } from '../../store/authStore.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

let initializationPromise: Promise<void> | null = null;

export const ensureAuthHydrated = async (): Promise<void> => {
  if (useAuthStore.getState().accessToken) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken && data.user) {
          useAuthStore.getState().setAuthData(data.accessToken, data.user);
          return;
        }
      }
    } catch {}

    useAuthStore.getState().clearAuth();
  })();

  return initializationPromise;
};

export const rootLoader = async (): Promise<null> => {
  await ensureAuthHydrated();
  return null;
};
