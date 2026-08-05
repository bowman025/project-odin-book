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
  toastTimers: Record<string, ReturnType<typeof setTimeout>>;
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  isScrollingUp: boolean;
  setScrollingUp: (isScrollingUp: boolean) => void;
};

export const useUIStore = create<UIState>((set, get) => ({
  activeCommentPostId: null,
  toasts: [],
  toastTimers: {},
  isScrollingUp: true,
  openCommentModal: (postId) => set({ activeCommentPostId: postId }),
  closeCommentModal: () => set({ activeCommentPostId: null }),
  setScrollingUp: (isScrollingUp) => set({ isScrollingUp }),

  addToast: (message, type = 'success') => {
    const id = crypto.randomUUID();
    const newToast: ToastMessage = { id, message, type };
    const timerId = setTimeout(() => {
      get().removeToast(id);
    }, 3000);

    set((state) => ({
      toasts: [...state.toasts, newToast],
      toastTimers: { ...state.toastTimers, [id]: timerId },
    }));
  },

  removeToast: (id) => {
    const timers = get().toastTimers;

    if (timers[id]) {
      clearTimeout(timers[id]);
    }

    set((state) => {
      const remainingTimers = { ...state.toastTimers };
      delete remainingTimers[id];

      return {
        toasts: state.toasts.filter((t) => t.id !== id),
        toastTimers: remainingTimers,
      };
    });
  },
}));
