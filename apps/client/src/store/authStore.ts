import { create } from 'zustand';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  bio?: string | null;
  profilePicture?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  setAuthData: (accessToken: string, user: AuthUser) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuthData: (accessToken, user) =>
    set({
      accessToken,
      user,
    }),
  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
    }),
}));

export const useIsAuthenticated = () =>
  useAuthStore((state) => !!state.accessToken && !!state.user);
