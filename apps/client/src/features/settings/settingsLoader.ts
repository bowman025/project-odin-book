import { ensureAuthHydrated } from '../../layouts/RootLayout/rootLoader.js';
import { apiFetch } from '../../lib/api.js';

export type SettingsLoaderResult = {
  hasPassword: boolean;
};

export const settingsLoader = async (): Promise<SettingsLoaderResult> => {
  await ensureAuthHydrated();

  const response = await apiFetch('/auth/me/details');

  if (!response.ok) {
    throw new Response('Failed to load profile security details.', {
      status: response.status,
    });
  }

  const payload = await response.json();

  return {
    hasPassword: payload.data.hasPassword,
  };
};
