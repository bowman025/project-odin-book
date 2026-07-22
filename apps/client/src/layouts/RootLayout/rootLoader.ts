import { useAuthStore } from '../../store/authStore.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const rootLoader = async (): Promise<null> => {
  if (useAuthStore.getState().accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.accessToken && data.user) {
        useAuthStore.getState().setAuthData(data.accessToken, data.user);
        return null;
      }
    }
  } catch {}

  useAuthStore.getState().clearAuth();
  return null;
};
