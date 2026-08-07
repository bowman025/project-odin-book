import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import type {
  InboxConversation,
  MessagePayload,
} from '../features/conversations/conversationsLoader.js';

type ChatState = {
  socket: Socket | null;
  inbox: InboxConversation[];
  activeConversationId: string | null;
  messageCache: Record<string, MessagePayload[]>;
  typingUsers: Record<string, Record<string, boolean>>;
  onlineUsers: Set<string>;

  connectSocket: (accessToken: string) => void;
  disconnectSocket: () => void;
  setActiveRoom: (conversationId: string | null) => void;
  setInbox: (conversations: InboxConversation[]) => void;
  setMessageHistory: (
    conversationId: string,
    messages: MessagePayload[],
  ) => void;
  prependMessageHistory: (
    conversationId: string,
    oldMessages: MessagePayload[],
  ) => void;

  pushIncomingMessage: (msg: MessagePayload) => void;
  updateLiveMessage: (msg: MessagePayload) => void;
  purgeLiveMessage: (conversationId: string, messageId: string) => void;
  setTypingIndicator: (
    roomId: string,
    userId: string,
    isTyping: boolean,
  ) => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  inbox: [],
  activeConversationId: null,
  messageCache: {},
  typingUsers: {},
  onlineUsers: new Set(),

  connectSocket: (accessToken) => {
    if (get().socket) return;

    const rawApiUrl =
      import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const socketTargetHost = rawApiUrl.replace(/\/api$/, '');

    const socketInstance = io(socketTargetHost, {
      transports: ['websocket'],
      auth: { token: `Bearer ${accessToken}` },
      autoConnect: true,
    });

    socketInstance.on('message_created', (newMessage: MessagePayload) => {
      get().pushIncomingMessage(newMessage);
    });

    socketInstance.on('message_updated', (updatedMessage: MessagePayload) => {
      get().updateLiveMessage(updatedMessage);
    });

    socketInstance.on(
      'message_deleted',
      (payload: { messageId: string; conversationId: string }) => {
        get().purgeLiveMessage(payload.conversationId, payload.messageId);
      },
    );

    socketInstance.on(
      'user_typing',
      (payload: {
        conversationId: string;
        userId: string;
        isTyping: boolean;
      }) => {
        get().setTypingIndicator(
          payload.conversationId,
          payload.userId,
          payload.isTyping,
        );
      },
    );

    socketInstance.on(
      'room_presence',
      (payload: { conversationId: string; onlineUserIds: string[] }) => {
        set((state) => {
          const nextOnline = new Set(state.onlineUsers);
          payload.onlineUserIds.forEach((id) => {
            nextOnline.add(id);
          });
          return { onlineUsers: nextOnline };
        });
      },
    );

    socketInstance.on(
      'batch_room_presence',
      (items: Array<{ conversationId: string; onlineUserIds: string[] }>) => {
        set((state) => {
          const nextOnline = new Set(state.onlineUsers);
          items.forEach((item) => {
            item.onlineUserIds.forEach((id) => {
              nextOnline.add(id);
            });
          });
          return { onlineUsers: nextOnline };
        });
      },
    );

    socketInstance.on('user_online', (payload: { userId: string }) => {
      set((state) => {
        const nextOnline = new Set(state.onlineUsers);
        nextOnline.add(payload.userId);
        return { onlineUsers: nextOnline };
      });
    });

    socketInstance.on('user_offline', (payload: { userId: string }) => {
      set((state) => {
        const nextOnline = new Set(state.onlineUsers);
        nextOnline.delete(payload.userId);
        return { onlineUsers: nextOnline };
      });
    });

    set({ socket: socketInstance });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }
    set({
      socket: null,
      onlineUsers: new Set(),
      typingUsers: {},
      messageCache: {},
    });
  },

  setActiveRoom: (conversationId) => {
    const socket = get().socket;
    const currentActiveRoom = get().activeConversationId;

    if (currentActiveRoom) {
      socket?.emit('leave_conversation', { conversationId: currentActiveRoom });
    }

    if (conversationId) {
      socket?.emit('join_conversation', { conversationId });
    }

    set({ activeConversationId: conversationId });
  },

  setInbox: (conversations) => set({ inbox: conversations }),

  setMessageHistory: (conversationId, messages) =>
    set((state) => ({
      messageCache: {
        ...state.messageCache,
        [conversationId]: messages,
      },
    })),

  prependMessageHistory: (conversationId, oldMessages) =>
    set((state) => {
      const currentMessages = state.messageCache[conversationId] || [];
      return {
        messageCache: {
          ...state.messageCache,
          [conversationId]: [...oldMessages, ...currentMessages],
        },
      };
    }),

  pushIncomingMessage: (msg) =>
    set((state) => {
      const roomLogs = state.messageCache[msg.conversationId] || [];

      if (roomLogs.some((existing) => existing.id === msg.id)) {
        return {};
      }

      const updatedCache = {
        ...state.messageCache,
        [msg.conversationId]: [...roomLogs, msg],
      };

      const updatedInbox = state.inbox
        .map((chat) =>
          chat.id === msg.conversationId
            ? { ...chat, lastMessage: msg, updatedAt: msg.createdAt }
            : chat,
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );

      return {
        messageCache: updatedCache,
        inbox: updatedInbox,
      };
    }),

  updateLiveMessage: (msg) =>
    set((state) => {
      const roomLogs = state.messageCache[msg.conversationId] || [];
      const updatedLogs = roomLogs.map((m) => (m.id === msg.id ? msg : m));

      const updatedInbox = state.inbox.map((chat) =>
        chat.id === msg.conversationId && chat.lastMessage?.id === msg.id
          ? { ...chat, lastMessage: msg }
          : chat,
      );

      return {
        messageCache: {
          ...state.messageCache,
          [msg.conversationId]: updatedLogs,
        },
        inbox: updatedInbox,
      };
    }),

  purgeLiveMessage: (conversationId, messageId) =>
    set((state) => {
      const roomLogs = state.messageCache[conversationId] || [];
      const updatedLogs = roomLogs.filter((m) => m.id !== messageId);

      const updatedInbox = state.inbox.map((chat) => {
        if (chat.id === conversationId && chat.lastMessage?.id === messageId) {
          const nextLatest = updatedLogs.at(-1) || null;
          return { ...chat, lastMessage: nextLatest };
        }
        return chat;
      });

      return {
        messageCache: { ...state.messageCache, [conversationId]: updatedLogs },
        inbox: updatedInbox,
      };
    }),

  setTypingIndicator: (roomId, userId, isTyping) =>
    set((state) => {
      const currentRoomTyping = state.typingUsers[roomId] || {};
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: { ...currentRoomTyping, [userId]: isTyping },
        },
      };
    }),
}));
