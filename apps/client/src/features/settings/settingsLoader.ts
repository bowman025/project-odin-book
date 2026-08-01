import { ensureAuthHydrated } from '../../layouts/RootLayout/rootLoader.js';

export const settingsLoader = async (): Promise<null> => {
  await ensureAuthHydrated();
  return null;
};
