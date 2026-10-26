import { create } from 'zustand';
import {
  UserProfile,
  ChatMessage,
  ConversationSummary,
  ActiveCallState,
  CallType,
  ChatAiSummary,
  ChatSettings,
  MessageType,
  PresenceStatus,
  UserRole,
  ChannelScope,
  SOCKET_EVENTS,
} from '@enterprise-chat/shared-types';
import {
  playMessageSentSound,
  playMessageReceivedSound,
  playCallRingtone,
  stopCallRingtone,
  playCallEndSound,
} from '@/lib/soundService';
import { apiRequest } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const DEFAULT_SETTINGS: ChatSettings = {
  notifications: {
    oneOnOne: true,
    group: true,
    mentions: true,
    playSound: true,
    combinedSound: false,
    unreadBadge: true,
    taskbarAlert: true,
  },
  appearance: {
    mode: 'light',
    themeId: 'dots',
  },
  account: {
    interfaceScale: '100%',
    language: 'vi',
    startAutomatically: true,
  },
};

interface ChatState {
  // Auth & Profile
  currentUser: UserProfile | null;
  token: string | null;

  // Conversations & Messages
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messagesMap: Record<string, ChatMessage[]>;

  // UI Dialog Visibility
  isInfoPanelOpen: boolean;
  isSettingsOpen: boolean;
  isCreateGroupOpen: boolean;
  isCreatePollOpen: boolean;
  isAiSummaryOpen: boolean;
  isCallModalOpen: boolean;
  isStarredOpen: boolean;
  isForwardOpen: boolean;
  isSearchOpen: boolean;
  isQuickWidgetOpen: boolean;

  // Message Actions Context
  replyingMessage: ChatMessage | null;
  editingMessage: ChatMessage | null;
  messageToForward: ChatMessage | null;
  searchQuery: string;

  // Voice / Video Call
  activeCall: ActiveCallState | null;

  // AI Summary
  isGeneratingSummary: boolean;
  currentAiSummary: ChatAiSummary | null;

  // Settings
  settings: ChatSettings;

  // Setters & Actions
  setCurrentUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setConversations: (conversations: ConversationSummary[]) => void;
  setActiveConversationId: (id: string | null) => void;
  setMessages: (conversationId: string, messages: ChatMessage[]) => void;
  sendMessage: (payload: {
    conversationId: string;
    content: string;
    type?: MessageType;
    attachmentIds?: string[];
    replyTo?: ChatMessage;
    poll?: any;
    voice?: any;
  }) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  togglePinMessage: (messageId: string) => void;
  toggleStarMessage: (messageId: string) => void;
  votePoll: (messageId: string, optionId: string) => void;

  // Dialog Toggles
  toggleInfoPanel: (force?: boolean) => void;
  toggleSettings: (force?: boolean) => void;
  toggleCreateGroup: (force?: boolean) => void;
  toggleCreatePoll: (force?: boolean) => void;
  toggleAiSummary: (force?: boolean) => void;
  toggleCallModal: (force?: boolean) => void;
  toggleStarred: (force?: boolean) => void;
  toggleForward: (force?: boolean) => void;
  toggleSearch: (force?: boolean) => void;
  toggleQuickWidget: (force?: boolean) => void;

  // Context Setters
  setReplyingMessage: (msg: ChatMessage | null) => void;
  setEditingMessage: (msg: ChatMessage | null) => void;
  setMessageToForward: (msg: ChatMessage | null) => void;
  setSearchQuery: (q: string) => void;

  // Call Actions
  startCall: (type: CallType) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleCallMinimize: () => void;

  // AI Summary Actions
  generateAiSummary: () => Promise<void>;

  // Backend Integration Actions
  initAuth: (email?: string, password?: string) => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  createChannelApi: (data: {
    name: string;
    scope: ChannelScope;
    description?: string;
    departmentId?: string;
    memberIds?: string[];
  }) => Promise<string | null>;
  createDirectApi: (targetUserId: string) => Promise<string | null>;

