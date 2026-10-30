import { StateCreator } from 'zustand';
import {
  ChatMessage,
  ConversationSummary,
  ChatAiSummary,
  MessageType,
  ChannelScope,
  GroupPermissions,
  ChannelMemberRole,
  ConversationType,
  MessageDeliveryStatus,
  SOCKET_EVENTS,
  UserRole,
} from '@enterprise-chat/shared-types';
import { playMessageSentSound } from '@/lib/soundService';
import { apiRequest } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ChatState, ChatSlice, OutboxMessage } from '../types';

const CACHED_CONVERSATIONS_KEY = 'enterprise_cached_conversations';
const CACHED_MESSAGES_KEY = 'enterprise_cached_messages';
const CACHED_OUTBOX_KEY = 'enterprise_chat_outbox';

const loadCachedConversations = (): ConversationSummary[] => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(CACHED_CONVERSATIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore cache read errors
    }
  }
  return [];
};

const saveCachedConversations = (conversations: ConversationSummary[]) => {
  if (typeof window !== 'undefined') {
    try {
      // Save top 50 recent conversations
      localStorage.setItem(CACHED_CONVERSATIONS_KEY, JSON.stringify(conversations.slice(0, 50)));
    } catch {
      // Ignore storage quota errors
    }
  }
};

const loadCachedMessages = (): Record<string, ChatMessage[]> => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(CACHED_MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Ignore cache read errors
    }
  }
  return {};
};

const saveCachedMessages = (messagesMap: Record<string, ChatMessage[]>) => {
  if (typeof window !== 'undefined') {
    try {
      // Keep only up to 25 latest messages per conversation to stay well within localStorage limits
      const pruned: Record<string, ChatMessage[]> = {};
      for (const [convId, list] of Object.entries(messagesMap)) {
        if (Array.isArray(list)) {
          pruned[convId] = list.slice(-25);
        }
      }
      localStorage.setItem(CACHED_MESSAGES_KEY, JSON.stringify(pruned));
    } catch {
      // Ignore storage quota errors
    }
  }
};

const loadCachedOutbox = (): OutboxMessage[] => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(CACHED_OUTBOX_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
  }
  return [];
};

const saveCachedOutbox = (queue: OutboxMessage[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHED_OUTBOX_KEY, JSON.stringify(queue.slice(0, 50)));
    } catch {
      // Ignore
    }
  }
};

