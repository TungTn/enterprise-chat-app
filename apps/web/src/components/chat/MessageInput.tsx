'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  Send,
  Paperclip,
  Smile,
  BarChart2,
  Sparkles,
  X,
  Image as ImageIcon,
  AtSign,
} from 'lucide-react';

const COMMON_EMOJIS = ['😀', '😂', '👍', '❤️', '🎉', '🔥', '🚀', '👏', '👀', '💯', '☕', '💡'];

export default function MessageInput() {
  const [text, setText] = useState('');
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPopper, setShowMentionPopper] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeConversationId,
    sendMessage,
    replyingMessage,
    setReplyingMessage,
    editingMessage,
    setEditingMessage,
    editMessage,
    toggleCreatePoll,
    toggleAiSummary,
  } = useChatStore();

  // Populate text when editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Handle Clipboard Paste (e.g. Screenshot)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setPastedImage(event.target?.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      if (editingMessage) setEditingMessage(null);
      if (replyingMessage) setReplyingMessage(null);
      setShowMentionPopper(false);
      setShowEmojiPicker(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Simple mention trigger detection
    if (val.endsWith('@')) {
      setShowMentionPopper(true);
    } else if (!val.includes('@')) {
      setShowMentionPopper(false);
    }
  };

  const insertMention = (name: string) => {
    setText((prev) => {
      const lastAtIndex = prev.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        return prev.slice(0, lastAtIndex) + `@${name} `;
      }
      return prev + `@${name} `;
    });
    setShowMentionPopper(false);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    if (!activeConversationId) return;

    if (editingMessage) {
      if (text.trim()) {
        editMessage(editingMessage.id, text.trim());
        setText('');
      }
      return;
    }

    if (!text.trim() && !pastedImage) return;

    sendMessage({
      conversationId: activeConversationId,
      content: text.trim() || (pastedImage ? 'Ảnh chụp màn hình' : ''),
      replyTo: replyingMessage || undefined,
    });

    setText('');
    setPastedImage(null);
    setShowEmojiPicker(false);
    setShowMentionPopper(false);
  };

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 relative">
      {/* Reply Banner */}
      {replyingMessage && (
        <div className="mb-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-slate-400">Đang trả lời</span>
            <span className="font-semibold text-blue-400">{replyingMessage.senderName}:</span>
            <span className="text-slate-300 truncate">{replyingMessage.content}</span>
          </div>
          <button
            onClick={() => setReplyingMessage(null)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Edit Banner */}
      {editingMessage && (
        <div className="mb-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs">
          <span className="font-medium text-amber-400">Đang chỉnh sửa tin nhắn (Nhấn Esc để hủy)</span>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Clipboard Pasted Image Preview */}
      {pastedImage && (
        <div className="mb-2 relative inline-block group">
          <img
            src={pastedImage}
            alt="Pasted screenshot"
            className="h-20 w-auto rounded-lg border border-slate-700 object-cover"
          />
          <button
            onClick={() => setPastedImage(null)}
            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Mention Autocomplete Popper */}
      {showMentionPopper && (
        <div className="absolute left-4 bottom-full mb-2 w-64 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-30">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
            Gợi ý nhắc tên thành viên
          </span>
          <div className="space-y-0.5">
            {['Trần Trọng Kỹ Thuật (Tech Lead)', 'Lê Hoàng Lập Trình (Dev)', 'Phạm Thị Nhân Sự (HR)'].map(
              (name) => (
                <button
                  key={name}
                  onClick={() => insertMention(name)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 transition-colors flex items-center gap-2"
                >
                  <AtSign className="w-3.5 h-3.5 text-blue-400" />
                  <span className="truncate">{name}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute right-4 bottom-full mb-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3 z-30 w-64">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Biểu cảm cảm xúc
          </span>
          <div className="grid grid-cols-6 gap-1.5 text-xl">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setText((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                  textareaRef.current?.focus();
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-center hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Box */}
      <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl focus-within:border-blue-500 transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Nhập tin nhắn (Shift + Enter để xuống dòng, Ctrl + V để dán ảnh)..."
          rows={2}
          className="w-full bg-transparent p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
        />

        {/* Action Toolbars */}
        <div className="px-3 py-2 flex items-center justify-between border-t border-slate-900">
          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
              title="Chèn biểu cảm Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleCreatePoll(true)}
              className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
              title="Tạo cuộc khảo sát bình chọn"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleAiSummary(true)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-xs font-medium"
              title="Tóm tắt cuộc trò chuyện bằng AI (Smart Summary)"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Summary</span>
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!text.trim() && !pastedImage}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
              text.trim() || pastedImage
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>{editingMessage ? 'Lưu' : 'Gửi'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
