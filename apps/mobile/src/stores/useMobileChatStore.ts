import { create } from 'zustand';
import {
  UserProfile,
  ChatMessage,
  ConversationSummary,
  MessageType,
  PresenceStatus,
  UserRole,
  ConversationType,
  ChannelScope,
  ChatAiSummary,
  AttachmentMetadata,
  ChatVoiceData,
  ChatPoll,
} from '@enterprise-chat/shared-types';
import { mobileApiRequest } from '../services/api';

interface MobileChatState {
  currentUser: UserProfile;
  token: string | null;
  conversations: ConversationSummary[];
  messagesMap: Record<string, ChatMessage[]>;
  aiSummary: ChatAiSummary | null;
  isGeneratingSummary: boolean;

  initMobileAuth: (email?: string, password?: string) => Promise<void>;
  fetchRemoteConversations: () => Promise<void>;
  fetchRemoteMessages: (conversationId: string) => Promise<void>;
  setCurrentUser: (user: UserProfile) => void;
  sendMessage: (payload: {
    conversationId: string;
    content: string;
    type?: MessageType;
    poll?: ChatPoll;
    attachments?: AttachmentMetadata[];
    voice?: ChatVoiceData;
  }) => void;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => void;
  votePoll: (conversationId: string, messageId: string, optionId: string) => void;
  addChannel: (channel: { name: string; scope: ChannelScope; description?: string }) => string;
  addDirectMessage: (colleague: { id: string; fullName: string; department?: string }) => string;
  generateAiSummary: (conversationName?: string) => Promise<void>;
}

