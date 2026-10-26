'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { Pin, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function PinnedMessageBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { messagesMap, activeConversationId, togglePinMessage } = useChatStore();

  const currentMessages = (activeConversationId && messagesMap[activeConversationId]) || [];
  const pinnedMessages = currentMessages.filter((m) => m.isPinned);

  if (pinnedMessages.length === 0) return null;

  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-xs px-4 py-2 text-slate-200 transition-all select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="font-semibold text-amber-400 flex-shrink-0">
            Tin nhắn đã ghim ({pinnedMessages.length}):
          </span>
          <span className="font-medium text-slate-300 truncate">
            <b>{latestPinned.senderName}:</b> {latestPinned.content}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {pinnedMessages.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-amber-500/20 rounded text-amber-400"
              title={isExpanded ? 'Thu gọn' : 'Xem tất cả tin nhắn ghim'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => togglePinMessage(latestPinned.id)}
            className="p-1 hover:bg-amber-500/20 rounded text-slate-400 hover:text-white"
            title="Bỏ ghim"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && pinnedMessages.length > 1 && (
        <div className="mt-2 pt-2 border-t border-amber-500/20 space-y-1.5 max-h-36 overflow-y-auto">
          {pinnedMessages.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-xs py-0.5">
              <span className="truncate">
                <span className="text-amber-400 font-medium">{m.senderName}:</span>{' '}
                <span className="text-slate-300">{m.content}</span>
              </span>
              <button
                onClick={() => togglePinMessage(m.id)}
                className="text-[10px] text-slate-400 hover:text-red-400 ml-2 flex-shrink-0"
              >
                Bỏ ghim
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
