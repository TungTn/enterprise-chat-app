'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { X, Forward, Check, Hash } from 'lucide-react';
import { ConversationType } from '@enterprise-chat/shared-types';
import { useModalDismiss } from '@/hooks/useModalDismiss';

export default function ForwardMessageModal() {
  const {
    isForwardOpen,
    toggleForward,
    messageToForward,
    setMessageToForward,
    conversations,
    sendMessage,
  } = useChatStore();

  const { handleBackdropClick } = useModalDismiss({
    isOpen: isForwardOpen,
    onClose: () => {
      toggleForward(false);
      setMessageToForward(null);
    },
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isForwardOpen || !messageToForward) return null;

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleForward = () => {
    if (selectedIds.length === 0) return;

    selectedIds.forEach((convId) => {
      sendMessage({
        conversationId: convId,
        content: messageToForward.content,
      });
    });

    setSelectedIds([]);
    setMessageToForward(null);
    toggleForward(false);
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Forward className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Chuyển tiếp tin nhắn</h3>
          </div>
          <button
            onClick={() => {
              toggleForward(false);
              setMessageToForward(null);
            }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {/* Snippet */}
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300">
            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
              Nội dung chuyển tiếp từ {messageToForward.senderName}:
            </span>
            <p className="truncate">{messageToForward.content}</p>
          </div>

          <label className="font-semibold text-slate-300 block">Chọn điểm đến ({selectedIds.length})</label>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {conversations.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {c.type === ConversationType.CHANNEL ? (
                      <Hash className="w-4 h-4 text-slate-400" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-blue-600/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">
                        {c.name?.charAt(0)}
                      </span>
                    )}
                    <span className="font-medium truncate">{c.name}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                toggleForward(false);
                setMessageToForward(null);
              }}
              className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleForward}
              disabled={selectedIds.length === 0}
              className={`px-5 py-2 rounded-xl font-semibold shadow-md ${
                selectedIds.length > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Chuyển tiếp ({selectedIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