export const useMobileChatStore = create<MobileChatState>((set, get) => ({
  currentUser: {
    id: 'u-admin',
    email: 'admin@company.com',
    fullName: 'Nguyễn Văn Quản Trị',
    avatarUrl: null,
    role: UserRole.SUPER_ADMIN,
    status: PresenceStatus.ONLINE,
    createdAt: new Date().toISOString(),
  },

  conversations: [
    {
      id: 'c-general',
      type: ConversationType.CHANNEL,
      name: 'thong-bao-cong-ty',
      scope: ChannelScope.COMPANY,
      description: 'Kênh thông báo chính thức toàn công ty',
      unreadCount: 0,
      members: [],
    },
    {
      id: 'c-coffee',
      type: ConversationType.CHANNEL,
      name: 'goc-tra-da-cong-nghe',
      scope: ChannelScope.COMPANY,
      description: 'Giao lưu trà đá chém gió công nghệ',
      unreadCount: 2,
      members: [],
    },
    {
      id: 'c-tech',
      type: ConversationType.CHANNEL,
      name: 'engineering-core',
      scope: ChannelScope.DEPARTMENT,
      description: 'Thảo luận kiến trúc hệ thống và code review',
      unreadCount: 0,
      members: [],
    },
    {
      id: 'dm-lead',
      type: ConversationType.DIRECT,
      name: 'Trần Trọng Kỹ Thuật (Tech Lead)',
      unreadCount: 1,
      members: [],
    },
    {
      id: 'dm-dev',
      type: ConversationType.DIRECT,
      name: 'Lê Hoàng Lập Trình (Dev)',
      unreadCount: 0,
      members: [],
    },
  ],

  messagesMap: {
    'c-general': [
      {
        id: 'm-g1',
        conversationId: 'c-general',
        senderId: 'u-techlead',
        senderName: 'Trần Trọng Kỹ Thuật',
        senderAvatarUrl: null,
        content: 'Chào mừng cả đội đã kết nối ứng dụng Enterprise Chat trên điện thoại! 📱✨',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        reactions: { '👍': ['u-admin', 'u-dev'], '🎉': ['u-admin'] } as Record<string, string[]>,
        createdAt: '08:30',
      },
      {
        id: 'm-g2',
        conversationId: 'c-general',
        senderId: 'u-admin',
        senderName: 'Nguyễn Văn Quản Trị',
        senderAvatarUrl: null,
        content: 'Ứng dụng đã được nâng cấp lên Expo SDK 58 và React 19, chạy mượt mà trên iPhone/Android.',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        reactions: { '🔥': ['u-techlead'] } as Record<string, string[]>,
        createdAt: '08:35',
      },
      {
        id: 'm-g3',
        conversationId: 'c-general',
        senderId: 'u-techlead',
        senderName: 'Trần Trọng Kỹ Thuật',
        senderAvatarUrl: null,
        content: 'Khảo sát ý kiến toàn thể team về thời gian release chính thức:',
        type: MessageType.POLL,
        poll: {
          id: 'poll-1',
          question: 'Thời điểm release phiên bản Mobile cho toàn bộ nhân viên?',
          options: [
            { id: 'opt-1', text: 'Thứ Sáu tuần này lúc 15h00', voterIds: ['u-admin', 'u-dev'] },
            { id: 'opt-2', text: 'Đầu tuần sau để kiểm thử thêm', voterIds: ['u-hr'] },
          ],
          isMultiple: false,
          totalVotes: 3,
        },
        isEdited: false,
        isDeleted: false,
        createdAt: '08:40',
      },
      {
        id: 'm-g4',
        conversationId: 'c-general',
        senderId: 'u-dev',
        senderName: 'Lê Hoàng Lập Trình',
        senderAvatarUrl: null,
        content: 'Đã gửi tài liệu hướng dẫn sử dụng phiên bản mới:',
        type: MessageType.ATTACHMENT,
        attachments: [
          {
            id: 'att-1',
            fileName: 'Huong_Dan_Enterprise_Chat_v2.pdf',
            fileSizeBytes: 2450000,
            mimeType: 'application/pdf',
          },
        ],
        isEdited: false,
        isDeleted: false,
        createdAt: '08:45',
      },
    ],
    'c-coffee': [
      {
        id: 'm-c1',
        conversationId: 'c-coffee',
        senderId: 'u-dev',
        senderName: 'Lê Hoàng Lập Trình',
        senderAvatarUrl: null,
        content: 'Ai uống cà phê sáng không? Tầng 5 có cà phê rang xay mới nhé mọi người ☕🥐',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        reactions: { '❤️': ['u-admin', 'u-techlead'] } as Record<string, string[]>,
        createdAt: '09:00',
      },
      {
        id: 'm-c2',
        conversationId: 'c-coffee',
        senderId: 'u-hr',
        senderName: 'Phạm Thị Nhân Sự',
        senderAvatarUrl: null,
        content: 'Chiều nay 16h30 có tiệc ngọt mừng sinh nhật tháng tại Pantry nhé cả nhà! 🎂🎉',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        reactions: { '🎉': ['u-admin', 'u-dev'] } as Record<string, string[]>,
        createdAt: '09:15',
      },
    ],
    'c-tech': [
      {
        id: 'm-t1',
        conversationId: 'c-tech',
        senderId: 'u-techlead',
        senderName: 'Trần Trọng Kỹ Thuật',
        senderAvatarUrl: null,
        content: 'Mọi người review giúp mình PR chuyển đổi sang Expo SDK 58 và NativeWind nhé.',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        createdAt: '10:00',
      },
      {
        id: 'm-t2',
        conversationId: 'c-tech',
        senderId: 'u-dev',
        senderName: 'Lê Hoàng Lập Trình',
        senderAvatarUrl: null,
        content: 'Bản ghi âm tổng hợp cuộc họp kỹ thuật sáng nay (15 giây):',
        type: MessageType.VOICE,
        voice: {
          url: 'https://example.com/voice-sample.m4a',
          duration: 15,
        },
        isEdited: false,
        isDeleted: false,
        createdAt: '10:05',
      },
    ],
    'dm-lead': [
      {
        id: 'm-dm-1',
        conversationId: 'dm-lead',
        senderId: 'u-techlead',
        senderName: 'Trần Trọng Kỹ Thuật (Tech Lead)',
        senderAvatarUrl: null,
        content: 'Chào bạn! Bản build di động trên iPhone chạy mượt không? Có cần hỗ trợ thêm tính năng gì không?',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        reactions: { '👍': ['u-admin'] } as Record<string, string[]>,
        createdAt: '09:20',
      },
    ],
    'dm-dev': [
      {
        id: 'm-dev-1',
        conversationId: 'dm-dev',
        senderId: 'u-dev',
        senderName: 'Lê Hoàng Lập Trình (Dev)',
        senderAvatarUrl: null,
        content: 'Chào anh, em vừa push bản fix CSS interop và Metro Bundler. Anh thử gửi tin nhắn hay gọi thử xem sao nhé!',
        type: MessageType.TEXT,
        isEdited: false,
        isDeleted: false,
        createdAt: '09:30',
      },
    ],
  },

  token: null,
  aiSummary: null,
  isGeneratingSummary: false,

  initMobileAuth: async (email = 'admin@company.com', password = 'Company@123') => {
    try {
      const res = await mobileApiRequest<{ accessToken: string; user: UserProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res && res.accessToken) {
        set({ token: res.accessToken, currentUser: res.user });
        await get().fetchRemoteConversations();
      }
    } catch (err) {
      console.log('Mobile login fallback to mock mode:', err);
    }
  },

  fetchRemoteConversations: async () => {
    const { token, conversations } = get();
    if (!token) return;
    try {
      const list = await mobileApiRequest<ConversationSummary[]>('/channels/my-conversations', {}, token);
      if (Array.isArray(list) && list.length > 0) {
        const existingIds = new Set(list.map((c) => c.id));
        const combined = [...list, ...conversations.filter((c) => !existingIds.has(c.id))];
        set({ conversations: combined });
      }
    } catch (err) {
      console.log('Mobile fetch remote conversations error:', err);
    }
  },

  fetchRemoteMessages: async (conversationId: string) => {
    const { token, messagesMap } = get();
    if (!token || !conversationId) return;
    try {
      const msgs = await mobileApiRequest<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`, {}, token);
      if (Array.isArray(msgs) && msgs.length > 0) {
        set({
          messagesMap: {
            ...messagesMap,
            [conversationId]: msgs,
          },
        });
      }
    } catch (err) {
      console.log('Mobile fetch remote messages error:', err);
    }
  },

  setCurrentUser: (user) => set({ currentUser: user }),

  sendMessage: ({ conversationId, content, type = MessageType.TEXT, poll, attachments, voice }) => {
    const { currentUser, messagesMap, conversations, token } = get();
    const currentList = messagesMap[conversationId] || [];

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderAvatarUrl: null,
      content,
      type,
      poll,
      attachments,
      voice,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    set({
      messagesMap: {
        ...messagesMap,
        [conversationId]: [...currentList, newMsg],
      },
    });

    // Persist to PostgreSQL if authenticated
    if (token) {
      mobileApiRequest<ChatMessage>(
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
                [conversationId]: list.map((m) => (m.id === newMsg.id ? saved : m)),
              },
            });
          }
        })
        .catch((err) => {
          console.log('Mobile persist message to DB error:', err);
        });
    }

    // Auto-reply simulation for responsive testing feel
    if (conversationId.startsWith('dm-')) {
      setTimeout(() => {
        const targetConv = conversations.find((c) => c.id === conversationId);
        const convName = targetConv?.name || 'Đồng nghiệp';
        const replyName = convName.split(' (')[0];
        const replies = [
          'Tuyệt vời! Tôi đã nhận được tin nhắn trên điện thoại 👍',
          'Đồng ý nhé, lát tôi sẽ kiểm tra lại ngay!',
          'Okie bạn ơi, tính năng này chạy rất nhanh!',
          'Cảm ơn bạn đã cập nhật thông tin.',
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        const autoMsg: ChatMessage = {
          id: `msg-${Date.now()}-auto`,
          conversationId,
          senderId: 'u-reply',
          senderName: replyName,
          senderAvatarUrl: null,
          content: randomReply,
          type: MessageType.TEXT,
          isEdited: false,
          isDeleted: false,
          reactions: { '❤️': [currentUser.id] },
          createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        const currentNow = get().messagesMap[conversationId] || [];
        set({
          messagesMap: {
            ...get().messagesMap,
            [conversationId]: [...currentNow, autoMsg],
          },
        });
      }, 1200);
    }
  },

  toggleReaction: (conversationId, messageId, emoji) => {
    const { currentUser, messagesMap } = get();
    const currentList = messagesMap[conversationId] || [];

    const updated = currentList.map((m) => {
      if (m.id !== messageId) return m;

      const reactions: Record<string, string[]> = { ...(m.reactions || {}) };
      const users = reactions[emoji] || [];
      const hasReacted = users.includes(currentUser.id);

      if (hasReacted) {
        reactions[emoji] = users.filter((id) => id !== currentUser.id);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji] = [...users, currentUser.id];
      }

      return { ...m, reactions };
    });

    set({
      messagesMap: {
        ...messagesMap,
        [conversationId]: updated,
      },
    });
  },

  votePoll: (conversationId, messageId, optionId) => {
    const { currentUser, messagesMap } = get();
    const currentList = messagesMap[conversationId] || [];

    const updated = currentList.map((m) => {
      if (m.id !== messageId || !m.poll) return m;

      const poll = { ...m.poll };
      let newTotal = 0;

      poll.options = poll.options.map((opt) => {
        const voterIds = [...opt.voterIds];
        const alreadyVoted = voterIds.includes(currentUser.id);

        if (opt.id === optionId) {
          if (alreadyVoted) {
            const idx = voterIds.indexOf(currentUser.id);
            voterIds.splice(idx, 1);
          } else {
            voterIds.push(currentUser.id);
          }
        } else if (!poll.isMultiple && alreadyVoted) {
          const idx = voterIds.indexOf(currentUser.id);
          voterIds.splice(idx, 1);
        }

        newTotal += voterIds.length;
        return { ...opt, voterIds };
      });

      poll.totalVotes = newTotal;
      return { ...m, poll };
    });

    set({
      messagesMap: {
        ...messagesMap,
        [conversationId]: updated,
      },
    });
  },

  addChannel: ({ name, scope, description }) => {
    const id = `c-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const newChan: ConversationSummary = {
      id,
      type: ConversationType.CHANNEL,
      name,
      scope,
      description: description || `Kênh ${name}`,
      unreadCount: 0,
      members: [],
    };

    set({
      conversations: [newChan, ...get().conversations],
      messagesMap: {
        ...get().messagesMap,
        [id]: [
          {
            id: `msg-${Date.now()}`,
            conversationId: id,
            senderId: get().currentUser.id,
            senderName: get().currentUser.fullName,
            senderAvatarUrl: null,
            content: `Kênh #${name} vừa được khởi tạo thành công! 🎉`,
            type: MessageType.TEXT,
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      },
    });

    // Persist to PostgreSQL if authenticated
    const { token } = get();
    if (token) {
      mobileApiRequest<ConversationSummary>(
        '/channels',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            scope,
            description,
          }),
        },
        token,
      )
        .then((saved) => {
          if (saved && saved.id) {
            set((state) => ({
              conversations: state.conversations.map((c) => (c.id === id ? saved : c)),
              messagesMap: {
                ...state.messagesMap,
                [saved.id]: state.messagesMap[id] || [],
              },
            }));
          }
        })
        .catch((err) => {
          console.log('Mobile persist channel to DB error:', err);
        });
    }

    return id;
  },

  addDirectMessage: ({ id: colleagueId, fullName, department }) => {
    const id = `dm-${colleagueId}`;
    const existing = get().conversations.find((c) => c.id === id);
    if (existing) return id;

    const newDm: ConversationSummary = {
      id,
      type: ConversationType.DIRECT,
      name: `${fullName} (${department || 'Nội bộ'})`,
      unreadCount: 0,
      members: [],
    };

    set({
      conversations: [...get().conversations, newDm],
      messagesMap: {
        ...get().messagesMap,
        [id]: [
          {
            id: `msg-${Date.now()}`,
            conversationId: id,
            senderId: colleagueId,
            senderName: fullName,
            senderAvatarUrl: null,
            content: `Xin chào! Tôi là ${fullName}. Rất vui được trao đổi công việc cùng bạn.`,
            type: MessageType.TEXT,
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      },
    });

    // Persist direct conversation to PostgreSQL if authenticated
    const { token } = get();
    if (token) {
      mobileApiRequest<ConversationSummary>(
        `/channels/direct/${colleagueId}`,
        { method: 'POST' },
        token,
      )
        .then((saved) => {
          if (saved && saved.id) {
            set((state) => ({
              conversations: state.conversations.map((c) => (c.id === id ? saved : c)),
              messagesMap: {
                ...state.messagesMap,
                [saved.id]: state.messagesMap[id] || [],
              },
            }));
          }
        })
        .catch((err) => {
          console.log('Mobile persist direct conversation error:', err);
        });
    }

    return id;
  },

  generateAiSummary: async (conversationName = 'Kênh Trao Đổi') => {
    set({ isGeneratingSummary: true });
    await new Promise((resolve) => setTimeout(() => resolve(undefined), 1000));

    set({
      isGeneratingSummary: false,
      aiSummary: {
        topic: `Tóm tắt nội dung thảo luận: ${conversationName}`,
        keyPoints: [
          'Đã triển khai và tối ưu hóa ứng dụng trên nền tảng Expo SDK 58.',
          'Các tính năng bình chọn, gửi tin nhắn, gọi thoại và thả emoji hoạt động ổn định.',
          'Hệ thống tự động đồng bộ giữa thiết bị iPhone và máy chủ backend.',
        ],
        decisions: [
          'Thống nhất kế hoạch triển khai phiên bản thử nghiệm rộng rãi.',
          'Đưa tính năng tóm tắt AI và gọi thoại vào luồng làm việc hàng ngày.',
        ],
        actionItems: [
          { task: 'Hoàn tất nghiệm thu trên thiết bị iOS vật lý', status: 'done' },
          { task: 'Mở rộng kênh phòng ban cho toàn bộ chi nhánh', status: 'in_progress' },
        ],
        metrics: {
          messageCount: 8,
          participantCount: 3,
          timeRange: 'Hôm nay',
        },
        generatedAt: new Date().toLocaleTimeString('vi-VN'),
      },
    });
  },
}));