  // Settings
  updateSettings: (partial: Partial<ChatSettings>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentUser: {
    id: 'u-admin',
    email: 'admin@company.com',
    fullName: 'Nguyễn Văn Quản Trị',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    role: UserRole.SUPER_ADMIN,
    status: PresenceStatus.ONLINE,
    createdAt: new Date().toISOString(),
  },
  token: 'mock-token-admin',

  conversations: [
    {
      id: 'c-general',
      type: 'CHANNEL' as any,
      name: 'thong-bao-cong-ty',
      scope: 'COMPANY' as any,
      description: 'Kênh thông báo chính thức toàn công ty',
      unreadCount: 0,
      members: [],
    },
    {
      id: 'c-coffee',
      type: 'CHANNEL' as any,
      name: 'goc-tra-da-cong-nghe',
      scope: 'COMPANY' as any,
      description: 'Giao lưu trà đá chém gió công nghệ',
      unreadCount: 2,
      members: [],
    },
    {
      id: 'c-tech',
      type: 'CHANNEL' as any,
      name: 'engineering-core',
      scope: 'DEPARTMENT' as any,
      description: 'Thảo luận kiến trúc hệ thống và code review',
      unreadCount: 0,
      members: [],
    },
    {
      id: 'dm-lead',
      type: 'DIRECT' as any,
      name: 'Trần Trọng Kỹ Thuật (Tech Lead)',
      unreadCount: 1,
      members: [
        {
          id: 'u-techlead',
          email: 'lead.tech@company.com',
          fullName: 'Trần Trọng Kỹ Thuật',
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=techlead',
          role: UserRole.DEPARTMENT_MANAGER,
          status: PresenceStatus.ONLINE,
          createdAt: new Date().toISOString(),
        },
      ],
    },
    {
      id: 'dm-dev',
      type: 'DIRECT' as any,
      name: 'Lê Hoàng Lập Trình (Dev)',
      unreadCount: 0,
      members: [
        {
          id: 'u-dev',
          email: 'developer@company.com',
          fullName: 'Lê Hoàng Lập Trình',
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=dev',
          role: UserRole.EMPLOYEE,
          status: PresenceStatus.ONLINE,
          createdAt: new Date().toISOString(),
        },
      ],
    },
  ],
  activeConversationId: 'c-general',

  messagesMap: {
    'c-general': [
      {
        id: 'msg-1',
        conversationId: 'c-general',
        senderId: 'u-techlead',
        senderName: 'Trần Trọng Kỹ Thuật',
        senderAvatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=techlead',
        content: 'Chào mừng cả đội đã di chuyển thành công sang nền tảng Enterprise Chat mới! 🚀',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        reactions: { '👍': ['u-admin', 'u-dev'], '🎉': ['u-admin'] },
        createdAt: '08:30',
      },
      {
        id: 'msg-2',
        conversationId: 'c-general',
        senderId: 'u-admin',
        senderName: 'Nguyễn Văn Quản Trị',
        senderAvatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
        content: 'Hệ sinh thái mới hỗ trợ đầy đủ Web React và Mobile React Native (iOS & Android) mượt mà.',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        createdAt: '08:35',
      },
      {
        id: 'msg-3',
        conversationId: 'c-general',
        senderId: 'u-techlead',
        senderName: 'Trần Trọng Kỹ Thuật',
        senderAvatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=techlead',
        content: 'Khảo sát ý kiến team về thời gian release bản chính thức:',
        type: MessageType.POLL,
        poll: {
          id: 'poll-1',
          question: 'Thời điểm release phiên bản 2.0 toàn doanh nghiệp?',
          options: [
            { id: 'opt-1', text: 'Thứ 6 tuần này', voterIds: ['u-admin'], voterNames: ['Nguyễn Văn Quản Trị'] },
            { id: 'opt-2', text: 'Đầu tuần sau để test thêm', voterIds: ['u-dev'], voterNames: ['Lê Hoàng Lập Trình'] },
          ],
          isMultiple: false,
          totalVotes: 2,
        },
        isEdited: false,
        isDeleted: false,
        createdAt: '08:40',
      },
    ],
    'c-coffee': [
      {
        id: 'msg-c1',
        conversationId: 'c-coffee',
        senderId: 'u-dev',
        senderName: 'Lê Hoàng Lập Trình',
        senderAvatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=dev',
        content: 'Ai uống cà phê sáng không, tầng 5 có cà phê rang xay mới nhé mọi người ☕',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        createdAt: '09:00',
      },
    ],
  },

  isInfoPanelOpen: false,
  isSettingsOpen: false,
  isCreateGroupOpen: false,
  isCreatePollOpen: false,
  isAiSummaryOpen: false,
  isCallModalOpen: false,
  isStarredOpen: false,
  isForwardOpen: false,
  isSearchOpen: false,
  isQuickWidgetOpen: false,

  replyingMessage: null,
  editingMessage: null,
  messageToForward: null,
  searchQuery: '',

  activeCall: null,

  isGeneratingSummary: false,
  currentAiSummary: null,

  settings: DEFAULT_SETTINGS,

  setCurrentUser: (user) => set({ currentUser: user }),
  setToken: (token) => set({ token }),
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (id) => {
    set({ activeConversationId: id });
    if (id) {
      get().fetchMessages(id);
    }
  },
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesMap: { ...state.messagesMap, [conversationId]: messages },
    })),

  sendMessage: ({ conversationId, content, type = MessageType.TEXT, replyTo, poll, voice }) => {
    const { currentUser, messagesMap, settings, token } = get();
    if (!currentUser) return;

    const tempId = `msg-${Date.now()}`;
    const newMessage: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderAvatarUrl: currentUser.avatarUrl,
      content,
      type,
      replyTo: replyTo
        ? {
            messageId: replyTo.id,
            senderName: replyTo.senderName,
            content: replyTo.content,
          }
        : undefined,
      poll,
      voice,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const currentList = messagesMap[conversationId] || [];
    set({
      messagesMap: {
        ...messagesMap,
        [conversationId]: [...currentList, newMessage],
      },
      replyingMessage: null,
    });

    if (settings.notifications.playSound) {
      playMessageSentSound();
    }

    // Persist to PostgreSQL if authenticated
    if (token) {
      apiRequest<ChatMessage>(
        '/chat/messages',
        {
          method: 'POST',
          body: JSON.stringify({
            conversationId,
            content,
            type,
          }),
        },
        token,
      )
        .then((saved) => {
          if (saved && saved.id) {
            const list = get().messagesMap[conversationId] || [];
            set({
              messagesMap: {
                ...get().messagesMap,
                [conversationId]: list.map((m) => (m.id === tempId ? saved : m)),
              },
            });
          }
        })
        .catch((err) => {
          console.warn('Persist message to DB error:', err);
        });
    }
  },

  editMessage: (messageId, content) => {
    const { activeConversationId, messagesMap } = get();
    if (!activeConversationId) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) =>
      m.id === messageId ? { ...m, content, isEdited: true, updatedAt: new Date().toISOString() } : m
    );

    set({
      messagesMap: { ...messagesMap, [activeConversationId]: updated },
      editingMessage: null,
    });
  },

  deleteMessage: (messageId) => {
    const { activeConversationId, messagesMap } = get();
    if (!activeConversationId) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) =>
      m.id === messageId ? { ...m, isDeleted: true, content: 'Tin nhắn này đã bị xóa' } : m
    );

    set({
      messagesMap: { ...messagesMap, [activeConversationId]: updated },
    });
  },

  toggleReaction: (messageId, emoji) => {
    const { activeConversationId, currentUser, messagesMap } = get();
    if (!activeConversationId || !currentUser) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) => {
      if (m.id !== messageId) return m;

      const reactions = { ...(m.reactions || {}) };
      const userList = reactions[emoji] || [];
      const hasReacted = userList.includes(currentUser.id);

      if (hasReacted) {
        reactions[emoji] = userList.filter((id) => id !== currentUser.id);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji] = [...userList, currentUser.id];
      }

      return { ...m, reactions };
    });

    set({
      messagesMap: { ...messagesMap, [activeConversationId]: updated },
    });
  },

  togglePinMessage: (messageId) => {
    const { activeConversationId, messagesMap } = get();
    if (!activeConversationId) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) =>
      m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
    );

    set({
      messagesMap: { ...messagesMap, [activeConversationId]: updated },
    });
  },

  toggleStarMessage: (messageId) => {
    const { activeConversationId, messagesMap } = get();
    if (!activeConversationId) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) =>
      m.id === messageId ? { ...m, isStarred: !m.isStarred } : m
    );

    set({
      messagesMap: { ...messagesMap, [activeConversationId]: updated },
    });
  },

  votePoll: (messageId, optionId) => {
    const { activeConversationId, currentUser, messagesMap } = get();
    if (!activeConversationId || !currentUser) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) => {
      if (m.id !== messageId || !m.poll) return m;

      const poll = { ...m.poll };
      let newTotal = 0;

      poll.options = poll.options.map((opt) => {
        const voterIds = [...opt.voterIds];
        const voterNames = [...(opt.voterNames || [])];
        const alreadyVoted = voterIds.includes(currentUser.id);

        if (opt.id === optionId) {
          if (alreadyVoted) {
            // Unvote
            const idx = voterIds.indexOf(currentUser.id);
            voterIds.splice(idx, 1);
            voterNames.splice(idx, 1);
          } else {
            voterIds.push(currentUser.id);
            voterNames.push(currentUser.fullName);
          }
        } else if (!poll.isMultiple && alreadyVoted) {
          // If single choice and voted other option, remove
          const idx = voterIds.indexOf(currentUser.id);
          voterIds.splice(idx, 1);
          voterNames.splice(idx, 1);
        }

        newTotal += voterIds.length;
        return { ...opt, voterIds, voterNames };
      });

      poll.totalVotes = newTotal;
      return { ...m, poll };
    });

    set({
      messagesMap: { ...messagesMap, [activeConversationId]: updated },
    });
  },

  toggleInfoPanel: (force) =>
    set((state) => ({ isInfoPanelOpen: force !== undefined ? force : !state.isInfoPanelOpen })),
  toggleSettings: (force) =>
    set((state) => ({ isSettingsOpen: force !== undefined ? force : !state.isSettingsOpen })),
  toggleCreateGroup: (force) =>
    set((state) => ({ isCreateGroupOpen: force !== undefined ? force : !state.isCreateGroupOpen })),
  toggleCreatePoll: (force) =>
    set((state) => ({ isCreatePollOpen: force !== undefined ? force : !state.isCreatePollOpen })),
  toggleAiSummary: (force) =>
    set((state) => ({ isAiSummaryOpen: force !== undefined ? force : !state.isAiSummaryOpen })),
  toggleCallModal: (force) =>
    set((state) => ({ isCallModalOpen: force !== undefined ? force : !state.isCallModalOpen })),
  toggleStarred: (force) =>
    set((state) => ({ isStarredOpen: force !== undefined ? force : !state.isStarredOpen })),
  toggleForward: (force) =>
    set((state) => ({ isForwardOpen: force !== undefined ? force : !state.isForwardOpen })),
  toggleSearch: (force) =>
    set((state) => ({ isSearchOpen: force !== undefined ? force : !state.isSearchOpen })),
  toggleQuickWidget: (force) =>
    set((state) => ({ isQuickWidgetOpen: force !== undefined ? force : !state.isQuickWidgetOpen })),

  setReplyingMessage: (msg) => set({ replyingMessage: msg }),
  setEditingMessage: (msg) => set({ editingMessage: msg }),
  setMessageToForward: (msg) => set({ messageToForward: msg }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  startCall: (type) => {
    const { conversations, activeConversationId } = get();
    const activeConv = conversations.find((c) => c.id === activeConversationId);

    playCallRingtone();

    set({
      activeCall: {
        id: `call-${Date.now()}`,
        conversationId: activeConversationId || 'unknown',
        conversationName: activeConv?.name || 'Cuộc gọi thoại',
        conversationAvatar: undefined,
        isGroup: activeConv?.type === ('CHANNEL' as any),
        type,
        status: 'calling',
        durationSeconds: 0,
        isMuted: false,
        isVideoOff: type === 'audio',
        isScreenSharing: false,
        isMinimized: false,
      },
      isCallModalOpen: true,
    });
  },

  endCall: () => {
    playCallEndSound();
    set({
      activeCall: null,
      isCallModalOpen: false,
    });
  },

  toggleMute: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    set({ activeCall: { ...activeCall, isMuted: !activeCall.isMuted } });
  },

  toggleVideo: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    set({ activeCall: { ...activeCall, isVideoOff: !activeCall.isVideoOff } });
  },

  toggleScreenShare: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    set({ activeCall: { ...activeCall, isScreenSharing: !activeCall.isScreenSharing } });
  },

  toggleCallMinimize: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    set({ activeCall: { ...activeCall, isMinimized: !activeCall.isMinimized } });
  },

  generateAiSummary: async () => {
    set({ isGeneratingSummary: true });
    // Simulate smart AI extraction
    await new Promise((r) => setTimeout(r, 1500));

    const mockSummary: ChatAiSummary = {
      topic: 'Kế hoạch triển khai & Release hệ sinh thái Enterprise Chat mới',
      keyPoints: [
        'Đã hoàn thành di chuyển toàn bộ logic từ Vue 3 sang React 19 và React Native (Expo 52).',
        'Loại bỏ 100% định danh và tiền tố Mic, chuyển sang tiêu chuẩn Enterprise trung tính.',
        'Hỗ trợ chế độ Toàn màn hình và Cửa sổ nổi (Floating Widget) đồng bộ trên Web.',
        'Tối ưu hiệu năng cuộn trên điện thoại với @shopify/flash-list 60-120fps.',
      ],
      decisions: [
        'Thống nhất sử dụng Next.js 15 và Tailwind CSS cho bản Web.',
        'Sử dụng chung gói @enterprise-chat/shared-types cho toàn bộ nền tảng.',
      ],
      actionItems: [
        { task: 'Hoàn tất kiểm thử các kịch bản gọi điện thoại và push notification', status: 'in_progress' },
        { task: 'Cấu hình Docker Compose môi trường production', status: 'pending' },
        { task: 'Seed tài khoản và phân quyền quản trị ban đầu', status: 'done' },
      ],
      metrics: {
        messageCount: 28,
        participantCount: 4,
        timeRange: 'Hôm nay',
      },
      generatedAt: new Date().toLocaleTimeString('vi-VN'),
    };

    set({
      currentAiSummary: mockSummary,
      isGeneratingSummary: false,
    });
  },

  initAuth: async (email = 'admin@company.com', password = 'Company@123') => {
    try {
      const res = await apiRequest<{ accessToken: string; user: UserProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res && res.accessToken) {
        set({ token: res.accessToken, currentUser: res.user });
        // Connect socket
        const socket = getSocket(res.accessToken);
        socket.on(SOCKET_EVENTS.NEW_MESSAGE, (incoming: ChatMessage) => {
          if (!incoming || !incoming.conversationId) return;
          const { messagesMap, settings } = get();
          const list = messagesMap[incoming.conversationId] || [];
          if (!list.some((m) => m.id === incoming.id)) {
            set({
              messagesMap: {
                ...messagesMap,
                [incoming.conversationId]: [...list, incoming],
              },
            });
            if (settings.notifications.playSound) {
              playMessageReceivedSound();
            }
          }
        });

        // Load conversations from PostgreSQL
        await get().fetchConversations();
      }
    } catch (err) {
      console.warn('Backend login fallback to mock mode:', err);
    }
  },

  fetchConversations: async () => {
    const { token, activeConversationId } = get();
    if (!token) return;
    try {
      const list = await apiRequest<ConversationSummary[]>('/channels/my-conversations', {}, token);
      if (Array.isArray(list) && list.length > 0) {
        set({ conversations: list });
        const targetId = (activeConversationId && list.some((c) => c.id === activeConversationId))
          ? activeConversationId
          : list[0].id;
        set({ activeConversationId: targetId });
        await get().fetchMessages(targetId);
      }
    } catch (err) {
      console.warn('Fetch conversations error:', err);
    }
  },

  fetchMessages: async (conversationId: string) => {
    const { token, messagesMap } = get();
    if (!token || !conversationId) return;
    try {
      const msgs = await apiRequest<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`, {}, token);
      if (Array.isArray(msgs)) {
        set({
          messagesMap: {
            ...messagesMap,
            [conversationId]: msgs,
          },
        });
      }
    } catch (err) {
      console.warn('Fetch messages error:', err);
    }
  },

  createChannelApi: async (data) => {
    const { token, conversations } = get();
    try {
      const newConv = await apiRequest<ConversationSummary>(
        '/channels',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        token || undefined,
      );
      if (newConv && newConv.id) {
        set({
          conversations: [newConv, ...conversations.filter((c) => c.id !== newConv.id)],
          activeConversationId: newConv.id,
        });
        await get().fetchMessages(newConv.id);
        return newConv.id;
      }
    } catch (err) {
      console.error('Create channel API error:', err);
    }
    return null;
  },

  createDirectApi: async (targetUserId: string) => {
    const { token, conversations } = get();
    try {
      const conv = await apiRequest<ConversationSummary>(
        `/channels/direct/${targetUserId}`,
        { method: 'POST' },
        token || undefined,
      );
      if (conv && conv.id) {
        set({
          conversations: [conv, ...conversations.filter((c) => c.id !== conv.id)],
          activeConversationId: conv.id,
        });
        await get().fetchMessages(conv.id);
        return conv.id;
      }
    } catch (err) {
      console.error('Create direct API error:', err);
    }
    return null;
  },

  updateSettings: (partial) => {
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
  },
}));
