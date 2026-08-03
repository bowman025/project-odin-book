import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: string;
  message: string;
  type: ToastType;
};

type UIState = {
  activeCommentPostId: string | null;
  openCommentModal: (postId: string) => void;
  closeCommentModal: () => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  isScrollingUp: boolean;
  setScrollingUp: (isScrollingUp: boolean) => void;
};

export const useUIStore = create<UIState>((set, get) => ({
  activeCommentPostId: null,
  toasts: [],
  isScrollingUp: true,
  openCommentModal: (postId) => set({ activeCommentPostId: postId }),
  closeCommentModal: () => set({ activeCommentPostId: null }),
  setScrollingUp: (isScrollingUp) => set({ isScrollingUp }),

  addToast: (message, type = 'success') => {
    const id = crypto.randomUUID();
    const newToast: ToastMessage = { id, message, type };

    set((state) => ({ toasts: [...state.toasts, newToast] }));

    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
