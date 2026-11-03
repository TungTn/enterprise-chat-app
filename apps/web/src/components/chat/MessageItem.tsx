'use client';

import React, { useState, useEffect } from 'react';
import { ChatMessage, MessageType, MessageDeliveryStatus, SOCKET_EVENTS, ConversationType } from '@enterprise-chat/shared-types';
import { useChatStore } from '@/stores/useChatStore';
import { getSocket } from '@/lib/socket';
import {
  Smile,
  Reply,
  Edit2,
  Trash2,
  Pin,
  Star,
  Download,
  FileText,
  Forward,
  Play,
  Pause,
  Copy,
  Check,
  CheckCheck,
  Search,
  Eye,
  Phone,
  PhoneOff,
  Video,
} from 'lucide-react';

import { formatMessageTime, formatFullDateTime } from '@/lib/formatDate';
import LinkPreviewCard from './LinkPreviewCard';

interface Props {
  message: ChatMessage;
}

interface CallLogData {
  type: 'audio' | 'video';
  status: 'missed' | 'declined' | 'completed';
  duration: number;
}

function parseCallLog(content: string): CallLogData | null {
  if (!content || !content.startsWith('[CALL_LOG]:')) return null;
  try {
    return JSON.parse(content.substring('[CALL_LOG]:'.length));
  } catch {
    return null;
  }
}

const COMMON_EMOJIS = ['👍', '❤️', '🎉', '🔥', '👏', '🚀'];

