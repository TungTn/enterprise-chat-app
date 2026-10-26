'use client';

import React from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

export default function InChatSearchBar() {
  const { isSearchOpen, toggleSearch, searchQuery, setSearchQuery } = useChatStore();

  if (!isSearchOpen) return null;

  return (
    <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-3 text-xs z-20">
      <div className="flex items-center gap-2 flex-1">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm từ khóa trong cuộc trò chuyện..."
          autoFocus
          className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none flex-1"
        />
      </div>

      <div className="flex items-center gap-1 text-slate-400">
        <button
          className="p-1 hover:bg-slate-800 rounded hover:text-white"
          title="Kết quả trước"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1 hover:bg-slate-800 rounded hover:text-white"
          title="Kết quả tiếp theo"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setSearchQuery('');
            toggleSearch(false);
          }}
          className="p-1 hover:bg-slate-800 rounded hover:text-white ml-2"
          title="Đóng tìm kiếm"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