export const createChatSlice: StateCreator<ChatState, [], [], ChatSlice> = (set, get) => ({
  conversations: loadCachedConversations(),
  activeConversationId: null,
  messagesMap: loadCachedMessages(),
  replyingMessage: null,
  editingMessage: null,
  messageToForward: null,
  searchQuery: '',
  isGeneratingSummary: false,
  currentAiSummary: null,
  readReceiptsMessage: null,

  // Pagination & Outbox State
  outboxQueue: loadCachedOutbox(),
  hasMoreMap: {},
  cursorsMap: {},
  isLoadingOlder: false,

  setConversations: (conversations) => {
    set({ conversations });
    saveCachedConversations(conversations);
  },

  setActiveConversationId: (id) => {
    set((state) => ({
      activeConversationId: id,
      conversations: state.conversations.map((c) =>
        Boolean(id) && c.id === id ? { ...c, unreadCount: 0 } : c
      ),
    }));
    if (id) {
      get().fetchMessages(id);
      get().markConversationAsRead(id);
    }
  },

  setMessages: (conversationId, messages) => {
    set((state) => {
      const nextMap = { ...state.messagesMap, [conversationId]: messages };
      saveCachedMessages(nextMap);
      return { messagesMap: nextMap };
    });
  },

  sendMessage: ({
    conversationId,
    content,
    type = MessageType.TEXT,
    replyTo,
    poll,
    voice,
    attachments,
    forwardedFrom,
  }) => {
    const { currentUser, messagesMap, settings, token } = get();
    if (!currentUser) return;

    const clientMessageId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tempId = `temp-${Date.now()}`;
    const newMessage: ChatMessage = {
      id: tempId,
      conversationId,
      clientMessageId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderAvatarUrl: currentUser.avatarUrl,
      content,
      type,
      attachments,
      forwardedFrom,
      deliveryStatus: MessageDeliveryStatus.SENT,
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
    const nextMap = {
      ...messagesMap,
      [conversationId]: [...currentList, newMessage],
    };
    set({
      messagesMap: nextMap,
      replyingMessage: null,
    });
    saveCachedMessages(nextMap);

    if (settings.notifications.playSound) {
      playMessageSentSound();
    }

    // Persist to PostgreSQL if authenticated
    if (token) {
      const attachmentIds = attachments
        ? attachments
            .map((a) => a.id)
            .filter((id) => !id.startsWith('file-') && !id.startsWith('temp-'))
        : undefined;

      const outboxItem: OutboxMessage = {
        tempId,
        conversationId,
        payload: {
          conversationId,
          content,
          type,
          clientMessageId,
          attachmentIds: attachmentIds && attachmentIds.length > 0 ? attachmentIds : undefined,
          attachments,
          parentId: replyTo?.id,
        },
        createdAt: Date.now(),
      };

      apiRequest<ChatMessage>(
        '/chat/messages',
        {
          method: 'POST',
          body: JSON.stringify(outboxItem.payload),
        },
        token
      )
        .then((saved) => {
          if (saved && saved.id) {
            const list = get().messagesMap[conversationId] || [];
            const updatedMap = {
              ...get().messagesMap,
              [conversationId]: list.map((m) =>
                m.id === tempId || (saved.clientMessageId && m.clientMessageId === saved.clientMessageId)
                  ? saved
                  : m
              ),
            };
            set({ messagesMap: updatedMap });
            saveCachedMessages(updatedMap);

            // Remove from outbox if it was queued
            const nextQueue = get().outboxQueue.filter((q) => q.tempId !== tempId);
            set({ outboxQueue: nextQueue });
            saveCachedOutbox(nextQueue);
          }
        })
        .catch((err) => {
          console.warn('Persist message to DB error, queuing to offline outbox:', err);
          const nextQueue = [...get().outboxQueue, outboxItem];
          set({ outboxQueue: nextQueue });
          saveCachedOutbox(nextQueue);
        });
    }
  },

  processOutboxQueue: async () => {
    const { outboxQueue, token } = get();
    if (!token || outboxQueue.length === 0) return;
    const remaining: OutboxMessage[] = [];

    for (const item of outboxQueue) {
      try {
        const saved = await apiRequest<ChatMessage>(
          '/chat/messages',
          {
            method: 'POST',
            body: JSON.stringify(item.payload),
          },
          token
        );
        if (saved && saved.id) {
          const list = get().messagesMap[item.conversationId] || [];
          const updated = list.map((m) =>
            m.id === item.tempId || (saved.clientMessageId && m.clientMessageId === saved.clientMessageId)
              ? saved
              : m
          );
          const nextMap = { ...get().messagesMap, [item.conversationId]: updated };
          set({ messagesMap: nextMap });
          saveCachedMessages(nextMap);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    set({ outboxQueue: remaining });
    saveCachedOutbox(remaining);
  },

  editMessage: (messageId, content) => {
    const { activeConversationId, messagesMap } = get();
    if (!activeConversationId) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) =>
      m.id === messageId ? { ...m, content, isEdited: true, updatedAt: new Date().toISOString() } : m
    );

    const nextMap = { ...messagesMap, [activeConversationId]: updated };
    set({
      messagesMap: nextMap,
      editingMessage: null,
    });
    saveCachedMessages(nextMap);
  },

  deleteMessage: (messageId) => {
    const { activeConversationId, messagesMap } = get();
    if (!activeConversationId) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) =>
      m.id === messageId ? { ...m, isDeleted: true, content: 'Tin nhắn này đã bị xóa' } : m
    );

    const nextMap = { ...messagesMap, [activeConversationId]: updated };
    set({ messagesMap: nextMap });
    saveCachedMessages(nextMap);
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

    const nextMap = { ...messagesMap, [activeConversationId]: updated };
    set({ messagesMap: nextMap });
    saveCachedMessages(nextMap);
  },

  togglePinMessage: (messageId) => {
    const { activeConversationId, messagesMap } = get();
    if (!activeConversationId) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) =>
      m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
    );

    const nextMap = { ...messagesMap, [activeConversationId]: updated };
    set({ messagesMap: nextMap });
    saveCachedMessages(nextMap);
  },

  toggleStarMessage: (messageId) => {
    const { activeConversationId, messagesMap } = get();
    if (!activeConversationId) return;

    const currentList = messagesMap[activeConversationId] || [];
    const updated = currentList.map((m) =>
      m.id === messageId ? { ...m, isStarred: !m.isStarred } : m
    );

    const nextMap = { ...messagesMap, [activeConversationId]: updated };
    set({ messagesMap: nextMap });
    saveCachedMessages(nextMap);
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

    const nextMap = { ...messagesMap, [activeConversationId]: updated };
    set({ messagesMap: nextMap });
    saveCachedMessages(nextMap);
  },

  setReplyingMessage: (msg) => set({ replyingMessage: msg }),
  setEditingMessage: (msg) => set({ editingMessage: msg }),
  setMessageToForward: (msg) => set({ messageToForward: msg }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setReadReceiptsMessage: (msg) => set({ readReceiptsMessage: msg }),

  togglePinConversation: (convId) => {
    const { conversations } = get();
    const updated = conversations.map((c) =>
      c.id === convId ? { ...c, isPinned: !c.isPinned } : c
    );
    set({ conversations: updated });
    saveCachedConversations(updated);
  },

  toggleMuteConversation: (convId) => {
    const { conversations } = get();
    const updated = conversations.map((c) =>
      c.id === convId ? { ...c, isMuted: !c.isMuted } : c
    );
    set({ conversations: updated });
    saveCachedConversations(updated);
  },

  setMuteDuration: (convId, duration) => {
    const { conversations } = get();
    const updated = conversations.map((c) =>
      c.id === convId ? { ...c, isMuted: duration !== 'unmute' } : c
    );
    set({ conversations: updated });
    saveCachedConversations(updated);
  },

  updateGroupInfo: (convId, data) => {
    const { conversations } = get();
    const updated = conversations.map((c) =>
      c.id === convId
        ? {
            ...c,
            name: data.name || c.name,
            description: data.description !== undefined ? data.description : c.description,
          }
        : c
    );
    set({ conversations: updated });
    saveCachedConversations(updated);
  },

  updateGroupPermissions: (convId, permissions) => {
    const { conversations } = get();
    const updated = conversations.map((c) =>
      c.id === convId ? { ...c, permissions } : c
    );
    set({ conversations: updated });
    saveCachedConversations(updated);
  },

  updateMemberRole: (convId, userId, role) => {
    const { conversations } = get();
    const updated = conversations.map((c) => {
      if (c.id !== convId) return c;
      const members = c.members.map((m) =>
        m.id === userId
          ? {
              ...m,
              role:
                role === ChannelMemberRole.OWNER || role === ChannelMemberRole.ADMIN
                  ? UserRole.DEPARTMENT_MANAGER
                  : UserRole.EMPLOYEE,
            }
          : m
      );
      return { ...c, members };
    });
    set({ conversations: updated });
    saveCachedConversations(updated);
  },

  removeMemberFromGroup: (convId, userId) => {
    const { conversations } = get();
    const updated = conversations.map((c) => {
      if (c.id !== convId) return c;
      return {
        ...c,
        members: c.members.filter((m) => m.id !== userId),
      };
    });
    set({ conversations: updated });
    saveCachedConversations(updated);
  },

  transferGroupOwnership: (convId, newOwnerId) => {
    const { conversations } = get();
    const updated = conversations.map((c) => {
      if (c.id !== convId) return c;
      const members = c.members.map((m) => ({
        ...m,
        role: m.id === newOwnerId ? UserRole.DEPARTMENT_MANAGER : m.role,
      }));
      return { ...c, members };
    });
    set({ conversations: updated });
    saveCachedConversations(updated);
  },

  leaveGroup: (convId) => {
    const { conversations, currentUser, activeConversationId } = get();
    if (!currentUser) return;
    const updated = conversations.filter((c) => c.id !== convId);
    set({
      conversations: updated,
      activeConversationId: activeConversationId === convId ? (updated[0]?.id || null) : activeConversationId,
      isGroupManagementOpen: false,
    });
    saveCachedConversations(updated);
  },

  disbandGroup: (convId) => {
    const { conversations, activeConversationId } = get();
    const updated = conversations.filter((c) => c.id !== convId);
    set({
      conversations: updated,
      activeConversationId: activeConversationId === convId ? (updated[0]?.id || null) : activeConversationId,
      isGroupManagementOpen: false,
    });
    saveCachedConversations(updated);
  },

  generateAiSummary: async () => {
    const { activeConversationId, token } = get();
    if (!activeConversationId) return;

    set({ isGeneratingSummary: true });
    try {
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('enterprise_gemini_api_key') : null;
      const res = await apiRequest<ChatAiSummary>(
        '/ai/summarize',
        {
          method: 'POST',
          body: JSON.stringify({
            conversationId: activeConversationId,
            apiKey: storedKey ? storedKey.trim() : undefined,
          }),
        },
        token || undefined
      );

      set({
        currentAiSummary: res,
        isGeneratingSummary: false,
      });
    } catch (err: any) {
      console.error('Failed to generate AI summary:', err);
      set({ isGeneratingSummary: false });
    }
  },

  fetchConversations: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const list = await apiRequest<ConversationSummary[]>('/channels/my-conversations', {}, token);
      if (Array.isArray(list) && list.length > 0) {
        const { activeConversationId } = get();
        const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < 640;
        const targetId =
          activeConversationId && list.some((c) => c.id === activeConversationId)
            ? activeConversationId
            : isNarrowScreen
            ? null
            : list[0].id;

        const updated = list.map((c) => (targetId && c.id === targetId ? { ...c, unreadCount: 0 } : c));
        set({
          conversations: updated,
          activeConversationId: targetId,
        });
        saveCachedConversations(updated);

        if (targetId) {
          await get().fetchMessages(targetId);
          get().markConversationAsRead(targetId);
        }
      }
    } catch (err) {
      console.warn('Fetch conversations error:', err);
    }
  },

  markConversationAsRead: async (conversationId: string) => {
    const token = get().token;
    if (!token || !conversationId) return;
    set((state) => {
      const updated = state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      );
      saveCachedConversations(updated);
      return { conversations: updated };
    });

    apiRequest(`/chat/conversations/${conversationId}/read`, { method: 'POST' }, token).catch(() => {});
    const socket = getSocket();
    if (socket && socket.connected) {
      const messages = get().messagesMap[conversationId] || [];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.id) {
        socket.emit(SOCKET_EVENTS.MARK_READ, { conversationId, messageId: lastMsg.id });
      }
    }
  },

  fetchMessages: async (conversationId: string) => {
    const token = get().token;
    if (!token || !conversationId) return;
    try {
      const res = await apiRequest<any>(`/chat/conversations/${conversationId}/messages?limit=30`, {}, token);
      const list: ChatMessage[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
        ? res.items
        : [];
      const nextCursor: string | null = res?.nextCursor || null;
      const hasMore = Boolean(nextCursor);

      set((state) => {
        const nextMap = {
          ...state.messagesMap,
          [conversationId]: list,
        };
        saveCachedMessages(nextMap);
        return {
          messagesMap: nextMap,
          cursorsMap: { ...state.cursorsMap, [conversationId]: nextCursor },
          hasMoreMap: { ...state.hasMoreMap, [conversationId]: hasMore },
        };
      });
    } catch (err) {
      console.warn('Fetch messages error:', err);
    }
  },

  fetchOlderMessages: async (conversationId: string) => {
    const { token, cursorsMap, hasMoreMap, messagesMap, isLoadingOlder } = get();
    if (!token || !conversationId || isLoadingOlder) return false;
    if (hasMoreMap[conversationId] === false) return false;

    const cursor = cursorsMap[conversationId];
    if (!cursor) return false;

    set({ isLoadingOlder: true });
    try {
      const res = await apiRequest<any>(
        `/chat/conversations/${conversationId}/messages?cursor=${encodeURIComponent(cursor)}&limit=30`,
        {},
        token
      );
      const olderItems: ChatMessage[] = Array.isArray(res?.items) ? res.items : [];
      const nextCursor: string | null = res?.nextCursor || null;
      const hasMore = Boolean(nextCursor);

      const currentList = messagesMap[conversationId] || [];
      const existingIds = new Set(currentList.map((m) => m.id));
      const toPrepend = olderItems.filter((m) => !existingIds.has(m.id));

      const updatedList = [...toPrepend, ...currentList];
      set((state) => ({
        messagesMap: { ...state.messagesMap, [conversationId]: updatedList },
        cursorsMap: { ...state.cursorsMap, [conversationId]: nextCursor },
        hasMoreMap: { ...state.hasMoreMap, [conversationId]: hasMore },
        isLoadingOlder: false,
      }));
      return toPrepend.length > 0;
    } catch (err) {
      console.warn('Fetch older messages error:', err);
      set({ isLoadingOlder: false });
      return false;
    }
  },

  syncDeltaMessages: async (conversationId: string) => {
    const token = get().token;
    if (!token || !conversationId) return;
    const { messagesMap } = get();
    const currentList = messagesMap[conversationId] || [];
    const maxSeq = currentList.reduce((max, m) => Math.max(max, m.sequenceNumber || 0), 0);

    try {
      const delta = await apiRequest<any>(
        `/chat/conversations/${conversationId}/sync?sinceSeq=${maxSeq}`,
        {},
        token
      );
      const deltaList: ChatMessage[] = Array.isArray(delta)
        ? delta
        : Array.isArray(delta?.items)
        ? delta.items
        : [];
      if (deltaList.length > 0) {
        const existingIds = new Set(currentList.map((m) => m.id));
        const toAppend = deltaList.filter((m) => !existingIds.has(m.id));
        if (toAppend.length > 0) {
          const nextList = [...currentList, ...toAppend];
          const nextMap = {
            ...get().messagesMap,
            [conversationId]: nextList,
          };
          set({ messagesMap: nextMap });
          saveCachedMessages(nextMap);
        }
      }
    } catch (err) {
      console.warn('Sync delta messages error:', err);
    }
  },

  createChannelApi: async (data) => {
    const token = get().token;
    if (!token) return null;
    const { conversations } = get();
    try {
      const newConv = await apiRequest<ConversationSummary>(
        '/channels',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        token || undefined
      );
      if (newConv && newConv.id) {
        const updated = [newConv, ...conversations.filter((c) => c.id !== newConv.id)];
        set({
          conversations: updated,
          activeConversationId: newConv.id,
        });
        saveCachedConversations(updated);
        await get().fetchMessages(newConv.id);
        return newConv.id;
      }
    } catch (err) {
      console.error('Create channel API error:', err);
    }
    return null;
  },

  createDirectApi: async (targetUserId: string) => {
    const { token, conversations, colleagues, currentUser } = get();
    try {
      const conv = await apiRequest<ConversationSummary>(
        `/channels/direct/${targetUserId}`,
        { method: 'POST' },
        token || undefined
      );
      if (conv && conv.id) {
        const normalizedMembers = Array.isArray(conv.members)
          ? conv.members.map((m: any) => m.user || m)
          : [];
        const partner =
          normalizedMembers.find((m: any) => m.id !== currentUser?.id) ||
          colleagues.find((c) => c.id === targetUserId);
        const resolvedName = conv.name || partner?.fullName || 'Trò chuyện 1-1';

        const formattedConv: ConversationSummary = {
          ...conv,
          name: resolvedName,
          members: normalizedMembers.length > 0 ? normalizedMembers : (partner ? [partner] : []),
        };

        const updated = [formattedConv, ...conversations.filter((c) => c.id !== formattedConv.id)];
        set({
          conversations: updated,
          activeConversationId: formattedConv.id,
        });
        saveCachedConversations(updated);
        await get().fetchMessages(formattedConv.id);
        return formattedConv.id;
      }
    } catch (err) {
      console.error('Create direct API error:', err);
      const partner = colleagues.find((c) => c.id === targetUserId);
      if (partner) {
        const localConvId = `dm-${partner.id}`;
        const existingLocal = conversations.find(
          (c) =>
            c.id === localConvId ||
            (c.type === ConversationType.DIRECT && c.members?.some((m) => m.id === partner.id))
        );
        if (existingLocal) {
          set({ activeConversationId: existingLocal.id });
          return existingLocal.id;
        }
        const localConv: ConversationSummary = {
          id: localConvId,
          type: ConversationType.DIRECT,
          name: partner.fullName,
          unreadCount: 0,
          members: currentUser ? [currentUser, partner] : [partner],
          lastMessage: null,
        };
        const updated = [localConv, ...conversations];
        set({
          conversations: updated,
          activeConversationId: localConvId,
        });
        saveCachedConversations(updated);
        return localConvId;
      }
    }
    return null;
  },
});
