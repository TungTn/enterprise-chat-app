import { StateCreator } from 'zustand';
import {
  UserProfile,
  PresenceStatus,
  SOCKET_EVENTS,
} from '@enterprise-chat/shared-types';
import { apiRequest } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { ChatState, AuthSlice } from '../types';
import { setupStoreSocketListeners } from '../socketListeners';

export const createAuthSlice: StateCreator<ChatState, [], [], AuthSlice> = (set, get) => ({
  currentUser: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('enterprise_chat_token') : null,
  webHostUser: null,
  colleagues: [],
  isAuthModalOpen: false,
  authError: null,

  setWebHostUser: (user) => set({ webHostUser: user }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setToken: (token) => set({ token }),
  toggleAuthModal: (force) =>
    set((state) => ({ isAuthModalOpen: force !== undefined ? force : !state.isAuthModalOpen, authError: null })),
  setAuthError: (err) => set({ authError: err }),

  login: async (email: string, password: string) => {
    try {
      set({ authError: null });
      const res = await apiRequest<{ accessToken: string; user: UserProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res && res.accessToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('enterprise_chat_token', res.accessToken);
          localStorage.removeItem('enterprise_chat_logged_out');
        }
        disconnectSocket();
        set({
          token: res.accessToken,
          currentUser: res.user,
          isAuthModalOpen: false,
          authError: null,
          messagesMap: {},
          activeConversationId: null,
        });

        const socket = getSocket(res.accessToken);
        setupStoreSocketListeners(socket, get, set);

        const syncPayload = {
          username: res.user.email.split('@')[0],
          email: res.user.email,
          fullName: res.user.fullName,
          phoneNumber: res.user.phoneNumber,
          source: 'app',
        };
        socket.emit('SYNC_SESSION', syncPayload);
        apiRequest('/auth/sync-session', {
          method: 'POST',
          body: JSON.stringify(syncPayload),
        }, res.accessToken).catch(() => {});

        await get().fetchConversations();
        await get().fetchColleagues();
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.message || 'Đăng nhập không thành công';
      set({ authError: msg });
      return false;
    }
  },

  ssoBpmLogin: async (bpmUser: any, bpmToken?: string) => {
    try {
      set({ authError: null });
      const payload = {
        username: bpmUser.username || bpmUser.code || bpmUser.sub || undefined,
        email: bpmUser.email || undefined,
        fullName: bpmUser.fullName || bpmUser.name || bpmUser.username,
        departmentName: bpmUser.departmentName || bpmUser.department || undefined,
        branchName: bpmUser.branchName || bpmUser.branch || undefined,
        positionName: bpmUser.positionName || bpmUser.position || undefined,
        avatarUrl: (bpmUser.avatarUrl && typeof bpmUser.avatarUrl === 'string' && (bpmUser.avatarUrl.startsWith('http') || bpmUser.avatarUrl.startsWith('data:')))
          ? bpmUser.avatarUrl
          : undefined,
        phoneNumber: bpmUser.phoneNumber || bpmUser.phone || undefined,
      };

      const res = await apiRequest<{ accessToken: string; user: UserProfile }>('/auth/bpm-sso', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.accessToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('enterprise_chat_token', res.accessToken);
          localStorage.removeItem('enterprise_chat_logged_out');
        }
        disconnectSocket();
        set({
          token: res.accessToken,
          currentUser: res.user,
          webHostUser: payload.username || res.user.email.split('@')[0],
          isAuthModalOpen: false,
          authError: null,
          messagesMap: {},
          activeConversationId: null,
        });

        const socket = getSocket(res.accessToken);
        setupStoreSocketListeners(socket, get, set);

        const syncPayload = {
          username: res.user.email.split('@')[0],
          email: res.user.email,
          fullName: res.user.fullName,
          phoneNumber: res.user.phoneNumber,
          departmentName: res.user.departmentName,
          source: 'web',
        };
        socket.emit('SYNC_SESSION', syncPayload);
        apiRequest('/auth/sync-session', {
          method: 'POST',
          body: JSON.stringify(syncPayload),
        }, res.accessToken).catch(() => {});

        await get().fetchConversations();
        await get().fetchColleagues();
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('[SSO] BPM Login could not be completed:', err?.message || err);
      set({ authError: err?.message || 'Không thể đồng bộ phiên đăng nhập từ BPM' });
      return false;
    }
  },

  register: async (data: { email: string; password: string; fullName: string }) => {
    try {
      set({ authError: null });
      const res = await apiRequest<{ accessToken: string; user: UserProfile }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res && res.accessToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('enterprise_chat_token', res.accessToken);
          localStorage.removeItem('enterprise_chat_logged_out');
        }
        disconnectSocket();
        set({
          token: res.accessToken,
          currentUser: res.user,
          isAuthModalOpen: false,
          authError: null,
          messagesMap: {},
          activeConversationId: null,
        });

        const socket = getSocket(res.accessToken);
        setupStoreSocketListeners(socket, get, set);

        await get().fetchConversations();
        await get().fetchColleagues();
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.message || 'Đăng ký tài khoản không thành công';
      set({ authError: msg });
      return false;
    }
  },

  logout: async () => {
    const { token } = get();
    try {
      if (token && token !== 'mock-token-admin') {
        await apiRequest('/auth/logout', { method: 'POST' }, token);
      }
      await apiRequest('/auth/sync-session', { method: 'DELETE' }).catch(() => {});
    } catch (e) {
      // Swallowed
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('enterprise_chat_token');
        localStorage.setItem('enterprise_chat_logged_out', 'true');
      }
      disconnectSocket();
      set({
        token: null,
        currentUser: null,
        conversations: [],
        messagesMap: {},
        activeConversationId: null,
        isAuthModalOpen: true,
      });
    }
  },

  switchAccount: async (email: string, password = 'Company@123') => {
    return get().login(email, password);
  },

  updateUserProfile: async (data: {
    fullName?: string;
    phoneNumber?: string;
    status?: PresenceStatus;
    statusMessage?: string;
  }) => {
    const { token, currentUser } = get();
    if (!currentUser) return false;

    // Immediately notify websocket gateway of presence change
    if (data.status) {
      try {
        getSocket()?.emit(SOCKET_EVENTS.SET_PRESENCE, { status: data.status });
      } catch (e) {
        console.warn('Failed to emit SET_PRESENCE:', e);
      }
    }

    try {
      if (token && token !== 'mock-token-admin') {
        const updated = await apiRequest<UserProfile>(
          '/users/profile',
          {
            method: 'PATCH',
            body: JSON.stringify(data),
          },
          token,
        );
        set({ currentUser: { ...currentUser, ...updated } });
      } else {
        set({ currentUser: { ...currentUser, ...data } });
      }
      return true;
    } catch (err: any) {
      console.error('Failed to update profile on backend, falling back to local state:', err);
      set({ currentUser: { ...currentUser, ...data } });
      return true;
    }
  },

  initAuth: async () => {
    const isEmbedded =
      typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).get('embedded') === 'true' ||
        window.self !== window.top);

    if (isEmbedded) {
      // In embedded mode, Web Gateway host is sovereign.
      // Never query GET /auth/sync-session, which belongs to standalone/desktop sync!
      const bpmUser = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('bpm_user') : null;
      if (bpmUser) {
        get().setWebHostUser(bpmUser);
        const targetEmail = `${bpmUser}@mic.vn`.toLowerCase();
        const { currentUser, token } = get();
        if (!currentUser || !token || currentUser.email?.toLowerCase() !== targetEmail) {
          const bpmName = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('bpm_name') : null;
          const bpmPhone = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('bpm_phone') : null;
          const bpmToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('bpm_token') : null;
          await get().ssoBpmLogin(
            {
              username: bpmUser,
              fullName: bpmName || bpmUser,
              phoneNumber: bpmPhone || undefined,
              email: targetEmail,
            },
            bpmToken || undefined
          );
        }
      }
      return;
    }

    // Standalone mode: Check if user explicitly logged out on this machine
    const isExplicitlyLoggedOut =
      typeof window !== 'undefined' &&
      localStorage.getItem('enterprise_chat_logged_out') === 'true';

    if (isExplicitlyLoggedOut) {
      set({ token: null, currentUser: null, isAuthModalOpen: true });
      return;
    }

    // Standalone mode: Check saved local token first
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('enterprise_chat_token') : null;
    if (savedToken) {
      try {
        const user = await apiRequest<UserProfile>('/auth/me', {}, savedToken);
        if (user && user.id) {
          set({ token: savedToken, currentUser: user, isAuthModalOpen: false });
          const socket = getSocket(savedToken);
          setupStoreSocketListeners(socket, get, set);
          await get().fetchConversations();
          await get().fetchColleagues();
          return;
        }
      } catch (err) {
        console.warn('Saved token expired or invalid:', err);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('enterprise_chat_token');
        }
      }
    }

    // Check if there is an active synced session from Web or other clients on this machine
    try {
      const synced = await apiRequest<any>('/auth/sync-session', {});
      if (synced && (synced.username || synced.email)) {
        const targetEmail = (
          synced.email ||
          (synced.username ? `${synced.username}@mic.vn` : '')
        ).toLowerCase();

        console.log('[InitAuth] Automatically logging in to active synced session:', targetEmail);
        const ok = await get().ssoBpmLogin(synced);
        if (ok) return;
      }
    } catch (e) {
      console.warn('Sync session fetch error:', e);
    }

    // If still unauthenticated, show auth modal
    set({ token: null, currentUser: null, isAuthModalOpen: true });
  },

  fetchColleagues: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const users = await apiRequest<UserProfile[]>('/users', {}, token);
      if (Array.isArray(users)) {
        const { currentUser } = get();
        const filtered = currentUser ? users.filter((u) => u.id !== currentUser.id) : users;
        set({ colleagues: filtered });
      }
    } catch (err) {
      console.warn('Fetch colleagues error:', err);
    }
  },

  searchUsersApi: async (query: string) => {
    const token = get().token;
    const trimmed = query.trim();
    if (!trimmed) return [];
    try {
      const users = await apiRequest<UserProfile[]>(
        `/users?search=${encodeURIComponent(trimmed)}`,
        {},
        token || undefined
      );
      if (Array.isArray(users)) {
        const { currentUser, colleagues } = get();
        const filtered = currentUser ? users.filter((u) => u.id !== currentUser.id) : users;
        const existingIds = new Set(colleagues.map((c) => c.id));
        const newColleagues = [...colleagues];
        for (const u of filtered) {
          if (!existingIds.has(u.id)) {
            newColleagues.push(u);
            existingIds.add(u.id);
          }
        }
        set({ colleagues: newColleagues });
        return filtered;
      }
    } catch (err) {
      console.warn('Search users error:', err);
    }
    return [];
  },
});
