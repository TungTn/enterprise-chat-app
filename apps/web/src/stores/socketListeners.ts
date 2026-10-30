import {
  ChatMessage,
  SOCKET_EVENTS,
  PresenceStatus,
  MessageDeliveryStatus,
} from '@enterprise-chat/shared-types';
import {
  playMessageReceivedSound,
  playCallRingtone,
  stopCallRingtone,
  playCallEndSound,
} from '@/lib/soundService';
import { webrtcService } from '@/lib/webrtcService';
import { ChatState } from './types';

export function setupStoreSocketListeners(
  socket: any,
  get: () => ChatState,
  set: (fn: (state: ChatState) => any) => void
) {
  if (!socket) return;
  socket.off(SOCKET_EVENTS.NEW_MESSAGE);
  socket.off(SOCKET_EVENTS.DELIVERY_STATUS_UPDATED);
  socket.off(SOCKET_EVENTS.READ_RECEIPT);
  socket.off('connect');

  socket.on(SOCKET_EVENTS.NEW_MESSAGE, (incoming: ChatMessage) => {
    if (!incoming || !incoming.conversationId) return;
    const { messagesMap, settings, currentUser, activeConversationId, isBubbleOpen } = get();
    const list = messagesMap[incoming.conversationId] || [];

    const isFromSelf = Boolean(
      (currentUser?.id && incoming.senderId && currentUser.id === incoming.senderId) ||
      (currentUser?.email && incoming.senderId && currentUser.email.toLowerCase() === incoming.senderId.toLowerCase())
    );

    const isEmbedded = typeof window !== 'undefined' && window.parent && window.parent !== window;
    const isVisible = isEmbedded ? isBubbleOpen : (typeof document === 'undefined' || !document.hidden);
    const isViewing =
      !isFromSelf &&
      isVisible &&
      Boolean(activeConversationId) &&
      activeConversationId === incoming.conversationId;

    const existingIndex = list.findIndex(
      (m) => m.id === incoming.id || (incoming.clientMessageId && m.clientMessageId === incoming.clientMessageId)
    );
    const isAlreadyReceived = existingIndex >= 0;

    let updatedList: ChatMessage[];
    if (isAlreadyReceived) {
      updatedList = list.map((m, idx) => (idx === existingIndex ? incoming : m));
    } else {
      updatedList = [...list, incoming];
    }

    set((state) => {
      // Also update conversations list with latest message and bump to top
      const updatedConvs = state.conversations.map((c) => {
        if (c.id === incoming.conversationId) {
          return {
            ...c,
            lastMessage: {
              id: incoming.id,
              content: incoming.content,
              senderName: incoming.senderName,
              senderAvatarUrl: incoming.senderAvatarUrl,
              createdAt: incoming.createdAt,
            },
            unreadCount:
              isFromSelf || isViewing
                ? 0
                : isAlreadyReceived
                ? (c.unreadCount || 0)
                : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      });

      return {
        messagesMap: {
          ...state.messagesMap,
          [incoming.conversationId]: updatedList,
        },
        conversations: updatedConvs,
      };
    });

    if (!get().conversations.some((c) => c.id === incoming.conversationId)) {
      get().fetchConversations();
    }

    if (settings.notifications.playSound && !isFromSelf) {
      playMessageReceivedSound();
    }

    // Auto ACK if incoming from another user
    if (!isFromSelf) {
      socket.emit(SOCKET_EVENTS.MESSAGE_ACK, {
        messageId: incoming.id,
        conversationId: incoming.conversationId,
        clientMessageId: incoming.clientMessageId,
        status: isViewing ? MessageDeliveryStatus.READ : MessageDeliveryStatus.DELIVERED,
      });
      if (isViewing) {
        get().markConversationAsRead(incoming.conversationId);
      }

      // Notify parent host (BPM Portal) if embedded in iframe
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        const totalUnread = get().conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        window.parent.postMessage(
          {
            type: 'MIC_CHAT_ALERT',
            data: {
              senderName: incoming.senderName || 'Đồng nghiệp',
              content: incoming.content || '',
              conversationId: incoming.conversationId,
              unreadCount: totalUnread,
            },
          },
          '*'
        );
        window.parent.postMessage(
          {
            type: 'MIC_CHAT_UNREAD_COUNT',
            unreadCount: totalUnread,
          },
          '*'
        );
      }
    }
  });

  socket.on(
    SOCKET_EVENTS.DELIVERY_STATUS_UPDATED,
    (data: {
      conversationId: string;
      messageId: string;
      clientMessageId?: string;
      deliveryStatus: MessageDeliveryStatus;
      senderId: string;
      ackUserId: string;
    }) => {
      if (!data || !data.conversationId || !data.messageId) return;
      const { messagesMap } = get();
      const list = messagesMap[data.conversationId] || [];
      const updatedList = list.map((m) =>
        m.id === data.messageId ? { ...m, deliveryStatus: data.deliveryStatus } : m
      );
      set((state) => ({
        messagesMap: {
          ...state.messagesMap,
          [data.conversationId]: updatedList,
        },
      }));
    }
  );

  socket.on(
    SOCKET_EVENTS.READ_RECEIPT,
    (data: { conversationId: string; userId: string; messageId?: string }) => {
      if (!data || !data.conversationId) return;
      const { currentUser } = get();

      // If this read receipt is for current user (read on Web or another tab/client), clear unread badge
      const isForMe = Boolean(
        (currentUser?.id && data.userId === currentUser.id) ||
        (currentUser?.email && data.userId && currentUser.email.toLowerCase() === data.userId.toLowerCase()) ||
        (currentUser?.email && data.userId && currentUser.email.split('@')[0].toLowerCase() === data.userId.toLowerCase())
      );

      if (isForMe) {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === data.conversationId ? { ...c, unreadCount: 0 } : c
          ),
        }));
      }
    }
  );

  socket.off(SOCKET_EVENTS.PRESENCE_CHANGE);
  socket.on(
    SOCKET_EVENTS.PRESENCE_CHANGE,
    (data: { userId: string; status: PresenceStatus }) => {
      if (!data || !data.userId) return;
      set((state) => ({
        colleagues: state.colleagues.map((u) =>
          u.id === data.userId ? { ...u, status: data.status } : u
        ),
        conversations: state.conversations.map((c) => {
          const hasUser = c.members?.some((m) => m.id === data.userId);
          if (!hasUser) return c;
          return {
            ...c,
            members: c.members.map((m) =>
              m.id === data.userId ? { ...m, status: data.status } : m
            ),
          };
        }),
      }));
    }
  );

  socket.off('SYNC_SESSION_CHANGED');
  socket.on('SYNC_SESSION_CHANGED', async (syncedData: any) => {
    if (!syncedData) return;
    const { webHostUser, currentUser } = get();
    const isEmbedded =
      typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).get('embedded') === 'true' ||
        window.self !== window.top ||
        Boolean(webHostUser));

    // If running inside Web Embed, strictly lock to host user!
    if (isEmbedded) {
      const activeHost =
        webHostUser ||
        (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('bpm_user')
          : null) ||
        (currentUser?.email ? currentUser.email.split('@')[0] : null);

      if (activeHost) {
        const hostEmail = `${activeHost}@mic.vn`.toLowerCase();
        const targetEmail = (
          syncedData.email || `${syncedData.username}@mic.vn`
        ).toLowerCase();
        if (targetEmail !== hostEmail) {
          console.log(
            '[SyncSession] Web embed strictly locked to host user:',
            activeHost,
            'ignoring external sync:',
            targetEmail
          );
          return;
        }
      } else {
        // Embedded mode must not blindly switch to external app accounts
        console.log('[SyncSession] Web embed preserving local context, ignoring external sync');
        return;
      }
    }

    const targetEmail = (
      syncedData.email ||
      (syncedData.username ? `${syncedData.username}@mic.vn` : '')
    ).toLowerCase();
    if (!targetEmail) return;

    // Only auto-login if the client is not yet authenticated, or if an explicit switch was commanded on this machine
    if (!currentUser) {
      console.log('[SyncSession] Logging in unauthenticated client from local session:', targetEmail);
      await get().ssoBpmLogin(syncedData);
    } else if (syncedData.forceSwitch && currentUser.email?.toLowerCase() !== targetEmail) {
      console.log('[SyncSession] Explicit account switch requested on this machine:', targetEmail);
      await get().ssoBpmLogin(syncedData);
    }
  });

  socket.on('connect', () => {
    const { activeConversationId, syncDeltaMessages, processOutboxQueue } = get();
    if (activeConversationId) {
      syncDeltaMessages(activeConversationId);
    }
    processOutboxQueue();
  });

  // --- WebRTC 1-1 Call Signalling Listeners ---
  socket.off('call:incoming');
  socket.on('call:incoming', (data: any) => {
    if (!data) return;
    get().setIncomingCall(data);
    playCallRingtone();
  });

  socket.off('call:accepted');
  socket.on('call:accepted', async (data: any) => {
    stopCallRingtone();
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, status: 'connected' } : null,
    }));
    const iceServers = await get().fetchIceServers();
    webrtcService.initCall({
      targetUserId: data.receiverId,
      callId: data.callId,
      isCaller: true,
      iceServers,
      callType: get().activeCall?.type || 'audio',
      onEnd: () => {
        get().endCall();
      },
      onError: (err: any) => {
        console.warn('[WebRTC] Notice on caller:', err);
        const errMsg = typeof err === 'string' ? err : err?.message || 'Không thể truy cập Microphone/Camera';
        get().setCallNotice(errMsg);
      },
    });
  });

  socket.off('call:signal');
  socket.on('call:signal', (data: any) => {
    if (data?.signal) {
      webrtcService.handleSignal(data.signal);
    }
  });

  socket.off('call:rejected');
  socket.on('call:rejected', () => {
    stopCallRingtone();
    playCallEndSound();
    webrtcService.endCall();
    get().setCallNotice('Đối phương đã từ chối cuộc gọi');
    set(() => ({
      activeCall: null,
      incomingCall: null,
      isCallModalOpen: false,
    }));
  });

  socket.off('call:ended');
  socket.on('call:ended', (data: any) => {
    stopCallRingtone();
    playCallEndSound();
    webrtcService.endCall();
    const status = data?.callStatus || 'completed';
    const duration = data?.durationSeconds || 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const formattedDuration = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const notice =
      status === 'missed'
        ? 'Cuộc gọi nhỡ'
        : `Cuộc gọi đã kết thúc (${formattedDuration})`;
    get().setCallNotice(notice);
    set(() => ({
      activeCall: null,
      incomingCall: null,
      isCallModalOpen: false,
    }));
  });
}
