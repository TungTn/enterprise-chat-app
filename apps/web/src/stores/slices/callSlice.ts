import { StateCreator } from 'zustand';
import {
  CallType,
  IceServerConfig,
} from '@enterprise-chat/shared-types';
import { apiRequest } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  playCallRingtone,
  stopCallRingtone,
  playCallEndSound,
} from '@/lib/soundService';
import { webrtcService } from '@/lib/webrtcService';
import { ChatState, CallSlice, IncomingCallState } from '../types';

export const createCallSlice: StateCreator<ChatState, [], [], CallSlice> = (set, get) => ({
  activeCall: null,
  incomingCall: null,
  isCallModalOpen: false,
  callNotice: null,

  setCallNotice: (notice: string | null) => {
    set({ callNotice: notice });
    if (notice) {
      setTimeout(() => {
        if (get().callNotice === notice) {
          set({ callNotice: null });
        }
      }, 4000);
    }
  },

  startCall: (type: CallType) => {
    const { conversations, activeConversationId, currentUser } = get();
    const activeConv = conversations.find((c) => c.id === activeConversationId);
    const otherMember = activeConv?.members?.find((m) => m.id !== currentUser?.id);
    const callId = `call-${Date.now()}`;

    playCallRingtone();

    // Signal call:initiate to receiver via WebSocket
    if (otherMember?.id) {
      getSocket()?.emit('call:initiate', {
        conversationId: activeConversationId || 'unknown',
        receiverId: otherMember.id,
        callType: type,
        callerName: currentUser?.fullName,
        callerAvatar: currentUser?.avatarUrl || undefined,
      });
    }

    set({
      activeCall: {
        id: callId,
        conversationId: activeConversationId || 'unknown',
        conversationName: activeConv?.name || otherMember?.fullName || 'Cuộc gọi thoại',
        conversationAvatar: otherMember?.avatarUrl || undefined,
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

  endCall: (durationSeconds?: number) => {
    const { activeCall, conversations, currentUser } = get();
    stopCallRingtone();
    playCallEndSound();
    webrtcService.endCall();

    if (activeCall) {
      const conv = conversations.find((c) => c.id === activeCall.conversationId);
      const otherMember = conv?.members?.find((m) => m.id !== currentUser?.id);
      const duration = durationSeconds ?? activeCall.durationSeconds ?? 0;
      const computedStatus = activeCall.status === 'calling' ? 'missed' : 'completed';

      if (otherMember?.id) {
        getSocket()?.emit('call:end', {
          targetUserId: otherMember.id,
          callId: activeCall.id,
          conversationId: activeCall.conversationId,
          durationSeconds: duration,
          callStatus: computedStatus,
          callType: activeCall.type,
        });
      }

      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const formattedDuration = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const notice =
        computedStatus === 'missed'
          ? 'Đã hủy cuộc gọi'
          : `Cuộc gọi đã kết thúc (${formattedDuration})`;
      get().setCallNotice(notice);
    }

    set({
      activeCall: null,
      incomingCall: null,
      isCallModalOpen: false,
    });
  },

  acceptIncomingCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    stopCallRingtone();
    getSocket()?.emit('call:accept', {
      callId: incomingCall.callId,
      callerId: incomingCall.callerId,
      conversationId: incomingCall.conversationId,
    });

    set({
      activeCall: {
        id: incomingCall.callId,
        conversationId: incomingCall.conversationId,
        conversationName: incomingCall.callerName,
        conversationAvatar: incomingCall.callerAvatar || undefined,
        isGroup: false,
        type: incomingCall.callType,
        status: 'connected',
        durationSeconds: 0,
        isMuted: false,
        isVideoOff: incomingCall.callType === 'audio',
        isScreenSharing: false,
        isMinimized: false,
      },
      incomingCall: null,
      isCallModalOpen: true,
    });

    const iceServers = await get().fetchIceServers();
    webrtcService.initCall({
      targetUserId: incomingCall.callerId,
      callId: incomingCall.callId,
      isCaller: false,
      iceServers,
      callType: incomingCall.callType,
      onEnd: () => {
        get().endCall();
      },
      onError: (err: any) => {
        console.warn('[WebRTC] Notice on receiver:', err);
        const errMsg = typeof err === 'string' ? err : err?.message || 'Không thể truy cập Microphone/Camera';
        get().setCallNotice(errMsg);
      },
    });
  },

  rejectIncomingCall: () => {
    const { incomingCall } = get();
    if (incomingCall) {
      stopCallRingtone();
      webrtcService.endCall();
      getSocket()?.emit('call:reject', {
        callerId: incomingCall.callerId,
        callId: incomingCall.callId,
        conversationId: incomingCall.conversationId,
        reason: 'declined',
      });
      get().setCallNotice('Bạn đã từ chối cuộc gọi');
      set({ incomingCall: null });
    }
  },

  setIncomingCall: (call) => set({ incomingCall: call }),

  toggleMute: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    const newMuted = !activeCall.isMuted;
    webrtcService.setMuted(newMuted);
    set({ activeCall: { ...activeCall, isMuted: newMuted } });
  },

  toggleVideo: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    const newVideoOff = !activeCall.isVideoOff;
    webrtcService.setVideoDisabled(newVideoOff);
    set({ activeCall: { ...activeCall, isVideoOff: newVideoOff } });
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
