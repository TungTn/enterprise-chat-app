'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { Search, X, Loader2, MessageSquare, Hash } from 'lucide-react';
import { formatMessageTime } from '@/lib/formatDate';

export default function InChatSearchBar() {
  const {
    isSearchOpen,
    toggleSearch,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchMessages,
    clearSearchResults,
    activeConversationId,
    setActiveConversationId,
  } = useChatStore();

  const [searchScope, setSearchScope] = useState<'current' | 'all'>('current');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchMessages(
          searchQuery,
          searchScope === 'current' ? activeConversationId || undefined : undefined
        );
      } else {
        clearSearchResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchScope, isSearchOpen, activeConversationId, searchMessages, clearSearchResults]);

  // Handle ESC
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSearchResults();
        toggleSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, clearSearchResults, toggleSearch]);

  const handleSelectMessage = (msg: any) => {
    if (msg.conversationId !== activeConversationId) {
      setActiveConversationId(msg.conversationId);
    }
    setTimeout(() => {
      const el = document.getElementById(`message-${msg.id}`) || document.getElementById(`msg-${msg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-cyan-500', 'bg-cyan-950/40', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-cyan-500', 'bg-cyan-950/40');
        }, 3000);
      }
    }, 300);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-400/30 text-yellow-200 px-0.5 rounded font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!isSearchOpen) return null;

  return (
    <div className="relative bg-slate-900 border-b border-slate-800 z-30 shadow-md">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-700/60 focus-within:border-cyan-500 transition-colors">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchScope === 'current'
                ? 'Tìm kiếm trong cuộc trò chuyện hiện tại...'
                : 'Tìm kiếm toàn bộ tin nhắn & tài liệu...'
            }
            autoFocus
            className="bg-transparent border-none text-xs text-slate-100 placeholder-slate-500 focus:outline-none flex-1"
          />
          {isSearching && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />}
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                clearSearchResults();
              }}
              className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scope selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setSearchScope('current')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              searchScope === 'current'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hội thoại này
          </button>
          <button
            onClick={() => setSearchScope('all')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              searchScope === 'all'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả
          </button>
        </div>

        {/* Close search */}
        <button
          onClick={() => {
            clearSearchResults();
            toggleSearch(false);
          }}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
          title="Đóng tìm kiếm (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Search Results Dropdown */}
      {searchQuery.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full bg-slate-900 border-b border-slate-800 shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-800/60">
          <div className="px-4 py-1.5 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {isSearching ? (
                'Đang tìm kiếm tin nhắn...'
              ) : searchResults.length > 0 ? (
                <>
                  Tìm thấy <strong className="text-cyan-400">{searchResults.length}</strong> kết quả phù hợp
                </>
              ) : (
                'Không tìm thấy tin nhắn nào chứa từ khóa này'
              )}
            </span>
            <span className="text-slate-500">Nhấn vào tin nhắn để cuộn đến</span>
          </div>

          {searchResults.map((msg) => (
            <div
              key={msg.id}
              onClick={() => handleSelectMessage(msg)}
              className="px-4 py-2.5 hover:bg-slate-800/60 cursor-pointer transition-colors group flex items-start gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 border border-cyan-500/30">
                {msg.senderName?.charAt(0) || 'U'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {msg.senderName}
                    </span>
                    {msg.conversationName && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                        {msg.conversationType === 'CHANNEL' ? (
                          <Hash className="w-2.5 h-2.5" />
                        ) : (
                          <MessageSquare className="w-2.5 h-2.5" />
                        )}
                        {msg.conversationName}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {highlightMatch(msg.content, searchQuery)}
                </div>

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-cyan-400">
                    <span>📎 Đính kèm: {msg.attachments.map((a: any) => a.fileName).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
