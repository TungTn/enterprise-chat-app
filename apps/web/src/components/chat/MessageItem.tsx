'use client';

import React, { useState } from 'react';
import { ChatMessage, MessageType } from '@enterprise-chat/shared-types';
import { useChatStore } from '@/stores/useChatStore';
import {
  Smile,
  Reply,
  Edit2,
  Trash2,
  Pin,
  Star,
  Download,
  FileText,
  CheckCircle,
  MoreVertical,
  Forward,
} from 'lucide-react';

interface Props {
  message: ChatMessage;
}

const COMMON_EMOJIS = ['👍', '❤️', '🎉', '🔥', '👏', '🚀'];

export default function MessageItem({ message }: Props) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const {
    currentUser,
    toggleReaction,
    setReplyingMessage,
    setEditingMessage,
    deleteMessage,
    togglePinMessage,
    toggleStarMessage,
    setMessageToForward,
    toggleForward,
    votePoll,
  } = useChatStore();

  const isSelf = currentUser?.id === message.senderId;

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
      className={`group relative flex gap-3 px-4 py-2 hover:bg-slate-900/40 transition-colors ${
        message.isPinned ? 'bg-amber-500/5 border-l-2 border-amber-500' : ''
      }`}
    >
      {/* Sender Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {message.senderAvatarUrl ? (
          <img
            src={message.senderAvatarUrl}
            alt={message.senderName}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-800 text-blue-400 font-bold text-xs flex items-center justify-center">
            {message.senderName.charAt(0)}
          </div>
        )}
      </div>

      {/* Message Content Body */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-white leading-tight">
            {message.senderName}
          </span>
          <span className="text-[10px] text-slate-500">{message.createdAt}</span>

          {message.isPinned && (
            <span className="text-[10px] text-amber-400 flex items-center gap-1 font-medium bg-amber-400/10 px-1.5 py-0.5 rounded">
              <Pin className="w-2.5 h-2.5" /> Đã ghim
            </span>
          )}

          {message.isStarred && (
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          )}
        </div>

        {/* Reply Quote Banner */}
        {message.replyTo && (
          <div className="mt-1 mb-1 pl-2.5 border-l-2 border-blue-500 text-xs text-slate-400 bg-slate-900/60 py-1 pr-2 rounded-r">
            <span className="font-semibold text-blue-400 text-[11px] block">
              {message.replyTo.senderName}
            </span>
            <p className="truncate text-slate-300 text-[11px]">{message.replyTo.content}</p>
          </div>
        )}

        {/* Main Text Content */}
        {message.type === MessageType.TEXT && (
          <div className="mt-1 text-xs text-slate-200 leading-relaxed break-words">
            {message.content}
            {message.isEdited && (
              <span className="ml-1.5 text-[10px] text-slate-500 italic">(Đã chỉnh sửa)</span>
            )}
          </div>
        )}

        {/* Poll Component */}
        {message.type === MessageType.POLL && message.poll && (
          <div className="mt-2 bg-slate-950/80 border border-slate-800 rounded-xl p-3 max-w-md shadow-sm">
            <h4 className="font-semibold text-xs text-white mb-2">{message.poll.question}</h4>
            <div className="space-y-2">
              {message.poll.options.map((opt) => {
                const total = message.poll!.totalVotes || 1;
                const percent = Math.round((opt.voterIds.length / total) * 100);
                const hasVoted = currentUser && opt.voterIds.includes(currentUser.id);

                return (
                  <button
                    key={opt.id}
                    onClick={() => votePoll(message.id, opt.id)}
                    className={`w-full text-left relative overflow-hidden rounded-lg p-2.5 border transition-all text-xs ${
                      hasVoted
                        ? 'border-blue-500 bg-blue-500/10 text-white font-medium'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {/* Progress Bar Background */}
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-600/20 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            hasVoted ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-700'
                          }`}
                        >
                          {hasVoted && <span className="text-[10px] font-bold">✓</span>}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      <span className="font-semibold text-[11px] text-slate-400">
                        {percent}% ({opt.voterIds.length})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
              <span>Tổng số phiếu: {message.poll.totalVotes}</span>
              <span>{message.poll.isMultiple ? 'Bình chọn nhiều lựa chọn' : 'Một lựa chọn'}</span>
            </div>
          </div>
        )}

        {/* File Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 p-2 rounded-lg max-w-sm text-xs"
              >
                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 truncate">{file.fileName}</p>
                  <span className="text-[10px] text-slate-500">
                    {(file.fileSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <a
                  href={file.downloadUrl || '#'}
                  download
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Reaction Pill Row */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              if (userIds.length === 0) return null;
              const hasReacted = currentUser && userIds.includes(currentUser.id);

              return (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(message.id, emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                    hasReacted
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
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

      {/* Floating Action Menu Bar on Hover */}
      {showActions && (
        <div className="absolute right-4 top-2 bg-slate-950 border border-slate-800 rounded-lg p-1 flex items-center gap-0.5 shadow-lg shadow-black/40 z-10">
          {/* Reaction Picker Button */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
              title="Thả cảm xúc"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute right-0 bottom-full mb-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex items-center gap-1 shadow-xl z-20">
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
            )}
          </div>

          <button
            onClick={() => setReplyingMessage(message)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Trả lời trích dẫn"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => togglePinMessage(message.id)}
            className={`p-1.5 hover:bg-slate-800 rounded transition-colors ${
              message.isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title={message.isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => toggleStarMessage(message.id)}
            className={`p-1.5 hover:bg-slate-800 rounded transition-colors ${
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
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Chuyển tiếp"
          >
            <Forward className="w-3.5 h-3.5" />
          </button>

          {isSelf && (
            <>
              <button
                onClick={() => setEditingMessage(message)}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                title="Chỉnh sửa tin nhắn"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteMessage(message.id)}
                className="p-1.5 hover:bg-slate-800 rounded text-red-400 hover:text-red-300 transition-colors"
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
