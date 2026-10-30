'use client';

import React, { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  Minimize2,
  Maximize2,
  Users,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import GroupVideoRoom from '@/components/chat/GroupVideoRoom';

export default function CallModal() {
  const {
    activeCall,
    isCallModalOpen,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleCallMinimize,
    conversations,
    currentUser,
    token,
  } = useChatStore();

  const { handleBackdropClick } = useModalDismiss({
    isOpen: isCallModalOpen && !activeCall?.isMinimized,
    onClose: toggleCallMinimize,
  });

  const [seconds, setSeconds] = useState(0);

  // Call timer simulation
  useEffect(() => {
    if (!isCallModalOpen || !activeCall) {
      setSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallModalOpen, activeCall]);

  if (!isCallModalOpen || !activeCall) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Minimized PiP Window
  if (activeCall.isMinimized) {
    return (
      <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 w-64 select-none animate-in fade-in duration-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-semibold text-xs text-white truncate max-w-[120px]">
              {activeCall.conversationName}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{formatDuration(seconds)}</span>
        </div>

        <div className="flex items-center justify-between gap-1 mt-3">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl transition-colors ${
              activeCall.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-200'
            }`}
          >
            {activeCall.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleCallMinimize}
            className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white"
            title="Mở rộng cuộc gọi"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={endCall}
            className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white"
            title="Kết thúc"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Multi-party Group Call with LiveKit SFU
  if (activeCall.isGroup) {
    return (
      <div
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[640px] relative animate-in fade-in zoom-in-95 duration-200"
        >
          <GroupVideoRoom
            conversationId={activeCall.conversationId}
            conversationName={activeCall.conversationName}
            token={token}
            onEndCall={endCall}
          />
        </div>
      </div>
    );
  }

  const conv = conversations.find((c) => c.id === activeCall.conversationId);
  const otherMember = !activeCall.isGroup && conv
    ? conv.members?.find((m) => m.id !== currentUser?.id) || conv.members?.[0]
    : null;

  // Full Screen Call Modal
  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[520px] relative animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Header Bar */}
        <div className="p-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">{activeCall.conversationName}</h3>
              {otherMember?.phoneNumber && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                  <Phone className="w-2.5 h-2.5" />
                  {otherMember.phoneNumber}
                </span>
              )}
            </div>
            <span className="text-xs text-emerald-400 font-medium">
              Đang kết nối • {formatDuration(seconds)}
            </span>
          </div>

          <button
            onClick={toggleCallMinimize}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Thu nhỏ cửa sổ (PiP)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Video / Avatar Canvas Area */}
        <div className="flex-1 flex items-center justify-center relative bg-slate-950">
          {activeCall.isVideoOff ? (
            <div className="text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-blue-500/20 mx-auto uppercase">
                {activeCall.conversationName.charAt(0)}
              </div>
              <h4 className="font-bold text-lg text-white">{activeCall.conversationName}</h4>
              {otherMember?.phoneNumber ? (
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-mono">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{otherMember.phoneNumber}</span>
                  <a
                    href={`tel:${otherMember.phoneNumber}`}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Gọi qua sim di động trực tiếp"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Cuộc gọi thoại thời gian thực bảo mật</p>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/80">
              <span className="text-xs text-slate-500">
                Luồng video WebRTC được mã hóa đầu-cuối (End-to-End Encrypted)
              </span>
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="p-6 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              activeCall.isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title={activeCall.isMuted ? 'Bật Mic' : 'Tắt Mic'}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              activeCall.isVideoOff
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title={activeCall.isVideoOff ? 'Bật Camera' : 'Tắt Camera'}
          >
            {activeCall.isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              activeCall.isScreenSharing
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title="Chia sẻ màn hình"
          >
            <Monitor className="w-5 h-5" />
          </button>

          <button
            onClick={endCall}
            className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/30 transition-transform active:scale-95"
            title="Gác máy"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
