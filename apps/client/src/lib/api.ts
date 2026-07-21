import { useAuthStore } from '../store/authStore.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!refreshResponse.ok) {
        useAuthStore.getState().clearAuth();
        return null;
      }

      const { accessToken } = await refreshResponse.json();
      const currentUser = useAuthStore.getState().user;

      if (!accessToken || !currentUser) {
        useAuthStore.getState().clearAuth();
        return null;
      }

      useAuthStore.getState().setAuthData(accessToken, currentUser);
      return accessToken;
    } catch {
      useAuthStore.getState().clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const apiFetch = async (
  endpoint: string,
  options: FetchOptions = {},
): Promise<Response> => {
  const { skipAuth, ...customOptions } = options;
  const headers = new Headers(customOptions.headers);

  if (
    !headers.has('Content-Type') &&
    !(customOptions.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const url = `${BASE_URL}${endpoint}`;
  const init: RequestInit = {
    ...customOptions,
    headers,
    credentials: 'include',
  };

  let response = await fetch(url, init);

  if (response.status === 401 && !skipAuth) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      response = await fetch(url, { ...init, headers });
    }
  }

  return response;
};
