'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  Hash,
  MessageSquare,
  Search,
  Plus,
  Settings,
  Bell,
  Users,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ConversationType } from '@enterprise-chat/shared-types';

export default function ConversationList() {
  const [tab, setTab] = useState<'all' | 'unread' | 'channels' | 'direct'>('all');
  const [filterQuery, setFilterQuery] = useState('');

  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    toggleCreateGroup,
    toggleSettings,
  } = useChatStore();

  const filteredConversations = conversations.filter((c) => {
    const matchesName = (c.name || '').toLowerCase().includes(filterQuery.toLowerCase());
    if (!matchesName) return false;

    if (tab === 'unread') return c.unreadCount > 0;
    if (tab === 'channels') return c.type === ConversationType.CHANNEL;
    if (tab === 'direct') return c.type === ConversationType.DIRECT;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            EC
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white leading-tight">ENTERPRISE CHAT</h1>
            <span className="text-[10px] text-slate-400 font-medium">v2.5 Next.js 15 Edition</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleCreateGroup(true)}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Tạo nhóm / kênh mới"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleSettings(true)}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Cài đặt giao diện & thông báo"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm kênh hoặc đồng nghiệp..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="px-3 py-1 flex items-center gap-1 border-b border-slate-800/60 text-xs">
        <button
          onClick={() => setTab('all')}
          className={`px-2 py-1 rounded-md transition-all ${
            tab === 'all'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setTab('channels')}
          className={`px-2 py-1 rounded-md transition-all ${
            tab === 'channels'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Kênh
        </button>
        <button
          onClick={() => setTab('direct')}
          className={`px-2 py-1 rounded-md transition-all ${
            tab === 'direct'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          Trực tiếp
        </button>
        <button
          onClick={() => setTab('unread')}
          className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
            tab === 'unread'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <span>Chưa đọc</span>
        </button>
      </div>

      {/* Conversation Scrollable List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Không tìm thấy cuộc trò chuyện nào
          </div>
        ) : (
          filteredConversations.map((c) => {
            const isActive = c.id === activeConversationId;
            const isChannel = c.type === ConversationType.CHANNEL;

            return (
              <button
                key={c.id}
                onClick={() => setActiveConversationId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {isChannel ? (
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Hash className="w-4 h-4" />
                    </div>
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                        isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-blue-400'
                      }`}
                    >
                      {c.name ? c.name.charAt(0) : 'U'}
                    </div>
                  )}

                  {!isChannel && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate leading-tight">
                      {isChannel ? `#${c.name}` : c.name}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full flex-shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p
                      className={`text-[11px] truncate mt-0.5 ${
                        isActive ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      {c.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
