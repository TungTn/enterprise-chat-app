import { StateCreator } from 'zustand';
import {
  CallType,
  IceServerConfig,
} from '@enterprise-chat/shared-types';
import { apiRequest } from '@/lib/api';
import {
  playCallRingtone,
  playCallEndSound,
} from '@/lib/soundService';
import { ChatState, CallSlice } from '../types';

export const createCallSlice: StateCreator<ChatState, [], [], CallSlice> = (set, get) => ({
  activeCall: null,
  isCallModalOpen: false,

  startCall: (type: CallType) => {
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

  toggleCallModal: (force) =>
    set((state) => ({ isCallModalOpen: force !== undefined ? force : !state.isCallModalOpen })),

  fetchIceServers: async () => {
    const token = get().token;
    try {
      const servers = await apiRequest<IceServerConfig[]>(
        '/chat/webrtc/ice-servers',
        {},
        token || undefined
      );
      if (Array.isArray(servers) && servers.length > 0) {
        return servers;
      }
    } catch (err) {
      console.warn('Fetch ICE servers error, using default:', err);
    }
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];
  },
});