export default function MessageItem({ message }: Props) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  const {
    currentUser,
    conversations,
    setActiveConversationId,
    createDirectApi,
    startCall,
    toggleReaction,
    setReplyingMessage,
    setEditingMessage,
    deleteMessage,
    togglePinMessage,
    toggleStarMessage,
    setMessageToForward,
    toggleForward,
    votePoll,
    setLightboxImage,
    setReadReceiptsMessage,
  } = useChatStore();

  const handleStartDirectChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.senderId || isSelf) return;

    // Check if DM conversation already exists
    const existing = conversations.find(
      (c) =>
        c.type === ConversationType.DIRECT &&
        (c.members?.some((m) => m.id === message.senderId) ||
          (message.senderName && c.name?.toLowerCase().includes(message.senderName.toLowerCase())))
    );

    if (existing) {
      setActiveConversationId(existing.id);
      return;
    }

    const newConvId = await createDirectApi(message.senderId);
    if (newConvId) {
      setActiveConversationId(newConvId);
    }
  };

  // Close reaction emoji picker on Escape
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEmojiPicker(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEmojiPicker]);

  const isSelf = Boolean(
    (currentUser?.id && message.senderId && currentUser.id === message.senderId) ||
    (currentUser?.email && message.senderId && currentUser.email.toLowerCase() === message.senderId.toLowerCase()) ||
    (currentUser?.fullName && message.senderName && currentUser.fullName.toLowerCase() === message.senderName.toLowerCase()) ||
    (currentUser?.email && message.senderName && currentUser.email.split('@')[0].toLowerCase() === message.senderName.toLowerCase())
  );

  // Send READ ack if viewing a message sent by someone else
  useEffect(() => {
    if (!isSelf && message.id && !message.id.startsWith('temp-') && !message.id.startsWith('msg-')) {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.MESSAGE_ACK, {
          messageId: message.id,
          conversationId: message.conversationId,
          clientMessageId: message.clientMessageId,
          status: MessageDeliveryStatus.READ,
        });
      }
    }
  }, [message.id, isSelf, message.conversationId, message.clientMessageId]);

  // Voice toggle
  const togglePlayVoice = () => {
    setIsVoicePlaying(!isVoicePlaying);
  };

  const cycleVoiceSpeed = () => {
    if (voiceSpeed === 1) setVoiceSpeed(1.5);
    else if (voiceSpeed === 1.5) setVoiceSpeed(2);
    else setVoiceSpeed(1);
  };

  // Helper to parse markdown code blocks
  const parseContent = (content: string) => {
    const parts: { type: 'text' | 'code'; text: string; lang?: string }[] = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
      }
      parts.push({
        type: 'code',
        lang: match[1] || 'code',
        text: match[2].trim(),
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', text: content.slice(lastIndex) });
    }

    return parts;
  };

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const isVoice = message.type === MessageType.VOICE || !!message.voice;
  const isPoll = message.type === MessageType.POLL && !!message.poll;

  const isImageAttachment = (att: { fileName: string; mimeType?: string }) =>
    att.mimeType?.startsWith('image/') ||
    Boolean(att.fileName.match(/\.(png|jpg|jpeg|gif|webp)$/i));

  const imageFiles = (message.attachments || []).filter(isImageAttachment);
  const docFiles = (message.attachments || []).filter((att) => !isImageAttachment(att));

  const renderTextWithMentionsAndLinks = (rawText: string, isSelfMsg: boolean) => {
    // Regex matching @mentions or URLs (http/https)
    const regex = /(@all|@here|@[a-zA-Z0-9_\u00C0-\u1EF9]+(?:\s+[a-zA-Z0-9_\u00C0-\u1EF9]+)*|https?:\/\/[^\s<>"'{}|\\^`\[\]]+)/g;
    const parts = rawText.split(regex);
    return parts.map((part, i) => {
      if (part === '@all' || part === '@here') {
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/30 select-none tracking-wide text-[11px]"
          >
            <span className="text-xs">📢</span>
            <span>{part}</span>
          </span>
        );
      }
      if (part.startsWith('@') && part.length > 1) {
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded font-semibold select-none ${
              isSelfMsg
                ? 'bg-blue-800/90 text-white border border-blue-400/40'
                : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
            }`}
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`underline underline-offset-2 break-all transition-colors ${
              isSelfMsg
                ? 'text-blue-100 hover:text-white hover:underline'
                : 'text-blue-400 hover:text-blue-300 hover:underline'
            }`}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const hasAllMention = Boolean(
    message.content &&
      (message.content.includes('@all') || message.content.includes('@here'))
  );

  const isDirectlyMentioned = Boolean(
    currentUser &&
      !isSelf &&
      message.content &&
      ((currentUser.fullName &&
        message.content.toLowerCase().includes(`@${currentUser.fullName.toLowerCase()}`)) ||
        (currentUser.email &&
          message.content.toLowerCase().includes(`@${currentUser.email.split('@')[0].toLowerCase()}`)))
  );

  const isMentioned = hasAllMention || isDirectlyMentioned;

  const callLog = parseCallLog(message.content);

  if (callLog) {
    const isMissed = callLog.status === 'missed';
    const declines = callLog.status === 'declined';
    const isCompleted = callLog.status === 'completed';
    const isVideo = callLog.type === 'video';

    // Format duration text
    const mins = Math.floor((callLog.duration || 0) / 60);
    const secs = (callLog.duration || 0) % 60;
    const durationText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    let title = '';
    let subtitle = '';
    let badgeColor = '';
    let icon = null;

    if (isCompleted) {
      title = isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại';
      subtitle = `Thời lượng: ${durationText}`;
      badgeColor = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      icon = isVideo ? <Video className="w-4 h-4 text-emerald-400" /> : <Phone className="w-4 h-4 text-emerald-400" />;
    } else if (declines) {
      title = isSelf ? 'Cuộc gọi bị từ chối' : 'Đã từ chối cuộc gọi';
      subtitle = isSelf ? 'Đối phương hiện không thể nghe máy' : 'Cuộc gọi đã bị từ chối';
      badgeColor = 'border-rose-500/30 bg-rose-500/10 text-rose-400';
      icon = <PhoneOff className="w-4 h-4 text-rose-400" />;
    } else {
      // Missed / Cancelled
      title = isSelf ? 'Cuộc gọi đi không trả lời' : 'Cuộc gọi nhỡ';
      subtitle = isSelf ? 'Đã hủy cuộc gọi' : 'Nhấn gọi lại để liên hệ ngay';
      badgeColor = isSelf
        ? 'border-slate-700 bg-slate-800/80 text-slate-300'
        : 'border-red-500/40 bg-red-500/15 text-red-400';
      icon = isSelf ? <PhoneOff className="w-4 h-4 text-slate-400" /> : <PhoneOff className="w-4 h-4 text-red-400 animate-pulse" />;
    }

    return (
      <div className={`flex w-full my-2 px-4 ${isSelf ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-lg backdrop-blur-sm max-w-sm select-none ${badgeColor}`}>
          <div className="w-10 h-10 rounded-xl bg-slate-900/60 flex items-center justify-center flex-shrink-0 shadow-inner">
            {icon}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-xs truncate text-white">{title}</h4>
              <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
            <p className="text-[11px] opacity-80 mt-0.5 truncate">{subtitle}</p>
          </div>
          <button
            onClick={() => startCall(callLog.type || 'audio')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 flex-shrink-0"
            title="Gọi lại ngay"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Gọi lại</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
      className={`group relative flex w-full px-4 py-1.5 transition-all duration-200 ${
        isSelf ? 'justify-end' : 'justify-start gap-2.5'
      } ${message.isPinned ? 'bg-amber-500/5' : ''} ${
        hasAllMention
          ? 'bg-amber-500/15 border-l-4 border-amber-400 ring-1 ring-amber-500/30'
          : isDirectlyMentioned
          ? 'bg-blue-500/10 border-l-2 border-blue-400'
          : ''
      }`}
    >
      {/* Sender Avatar (Clickable to start 1-1 chat) */}
      {!isSelf && (
        <div
          onClick={handleStartDirectChat}
          className="flex-shrink-0 mt-0.5 cursor-pointer hover:opacity-80 active:scale-95 transition-all group"
          title={`Bấm để nhắn tin 1-1 với ${message.senderName}`}
        >
          {message.senderAvatarUrl && !avatarError ? (
            <img
              src={message.senderAvatarUrl}
              alt={message.senderName}
              onError={() => setAvatarError(true)}
              className="w-8 h-8 rounded-full object-cover bg-slate-800 ring-1 ring-slate-700/60 group-hover:ring-blue-500 transition-all"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 text-blue-400 font-bold text-xs flex items-center justify-center ring-1 ring-slate-700/60 group-hover:ring-blue-500 transition-all">
              {message.senderName ? message.senderName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>
      )}

      {/* Bubble Container */}
      <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[78%] min-w-0`}>
        {/* Banner for Self sender when @all was broadcasted */}
        {isSelf && hasAllMention && (
          <div className="flex items-center gap-1 mb-1 pr-1">
            <span className="text-[10px] text-amber-300 font-extrabold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1 shadow-sm">
              <span>📢</span>
              <span>Đã thông báo toàn bộ nhóm (@all)</span>
            </span>
          </div>
        )}

        {/* Sender Name & Pin Indicator (Clickable to start 1-1 chat) */}
        {!isSelf && (
          <div className="flex items-center gap-1.5 mb-1 pl-1">
            <button
              type="button"
              onClick={handleStartDirectChat}
              className="font-semibold text-xs text-slate-300 hover:text-blue-400 hover:underline leading-tight transition-colors cursor-pointer text-left"
              title={`Bấm để nhắn tin 1-1 với ${message.senderName}`}
            >
              {message.senderName}
            </button>
            {hasAllMention ? (
              <span className="text-[10px] text-amber-200 font-extrabold bg-gradient-to-r from-amber-500/30 to-orange-500/30 px-2 py-0.5 rounded-full border border-amber-500/50 flex items-center gap-1 shadow-sm">
                <span>📢</span>
                <span>Thông báo toàn nhóm (@all)</span>
              </span>
            ) : isDirectlyMentioned ? (
              <span className="text-[10px] text-blue-300 font-bold bg-blue-500/20 px-1.5 py-0.2 rounded border border-blue-500/40 animate-pulse">
                @ Nhắc đến bạn
              </span>
            ) : null}
            {message.isPinned && (
              <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-medium bg-amber-400/10 px-1 py-0.2 rounded">
                <Pin className="w-2.5 h-2.5" /> Ghim
              </span>
            )}
            {message.isStarred && (
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            )}
          </div>
        )}

        {/* Chat Bubble Body */}
        <div
          className={`relative rounded-2xl px-3.5 py-2 shadow-sm text-xs transition-all ${
            isSelf
              ? 'bg-blue-600 text-white rounded-tr-xs shadow-blue-900/20'
              : 'bg-slate-800/95 text-slate-100 rounded-tl-xs border border-slate-700/60 shadow-black/20'
          }`}
        >
          {/* Forwarded Tag */}
          {message.forwardedFrom && (
            <div className={`mb-1 flex items-center gap-1 text-[10px] italic ${isSelf ? 'text-blue-200' : 'text-slate-400'}`}>
              <Forward className="w-3 h-3" />
              <span>Chuyển tiếp từ <strong>{message.forwardedFrom.senderName}</strong></span>
            </div>
          )}

          {/* Reply Quote Banner */}
          {message.replyTo && (
            <div
              className={`mb-1.5 pl-2 border-l-2 py-1 pr-2 rounded-r text-[11px] ${
                isSelf
                  ? 'border-white/70 bg-blue-700/60 text-blue-100'
                  : 'border-blue-500 bg-slate-900/70 text-slate-300'
              }`}
            >
              <span className={`font-semibold block ${isSelf ? 'text-white' : 'text-blue-400'}`}>
                {message.replyTo.senderName}
              </span>
              <p className="truncate opacity-90">{message.replyTo.content}</p>
            </div>
          )}

          {/* Main Text Content */}
          {!isVoice && !isPoll && message.content && (
            <div className="leading-relaxed break-words space-y-1.5">
              {parseContent(message.content).map((part, idx) => {
                if (part.type === 'code') {
                  return (
                    <div
                      key={idx}
                      className="my-1.5 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm text-left"
                    >
                      <div className="px-3 py-1 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{part.lang}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(part.text, idx)}
                          className="flex items-center gap-1 hover:text-white text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          {copiedCodeIdx === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 text-[11px] text-emerald-300 font-mono overflow-x-auto leading-relaxed">
                        <code>{part.text}</code>
                      </pre>
                    </div>
                  );
                }
                return (
                  <p key={idx} className="whitespace-pre-wrap">
                    {renderTextWithMentionsAndLinks(part.text, isSelf)}
                  </p>
                );
              })}
              {message.isEdited && (
                <span className={`ml-1 text-[10px] italic ${isSelf ? 'text-blue-200' : 'text-slate-400'}`}>
                  (Đã chỉnh sửa)
                </span>
              )}
            </div>
          )}

          {/* Voice Player */}
          {isVoice && (
            <div className={`mt-1 rounded-xl p-2 flex items-center gap-2.5 min-w-[220px] max-w-sm ${
              isSelf ? 'bg-blue-700/70 border border-blue-500/40 text-white' : 'bg-slate-950 border border-slate-800 text-slate-200'
            }`}>
              <button
                onClick={togglePlayVoice}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isVoicePlaying ? 'bg-emerald-500 text-white animate-pulse' : isSelf ? 'bg-white text-blue-600' : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isVoicePlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-0.5 h-6">
                {(message.voice?.waveData || [20, 40, 60, 80, 50, 30, 70, 90, 45, 25, 65, 85, 35, 75, 55, 30, 60, 40, 20]).map((h, i) => (
                  <span
                    key={i}
                    className={`w-0.5 rounded-full transition-all ${
                      isVoicePlaying && i % 3 === 0 ? 'bg-emerald-400 animate-pulse' : isSelf ? 'bg-blue-300' : 'bg-slate-600'
                    }`}
                    style={{ height: `${Math.max(15, h)}%` }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 text-[10px] font-mono opacity-80">
                <span>00:{message.voice?.duration ? message.voice.duration.toString().padStart(2, '0') : '05'}</span>
                <button
                  onClick={cycleVoiceSpeed}
                  className={`px-1 rounded text-[9px] font-bold ${isSelf ? 'bg-blue-800' : 'bg-slate-800'}`}
                >
                  {voiceSpeed}x
                </button>
              </div>
            </div>
          )}

          {/* Poll Component */}
          {isPoll && message.poll && (
            <div className={`mt-1.5 rounded-xl p-3 max-w-sm text-left ${
              isSelf ? 'bg-blue-700/60 border border-blue-500/40' : 'bg-slate-950/90 border border-slate-800'
            }`}>
              <h4 className="font-semibold text-xs mb-2 text-white">{message.poll.question}</h4>
              <div className="space-y-1.5">
                {message.poll.options.map((opt) => {
                  const total = message.poll!.totalVotes || 1;
                  const percent = Math.round((opt.voterIds.length / total) * 100);
                  const hasVoted = currentUser && opt.voterIds.includes(currentUser.id);

                  return (
                    <button
                      key={opt.id}
                      onClick={() => votePoll(message.id, opt.id)}
                      className={`w-full text-left relative overflow-hidden rounded-lg p-2 border transition-all text-xs ${
                        hasVoted
                          ? 'border-blue-400 bg-blue-500/20 text-white font-medium'
                          : isSelf ? 'border-blue-500/40 bg-blue-800/40 text-blue-100 hover:border-blue-400' : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-blue-400/20 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                              hasVoted ? 'border-blue-300 bg-blue-400 text-white' : 'border-slate-600'
                            }`}
                          >
                            {hasVoted && '✓'}
                          </span>
                          <span className="truncate">{opt.text}</span>
                        </div>
                        <span className="font-semibold text-[10px] opacity-80 flex-shrink-0">
                          {percent}% ({opt.voterIds.length})
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-[10px] opacity-75 flex justify-between">
                <span>{message.poll.totalVotes} phiếu</span>
                <span>{message.poll.isMultiple ? 'Nhiều lựa chọn' : 'Một lựa chọn'}</span>
              </div>
            </div>
          )}

          {/* Image Attachments (Smart Grid Layout) */}
          {imageFiles.length > 0 && (
            <div className="mt-1.5">
              {imageFiles.length === 1 ? (
                <div
                  onClick={() => setLightboxImage(imageFiles[0].downloadUrl || '')}
                  className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950 group cursor-pointer max-w-sm shadow-md"
                >
                  <img
                    src={imageFiles[0].downloadUrl}
                    alt={imageFiles[0].fileName}
                    className="max-h-60 w-auto object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                    <Search className="w-5 h-5" />
                  </div>
                </div>
              ) : (
                <div
                  className={`grid gap-1.5 rounded-xl overflow-hidden max-w-sm ${
                    imageFiles.length === 2 ? 'grid-cols-2' : imageFiles.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                  }`}
                >
                  {imageFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => setLightboxImage(file.downloadUrl || '')}
                      className="aspect-square relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 group cursor-pointer shadow-sm hover:border-blue-400 transition-all"
                    >
                      <img
                        src={file.downloadUrl}
                        alt={file.fileName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Search className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Document / Non-image Attachments */}
          {docFiles.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {docFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs max-w-sm ${
                    isSelf
                      ? 'bg-blue-700/70 border border-blue-500/40 text-white'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-200'
                  }`}
                >
                  <FileText className={`w-4 h-4 flex-shrink-0 ${isSelf ? 'text-blue-200' : 'text-blue-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-[11px]">{file.fileName}</p>
                    <span className={`text-[9px] ${isSelf ? 'text-blue-200' : 'text-slate-400'}`}>
                      {(file.fileSizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <a
                    href={file.downloadUrl || '#'}
                    download={file.fileName}
                    className={`p-1 rounded hover:opacity-100 transition-opacity ${
                      isSelf ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Tải tệp tin"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Link Preview Card (Grab, Shopee, Web URLs) */}
          {message.linkPreview && (
            <LinkPreviewCard preview={message.linkPreview} isSelf={isSelf} />
          )}

          {/* Bubble Footer: Timestamp & Delivery Status */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none font-mono ${
              isSelf ? 'text-blue-100/75' : 'text-slate-400'
            }`}
            title={formatFullDateTime(message.createdAt)}
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>{formatMessageTime(message.createdAt)}</span>
            {isSelf && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReadReceiptsMessage(message);
                }}
                className="inline-flex items-center ml-0.5 hover:scale-110 transition-transform cursor-pointer"
                title="Bấm để xem danh sách người đã đọc"
              >
                {message.deliveryStatus === MessageDeliveryStatus.READ ? (
                  <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                ) : message.deliveryStatus === MessageDeliveryStatus.DELIVERED ? (
                  <CheckCheck className="w-3.5 h-3.5 text-blue-300/80" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-blue-300/80" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Reaction Pill Row (Positioned below the bubble) */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={`flex flex-wrap items-center gap-1 mt-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              if (userIds.length === 0) return null;
              const hasReacted = currentUser && userIds.includes(currentUser.id);

              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(message.id, emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                    hasReacted
                      ? 'bg-blue-600/25 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Menu Bar on Hover (Floating above bubble) */}
      {showActions && (
        <div
          className={`absolute -top-3.5 ${
            isSelf ? 'right-4' : 'left-12'
          } bg-slate-950/95 border border-slate-800 rounded-lg p-0.5 flex items-center gap-0.5 shadow-xl shadow-black/60 z-20`}
        >
          {/* Reaction Picker Button */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
              title="Thả cảm xúc"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {showEmojiPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowEmojiPicker(false)}
                />
                <div className="absolute left-0 bottom-full mb-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex items-center gap-1 shadow-xl z-20">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        toggleReaction(message.id, emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1 hover:bg-slate-800 rounded text-base hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setReplyingMessage(message)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Trả lời trích dẫn"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => togglePinMessage(message.id)}
            className={`p-1 hover:bg-slate-800 rounded transition-colors ${
              message.isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title={message.isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => toggleStarMessage(message.id)}
            className={`p-1 hover:bg-slate-800 rounded transition-colors ${
              message.isStarred ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Đánh dấu sao"
          >
            <Star className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setMessageToForward(message);
              toggleForward(true);
            }}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Chuyển tiếp"
          >
            <Forward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setReadReceiptsMessage(message)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Xem chi tiết người đã đọc"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {isSelf && (
            <>
              <button
                onClick={() => setEditingMessage(message)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                title="Chỉnh sửa tin nhắn"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteMessage(message.id)}
                className="p-1 hover:bg-slate-800 rounded text-red-400 hover:text-red-300 transition-colors"
                title="Xóa tin nhắn"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
