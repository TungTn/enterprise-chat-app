'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteParticipant,
  Participant,
  LocalParticipant,
} from 'livekit-client';
import { apiRequest } from '@/lib/api';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  ShieldCheck,
  Radio,
} from 'lucide-react';

interface GroupVideoRoomProps {
  conversationId: string;
  conversationName: string;
  token?: string | null;
  onEndCall: () => void;
}

interface ParticipantInfo {
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  videoTrack?: Track | null;
  audioTrack?: Track | null;
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
}

export default function GroupVideoRoom({
  conversationId,
  conversationName,
  token,
  onEndCall,
}: GroupVideoRoomProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Update participant list from LiveKit room state
  const syncParticipants = useCallback((currentRoom: Room) => {
    const list: ParticipantInfo[] = [];

    // Local
    const local = currentRoom.localParticipant;
    if (local) {
      const localVideoPub = Array.from(local.videoTrackPublications.values())[0];
      const localAudioPub = Array.from(local.audioTrackPublications.values())[0];

      list.push({
        identity: local.identity,
        name: local.name || 'Bạn',
        isLocal: true,
        isSpeaking: local.isSpeaking,
        videoTrack: localVideoPub?.track || null,
        audioTrack: localAudioPub?.track || null,
        isCameraEnabled: local.isCameraEnabled,
        isMicEnabled: local.isMicrophoneEnabled,
      });
    }

    // Remotes
    currentRoom.remoteParticipants.forEach((remote: RemoteParticipant) => {
      const videoPub = Array.from(remote.videoTrackPublications.values())[0];
      const audioPub = Array.from(remote.audioTrackPublications.values())[0];

      list.push({
        identity: remote.identity,
        name: remote.name || remote.identity,
        isLocal: false,
        isSpeaking: remote.isSpeaking,
        videoTrack: videoPub?.track || null,
        audioTrack: audioPub?.track || null,
        isCameraEnabled: remote.isCameraEnabled,
        isMicEnabled: remote.isMicrophoneEnabled,
      });
    });

    setParticipants(list);
  }, []);

  // Connect to LiveKit Room
  useEffect(() => {
    let activeRoom: Room | null = null;
    let isSubscribed = true;

    async function connectLiveKit() {
      try {
        setIsConnecting(true);
        setError(null);

        // 1. Request room access token from backend
        const res = await apiRequest<{ token: string; url: string; room: string }>(
          '/chat/call/livekit-token',
          {
            method: 'POST',
            body: JSON.stringify({ conversationId }),
          },
          token || undefined
        );

        if (!res || !res.token) {
          throw new Error('Không thể nhận token kết nối phòng họp LiveKit');
        }

        if (!isSubscribed) return;

        // 2. Initialize LiveKit Room instance
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        activeRoom = newRoom;
        setRoom(newRoom);

        // 3. Register Event Listeners
        newRoom.on(RoomEvent.Connected, () => {
          if (!isSubscribed) return;
          setIsConnected(true);
          setIsConnecting(false);
          syncParticipants(newRoom);
        });

        newRoom.on(RoomEvent.ParticipantConnected, () => syncParticipants(newRoom));
        newRoom.on(RoomEvent.ParticipantDisconnected, () => syncParticipants(newRoom));

        newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
          syncParticipants(newRoom);
          if (track.kind === Track.Kind.Audio) {
            const el = document.createElement('audio');
            el.autoplay = true;
            track.attach(el);
            audioRefs.current.set(participant.identity, el);
          }
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
          syncParticipants(newRoom);
          if (track.kind === Track.Kind.Audio) {
            const el = audioRefs.current.get(participant.identity);
            if (el) {
              track.detach(el);
              el.remove();
              audioRefs.current.delete(participant.identity);
            }
          }
        });

        newRoom.on(RoomEvent.ActiveSpeakersChanged, () => syncParticipants(newRoom));
        newRoom.on(RoomEvent.TrackMuted, () => syncParticipants(newRoom));
        newRoom.on(RoomEvent.TrackUnmuted, () => syncParticipants(newRoom));

        // 4. Connect to server
        await newRoom.connect(res.url, res.token);

        // 5. Publish camera & mic
        await newRoom.localParticipant.enableCameraAndMicrophone();
        syncParticipants(newRoom);
      } catch (err: any) {
        console.error('LiveKit connection error:', err);
        if (isSubscribed) {
          setError(err.message || 'Lỗi kết nối phòng họp nhóm');
          setIsConnecting(false);
        }
      }
    }

    connectLiveKit();

    return () => {
      isSubscribed = false;
      if (activeRoom) {
        activeRoom.disconnect();
      }
    };
  }, [conversationId, token, syncParticipants]);

  // Attach video tracks to elements
  useEffect(() => {
    participants.forEach((p) => {
      const el = videoRefs.current.get(p.identity);
      if (el && p.videoTrack) {
        p.videoTrack.attach(el);
      }
    });
  }, [participants]);

  // Controls
  const toggleMute = async () => {
    if (!room) return;
    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
    setIsMuted(enabled);
    syncParticipants(room);
  };

  const toggleVideo = async () => {
    if (!room) return;
    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
    setIsVideoOff(enabled);
    syncParticipants(room);
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    const enabled = room.localParticipant.isScreenShareEnabled;
    await room.localParticipant.setScreenShareEnabled(!enabled);
    setIsScreenSharing(!enabled);
    syncParticipants(room);
  };

  // Grid layout class based on participant count
  const getGridClass = () => {
    const count = participants.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    return 'grid-cols-3 grid-rows-3';
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              {conversationName}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-spin" /> LiveKit SFU
              </span>
            </h3>
            <span className="text-xs text-slate-400">
              {isConnecting
                ? 'Đang kết nối vào máy chủ họp nhóm...'
                : `${participants.length} thành viên đang tham gia`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-xl">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>{participants.length}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enterprise Encrypted</span>
          </div>
        </div>
      </div>

      {/* Main Video Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {isConnecting && (
          <div className="h-full flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Đang khởi tạo luồng video máy chủ SFU...</p>
          </div>
        )}

        {error && (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
              <PhoneOff className="w-6 h-6" />
            </div>
            <p className="text-sm text-red-400 font-medium">{error}</p>
            <p className="text-xs text-slate-500 max-w-md">
              Vui lòng kiểm tra Docker container LiveKit (:7880) đang chạy hoặc thử lại sau.
            </p>
          </div>
        )}

        {!isConnecting && !error && (
          <div className={`grid ${getGridClass()} gap-3 h-full auto-rows-fr`}>
            {participants.map((p) => {
              const isLocal = p.isLocal;
              return (
                <div
                  key={p.identity}
                  className={`relative bg-slate-900 border rounded-2xl overflow-hidden flex items-center justify-center shadow-lg transition-all duration-200 ${
                    p.isSpeaking
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-emerald-500/10'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Video Stream Element */}
                  <video
                    ref={(el) => {
                      if (el) {
                        videoRefs.current.set(p.identity, el);
                        if (p.videoTrack) p.videoTrack.attach(el);
                      } else {
                        videoRefs.current.delete(p.identity);
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className={`w-full h-full object-cover ${
                      p.isCameraEnabled ? 'block' : 'hidden'
                    } ${isLocal ? 'scale-x-[-1]' : ''}`}
                  />

                  {/* Fallback Avatar when Camera is Off */}
                  {!p.isCameraEnabled && (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold uppercase shadow-xl">
                        {p.name.charAt(0)}
                      </div>
                      <span className="text-xs font-semibold text-slate-300">{p.name}</span>
                    </div>
                  )}

                  {/* Overlay Badges */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-medium text-white">
                    <span>{p.name}</span>
                    {isLocal && <span className="text-[10px] text-blue-400 font-normal">(Tôi)</span>}
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {!p.isMicEnabled && (
                      <span className="p-1 rounded-md bg-red-500/80 text-white">
                        <MicOff className="w-3 h-3" />
                      </span>
                    )}
                    {p.isSpeaking && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-black flex items-center gap-1 animate-pulse">
                        Đang nói
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-3">
        <button
          onClick={toggleMute}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
          title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            isVideoOff
              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
          title={isVideoOff ? 'Bật Camera' : 'Tắt Camera'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            isScreenSharing
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-slate-800 text-white hover:bg-slate-700'
          }`}
          title="Chia sẻ màn hình"
        >
          <Monitor className="w-5 h-5" />
        </button>

        <button
          onClick={onEndCall}
          className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 active:scale-95 transition-transform"
          title="Rời cuộc họp"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
