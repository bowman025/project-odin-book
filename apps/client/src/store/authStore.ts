import { create } from 'zustand';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  profilePicture: string | null;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isInitializing: boolean;
  setAuthData: (accessToken: string, user: AuthUser) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitializing: true,
  setAuthData: (accessToken, user) =>
    set({
      accessToken,
      user,
      isInitializing: false,
    }),
  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      isInitializing: false,
    }),
}));

export const useIsAuthenticated = () =>
  useAuthStore((state) => !!state.accessToken && !!state.user);
