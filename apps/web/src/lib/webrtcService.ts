import { IceServerConfig } from '@enterprise-chat/shared-types';
import { getSocket } from './socket';

export interface SafeMediaResult {
  stream: MediaStream | null;
  error?: string;
  errorName?: string;
}

export async function getSafeUserMediaWithDetail(constraints: MediaStreamConstraints): Promise<SafeMediaResult> {
  if (typeof window === 'undefined') {
    return { stream: null, error: 'Chạy ngoài trình duyệt' };
  }

  const tryGetUserMedia = async (c: MediaStreamConstraints): Promise<MediaStream> => {
    if (navigator?.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      return await navigator.mediaDevices.getUserMedia(c);
    }

    const legacyGetUserMedia =
      (navigator as any)?.getUserMedia ||
      (navigator as any)?.webkitGetUserMedia ||
      (navigator as any)?.mozGetUserMedia ||
      (navigator as any)?.msGetUserMedia;

    if (legacyGetUserMedia) {
      return await new Promise<MediaStream>((resolve, reject) => {
        legacyGetUserMedia.call(navigator, c, resolve, reject);
      });
    }

    throw new Error('getUserMedia not supported in current environment');
  };

  try {
    const stream = await tryGetUserMedia(constraints);
    return { stream };
  } catch (err: any) {
    console.warn('[WebRTC] getUserMedia failed with ideal constraints, retrying basic constraints:', err);
    try {
      const stream = await tryGetUserMedia({
        audio: true,
        video: constraints.video ? true : false,
      });
      return { stream };
    } catch (fallbackErr: any) {
      console.warn('[WebRTC] getUserMedia fallback also failed:', fallbackErr);

      let friendlyMessage = 'Không thể truy cập Microphone';
      const name = fallbackErr?.name || err?.name || '';
      const msg = fallbackErr?.message || err?.message || '';

      if (name === 'NotFoundError' || msg.includes('Requested device not found')) {
        friendlyMessage = 'Máy tính chưa cắm Microphone (hãy cắm tai nghe có mic hoặc webcam)';
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        friendlyMessage = 'Quyền Microphone đã bị từ chối trong Cài đặt Windows / Trình duyệt';
      } else if (msg.includes('not supported') || (typeof window !== 'undefined' && window.isSecureContext === false)) {
        friendlyMessage = 'Trình duyệt chặn Mic qua IP HTTP (vui lòng mở qua http://localhost:3000 hoặc dùng bản Desktop Portable)';
      }

      return {
        stream: null,
        error: friendlyMessage,
        errorName: name,
      };
    }
  }
}

export async function getSafeUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream | null> {
  const res = await getSafeUserMediaWithDetail(constraints);
  return res.stream;
}

export interface WebRTCCallOptions {
  targetUserId: string;
  callId: string;
  isCaller: boolean;
  iceServers?: IceServerConfig[];
  callType?: 'audio' | 'video';
  onRemoteStream?: (stream: MediaStream) => void;
  onError?: (err: any) => void;
  onEnd?: () => void;
}

export interface StreamUpdate {
  local: MediaStream | null;
  remote: MediaStream | null;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private pendingOffer: any = null;
  private pendingAnswer: any = null;
  private isMediaReady: boolean = false;
  private currentCallId: string | null = null;
  private currentTargetUserId: string | null = null;
  private isCaller: boolean = false;
  private streamListeners: Array<(streams: StreamUpdate) => void> = [];

  public subscribeStreams(listener: (streams: StreamUpdate) => void): () => void {
    this.streamListeners.push(listener);
    // Emit current streams immediately upon subscription
    listener({ local: this.localStream, remote: this.remoteStream });
    return () => {
      this.streamListeners = this.streamListeners.filter((l) => l !== listener);
    };
  }

