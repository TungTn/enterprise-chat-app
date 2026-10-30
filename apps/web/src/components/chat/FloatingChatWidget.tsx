'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  MessageSquare,
  X,
  Maximize2,
  ChevronDown,
  Send,
  Hash,
} from 'lucide-react';
import { ConversationType } from '@enterprise-chat/shared-types';
import { formatMessageTime } from '@/lib/formatDate';

export default function FloatingChatWidget() {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messagesMap,
    sendMessage,
    isQuickWidgetOpen,
    toggleQuickWidget,
  } = useChatStore();

  const [inputVal, setInputVal] = useState('');
  const [showConvDropdown, setShowConvDropdown] = useState(false);

  // Close dropdown or widget on Escape
  useEffect(() => {
    if (!isQuickWidgetOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConvDropdown) {
          setShowConvDropdown(false);
        } else {
          toggleQuickWidget(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickWidgetOpen, showConvDropdown, toggleQuickWidget]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const messages = (activeConversationId && messagesMap[activeConversationId]) || [];

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const handleSend = () => {
    if (!inputVal.trim() || !activeConversationId) return;
    sendMessage({
      conversationId: activeConversationId,
      content: inputVal.trim(),
    });
    setInputVal('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none font-sans">
      {/* Floating Mini Window */}
      {isQuickWidgetOpen ? (
        <div className="w-80 sm:w-96 h-[480px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            {/* Conversation Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowConvDropdown(!showConvDropdown)}
                className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-blue-400 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-[10px]">
                  {activeConv?.type === ConversationType.CHANNEL ? (
                    <Hash className="w-3.5 h-3.5" />
                  ) : (
                    activeConv?.name?.charAt(0) || 'C'
                  )}
                </div>
                <span className="truncate max-w-[140px]">{activeConv?.name || 'Trò chuyện'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showConvDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowConvDropdown(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-64 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-1 z-30 max-h-56 overflow-y-auto">
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveConversationId(c.id);
                          setShowConvDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          c.id === activeConversationId ? 'text-blue-400 font-semibold bg-slate-800/50' : 'text-slate-300'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {c.unreadCount > 0 && c.id !== activeConversationId && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {c.unreadCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={() => toggleQuickWidget(false)}
                className="p-1 hover:bg-slate-800 rounded hover:text-white transition-colors"
                title="Đóng cửa sổ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mini Message Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-12">Chưa có tin nhắn nào</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="space-y-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-white text-[11px]">{m.senderName}</span>
                    <span className="text-[9px] text-slate-500">{formatMessageTime(m.createdAt)}</span>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800/60 rounded-lg p-2 text-slate-200">
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Input Bar */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhắn tin nhanh..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSend}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Floating Button Trigger */
        <button
          onClick={() => toggleQuickWidget(true)}
          className="relative w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all"
          title="Mở tiện ích chat nổi (Floating Widget)"
        >
          <MessageSquare className="w-6 h-6" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-slate-900 shadow">
              {totalUnread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
