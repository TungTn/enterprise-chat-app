'use client';

import React from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { X, Star, Trash2 } from 'lucide-react';

export default function StarredMessagesModal() {
  const { isStarredOpen, toggleStarred, messagesMap, activeConversationId, toggleStarMessage } =
    useChatStore();

  if (!isStarredOpen) return null;

  const currentMessages = (activeConversationId && messagesMap[activeConversationId]) || [];
  const starred = currentMessages.filter((m) => m.isStarred);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <h3 className="font-bold text-sm text-white">Tin nhắn đã đánh dấu sao</h3>
          </div>
          <button
            onClick={() => toggleStarred(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 text-xs max-h-80 overflow-y-auto">
          {starred.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Chưa có tin nhắn nào được đánh dấu sao trong cuộc trò chuyện này
            </div>
          ) : (
            starred.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{m.senderName}</span>
                  <span className="text-[10px] text-slate-500">{m.createdAt}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{m.content}</p>
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => toggleStarMessage(m.id)}
                    className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Bỏ đánh dấu</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => toggleStarred(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