  private notifyStreamListeners(): void {
    const payload: StreamUpdate = {
      local: this.localStream,
      remote: this.remoteStream,
    };
    this.streamListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('[WebRTC] Error in stream listener:', err);
      }
    });
  }

  public async initCall(options: WebRTCCallOptions): Promise<void> {
    if (typeof window === 'undefined') return;

    // Clean up any stale call session first
    this.endCall();

    this.currentCallId = options.callId;
    this.currentTargetUserId = options.targetUserId;
    this.isCaller = options.isCaller;
    this.isMediaReady = false;
    this.pendingOffer = null;
    this.pendingAnswer = null;
    this.pendingCandidates = [];

    const configuration: RTCConfiguration = {
      iceServers:
        options.iceServers && options.iceServers.length > 0
          ? (options.iceServers as RTCIceServer[])
          : [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ],
    };

    try {
      this.peerConnection = new RTCPeerConnection(configuration);

      // Handle ICE Candidate generation
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentCallId && this.currentTargetUserId) {
          getSocket()?.emit('call:signal', {
            targetUserId: this.currentTargetUserId,
            callId: this.currentCallId,
            signal: {
              type: 'candidate',
              candidate: event.candidate.toJSON(),
            },
          });
        }
      };

      // Handle Remote Media Tracks
      this.peerConnection.ontrack = (event) => {
        let stream = event.streams && event.streams[0];
        if (!stream) {
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }
          this.remoteStream.addTrack(event.track);
          stream = this.remoteStream;
        } else {
          this.remoteStream = stream;
        }

        console.log('[WebRTC] ontrack received track:', event.track.kind, 'enabled:', event.track.enabled);
        if (event.track.kind === 'audio') {
          event.track.enabled = true;
        }

        // Direct audio element playback from WebRTC service to guarantee sound reproduction
        if (typeof window !== 'undefined' && stream) {
          if (!this.remoteAudio) {
            this.remoteAudio = new Audio();
            this.remoteAudio.autoplay = true;
            (this.remoteAudio as any).playsInline = true;
          }
          if (this.remoteAudio.srcObject !== stream) {
            this.remoteAudio.srcObject = stream;
          }
          this.remoteAudio.volume = 1.0;
          this.remoteAudio.play().catch((err) => {
            console.warn('[WebRTC] Native audio playback notice:', err);
          });
        }

        options.onRemoteStream?.(stream);
        this.notifyStreamListeners();
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('[WebRTC] Connection state:', state);
        if (state === 'failed' || state === 'closed') {
          options.onEnd?.();
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE Connection state:', this.peerConnection?.iceConnectionState);
      };

      // Acquire microphone (and camera if video call)
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: options.callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      };

      const mediaResult = await getSafeUserMediaWithDetail(constraints);
      this.localStream = mediaResult.stream;
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
        this.notifyStreamListeners();
      } else {
        console.warn('[WebRTC] Microphone unavailable or blocked. Proceeding with receive-only mode.', mediaResult.error);
        options.onError?.(mediaResult.error || 'Chưa cấp quyền Microphone trên thiết bị này');
      }

      // Mark media as ready so incoming SDP offers can be processed with tracks attached
      this.isMediaReady = true;

      // If caller, create SDP Offer and signal to recipient AFTER local tracks are added
      if (this.isCaller) {
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await this.peerConnection.setLocalDescription(offer);

        getSocket()?.emit('call:signal', {
          targetUserId: this.currentTargetUserId,
          callId: this.currentCallId,
          signal: {
            type: 'offer',
            sdp: offer.sdp,
          },
        });
      }

      // Flush any queued offer or answer received while initCall was awaiting async resources
      if (this.pendingOffer) {
        console.log('[WebRTC] Applying queued offer now that media is ready');
        const offer = this.pendingOffer;
        this.pendingOffer = null;
        await this.handleSignal(offer);
      }
      if (this.pendingAnswer) {
        console.log('[WebRTC] Applying queued answer now that peerConnection is ready');
        const answer = this.pendingAnswer;
        this.pendingAnswer = null;
        await this.handleSignal(answer);
      }
    } catch (err) {
      console.error('[WebRTC] Failed to initialize PeerConnection:', err);
      options.onError?.(err);
      this.endCall();
    }
  }

  public async handleSignal(signal: any): Promise<void> {
    if (!signal) return;

    try {
      if (signal.type === 'offer') {
        // Offer MUST wait until PeerConnection is ready AND local tracks have been added
        if (!this.peerConnection || !this.isMediaReady) {
          console.log('[WebRTC] Queueing offer because peerConnection/media is not yet ready');
          this.pendingOffer = signal;
          return;
        }

        if (this.peerConnection.signalingState === 'closed') {
          return;
        }

        if (this.peerConnection.signalingState !== 'stable') {
          if (this.peerConnection.signalingState === 'have-remote-offer') {
            console.log('[WebRTC] Duplicate offer ignored: already in have-remote-offer');
            return;
          }
          if (this.peerConnection.signalingState === 'have-local-offer') {
            if (!this.isCaller) {
              try {
                await this.peerConnection.setLocalDescription({ type: 'rollback' } as any);
              } catch (rbErr) {
                console.warn('[WebRTC] Rollback error:', rbErr);
              }
            } else {
              console.log('[WebRTC] Offer collision ignored on caller');
              return;
            }
          }
        }

        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: 'offer', sdp: signal.sdp })
        );

        // Process buffered ICE candidates safely
        while (this.pendingCandidates.length > 0) {
          const candidate = this.pendingCandidates.shift();
          if (candidate && this.peerConnection) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (candErr) {
              console.warn('[WebRTC] Error adding buffered candidate:', candErr);
            }
          }
        }

        // Create and send SDP Answer (accepting audio and video)
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        if (this.currentTargetUserId && this.currentCallId) {
          getSocket()?.emit('call:signal', {
            targetUserId: this.currentTargetUserId,
            callId: this.currentCallId,
            signal: {
              type: 'answer',
              sdp: answer.sdp,
            },
          });
        }
      } else if (signal.type === 'answer') {
        if (!this.peerConnection || !this.peerConnection.localDescription) {
          console.log('[WebRTC] Queueing answer because peerConnection localDescription is not yet ready');
          this.pendingAnswer = signal;
          return;
        }

        // Avoid InvalidStateError if answer arrives when already stable or duplicate
        if (this.peerConnection.signalingState === 'stable') {
          console.log('[WebRTC] Answer ignored: signalingState is already stable');
          return;
        }

        if (this.peerConnection.signalingState !== 'have-local-offer') {
          console.warn('[WebRTC] Answer ignored in state:', this.peerConnection.signalingState);
          return;
        }

        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: 'answer', sdp: signal.sdp })
        );

        // Process buffered ICE candidates safely
        while (this.pendingCandidates.length > 0) {
          const candidate = this.pendingCandidates.shift();
          if (candidate && this.peerConnection) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (candErr) {
              console.warn('[WebRTC] Error adding buffered candidate on answer:', candErr);
            }
          }
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        if (this.peerConnection && this.peerConnection.remoteDescription) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (candErr) {
            console.warn('[WebRTC] Error adding candidate directly:', candErr);
          }
        } else {
          this.pendingCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Notice handling signal:', err, signal);
    }
  }

  public resumeAudio(): void {
    if (this.remoteAudio) {
      this.remoteAudio.play().catch((err) => {
        console.warn('[WebRTC] Failed to resume remoteAudio:', err);
      });
    }
  }

  public setMuted(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public async setVideoDisabled(disabled: boolean): Promise<void> {
    if (!this.localStream) return;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach((track) => {
        track.enabled = !disabled;
      });
      this.notifyStreamListeners();
    } else if (!disabled) {
      // Dynamically acquire camera if call was started as audio-only
      try {
        const videoStream = await getSafeUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        const newTrack = videoStream ? videoStream.getVideoTracks()[0] : null;
        if (newTrack) {
          this.localStream.addTrack(newTrack);
          if (this.peerConnection) {
            this.peerConnection.addTrack(newTrack, this.localStream);
            const offer = await this.peerConnection.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await this.peerConnection.setLocalDescription(offer);
            if (this.currentTargetUserId && this.currentCallId) {
              getSocket()?.emit('call:signal', {
                targetUserId: this.currentTargetUserId,
                callId: this.currentCallId,
                signal: { type: 'offer', sdp: offer.sdp },
              });
            }
          }
          this.notifyStreamListeners();
        }
      } catch (err) {
        console.warn('[WebRTC] Failed to acquire camera on toggleVideo:', err);
      }
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public endCall(): void {
    this.isMediaReady = false;

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteAudio) {
      this.remoteAudio.pause();
      this.remoteAudio.srcObject = null;
      this.remoteAudio = null;
    }

    this.remoteStream = null;
    this.pendingCandidates = [];
    this.pendingOffer = null;
    this.pendingAnswer = null;
    this.currentCallId = null;
    this.currentTargetUserId = null;
    this.isCaller = false;
    this.notifyStreamListeners();
  }
}

export const webrtcService = new WebRTCService();
