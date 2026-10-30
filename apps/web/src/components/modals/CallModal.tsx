'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { webrtcService } from '@/lib/webrtcService';
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
  Volume2,
} from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import GroupVideoRoom from '@/components/chat/GroupVideoRoom';

function useAudioLevel(stream: MediaStream | null, isEnabled: boolean = true) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!isEnabled || !stream || stream.getAudioTracks().length === 0) {
      setLevel(0);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.4;
      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkLevel = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setLevel(Math.min(100, Math.round((avg / 90) * 100)));
        animId = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (e) {
      console.warn('AudioLevel analyser error:', e);
    }

    return () => {
      cancelAnimationFrame(animId);
      try {
        source?.disconnect();
        analyser?.disconnect();
        audioContext?.close().catch(() => {});
      } catch (e) {}
    };
  }, [stream, isEnabled]);

  return level;
}

function playSpeakerTestTone() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('Test tone error:', e);
  }
}

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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isSecureContext, setIsSecureContext] = useState(true);

  const localAudioLevel = useAudioLevel(localStream, !activeCall?.isMuted);
  const remoteAudioLevel = useAudioLevel(remoteStream, true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false);

  // Check secure context for WebRTC MediaDevices
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSecureContext(window.isSecureContext !== false);
    }
  }, []);

  // Subscribe to real WebRTC local and remote media streams
  useEffect(() => {
    const unsubscribe = webrtcService.subscribeStreams(({ local, remote }) => {
      setLocalStream(local);
      setRemoteStream(remote);
    });
    return unsubscribe;
  }, []);

  // Bind local camera preview to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.isVideoOff]);

  // Bind remote peer camera stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall?.isVideoOff]);

  // Bind remote peer audio stream to dedicated mounted <audio> element
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      const playPromise = remoteAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setAudioAutoplayBlocked(false);
          })
          .catch((err) => {
            console.warn('[WebRTC] Remote audio autoplay blocked:', err);
            setAudioAutoplayBlocked(true);
          });
      }
    }
  }, [remoteStream]);

  // Call timer: only count duration when call is connected
  useEffect(() => {
    if (!isCallModalOpen || !activeCall || activeCall.status !== 'connected') {
      setSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallModalOpen, activeCall?.status]);

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
            <span className={`w-2.5 h-2.5 rounded-full ${activeCall.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
            <span className="font-semibold text-xs text-white truncate max-w-[120px]">
              {activeCall.conversationName}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {activeCall.status === 'calling' ? 'Đang gọi...' : formatDuration(seconds)}
          </span>
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
            onClick={() => endCall(seconds)}
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
            onEndCall={() => endCall(seconds)}
          />
        </div>
      </div>
    );
  }

  const conv = conversations.find((c) => c.id === activeCall.conversationId);
  const otherMember = !activeCall.isGroup && conv
    ? conv.members?.find((m) => m.id !== currentUser?.id) || conv.members?.[0]
    : null;

  const hasRemoteVideo = Boolean(remoteStream && remoteStream.getVideoTracks().length > 0);
  const hasLocalVideo = Boolean(localStream && localStream.getVideoTracks().length > 0 && !activeCall.isVideoOff);

  // Full Screen Call Modal
  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${activeCall.isVideoOff ? 'max-w-2xl h-[520px]' : 'max-w-4xl h-[640px]'} bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300 animate-in fade-in zoom-in-95`}
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
              {activeCall.status === 'calling' ? (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  Đang đổ chuông...
                </span>
              ) : (
                `Đang kết nối • ${formatDuration(seconds)}`
              )}
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

        {/* Warning banner if accessed via HTTP IP where Chrome blocks Mic/Camera */}
        {!isSecureContext && !localStream && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-10">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">⚠️ Trình duyệt chặn Mic/Camera (HTTP LAN)</span>
              <span className="hidden sm:inline text-amber-300/80">
                Để bật quyền khi dùng IP, cấu hình cờ <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>
              </span>
            </div>
            <button
              onClick={() => {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                navigator.clipboard?.writeText('chrome://flags/#unsafely-treat-insecure-origin-as-secure');
                alert(
                  `HƯỚNG DẪN BẬT MIC/CAMERA TRÊN CHROME (LAN IP):\n\n1. Mở tab mới: chrome://flags/#unsafely-treat-insecure-origin-as-secure\n2. Nhập URL máy này: ${origin}\n3. Đổi sang 'Enabled'\n4. Nhấn nút 'Relaunch' ở góc dưới Chrome để kích hoạt.`
                );
              }}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-100 font-medium text-[11px] border border-amber-500/30 transition-colors whitespace-nowrap"
            >
              Xem cách mở
            </button>
          </div>
        )}

        {/* Dedicated Mounted Audio Element for Remote Audio Playback (offscreen, not display:none to avoid Chromium audio throttling) */}
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          controls={false}
          style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', bottom: 0, right: 0 }}
        />

        {/* If browser blocked autoplay, prompt user to click once to unmute */}
        {audioAutoplayBlocked && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 z-10 animate-pulse">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">Âm thanh cuộc gọi đã sẵn sàng</span>
            </div>
            <button
              onClick={() => {
                webrtcService.resumeAudio();
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.play().then(() => setAudioAutoplayBlocked(false)).catch(() => {});
                } else {
                  setAudioAutoplayBlocked(false);
                }
              }}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              Bật âm thanh
            </button>
          </div>
        )}

        {/* Video / Avatar Canvas Area */}
        <div className="flex-1 flex items-center justify-center relative bg-slate-950 overflow-hidden">
          {activeCall.isVideoOff ? (
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-2xl uppercase transition-all duration-100 mx-auto ${
                    remoteAudioLevel > 5
                      ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-950 scale-105 shadow-emerald-500/50'
                      : 'shadow-blue-500/20'
                  }`}
                >
                  {activeCall.conversationName.charAt(0)}
                </div>
                {remoteAudioLevel > 5 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-[10px] text-slate-950 font-bold px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
                    Đang nói
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-bold text-lg text-white">{activeCall.conversationName}</h4>
                {otherMember?.phoneNumber ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-mono mt-1">
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
                  <p className="text-xs text-slate-400 mt-1">Cuộc gọi thoại thời gian thực bảo mật</p>
                )}
              </div>

              {/* Real-time Audio Level Testing Panel */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 w-72 mx-auto text-left shadow-lg space-y-2.5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Mic className={`w-3.5 h-3.5 ${localAudioLevel > 5 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                    <span className="text-[11px]">Mic của bạn:</span>
                  </span>
                  <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${localAudioLevel > 5 ? 'bg-emerald-500' : 'bg-slate-600'}`}
                      style={{ width: `${Math.max(4, localAudioLevel)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className={`w-3.5 h-3.5 ${remoteAudioLevel > 5 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                    <span className="text-[11px]">Tiếng đối phương:</span>
                  </span>
                  <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${remoteAudioLevel > 5 ? 'bg-emerald-500' : 'bg-slate-600'}`}
                      style={{ width: `${Math.max(4, remoteAudioLevel)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Kiểm tra loa:</span>
                  <button
                    onClick={playSpeakerTestTone}
                    className="text-[11px] text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg transition-colors font-medium flex items-center gap-1"
                  >
                    <span>🔔 Phát chuông thử</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
              {/* Main Remote Video Stream (muted so only remoteAudio outputs sound, preventing double-audio buzzing) */}
              {hasRemoteVideo ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center space-y-3 z-10 p-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-blue-500/20 mx-auto uppercase animate-pulse">
                    {activeCall.conversationName.charAt(0)}
                  </div>
                  <h4 className="font-bold text-lg text-white">{activeCall.conversationName}</h4>
                  <p className="text-xs text-slate-400">
                    Đang kết nối hình ảnh camera đối phương...
                  </p>
                </div>
              )}

              {/* Local Camera Self-View (PiP Floating Preview in corner) */}
              {hasLocalVideo && (
                <div className="absolute bottom-4 right-4 z-20 w-44 h-32 rounded-2xl overflow-hidden border-2 border-slate-700/80 bg-slate-900 shadow-2xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <div className="absolute bottom-1.5 left-2 text-[10px] text-white/90 font-medium bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm select-none">
                    Bạn
                  </div>
                </div>
              )}
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
            onClick={() => endCall(seconds)}
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
