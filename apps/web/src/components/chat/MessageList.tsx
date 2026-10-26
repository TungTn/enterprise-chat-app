'use client';

import React, { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import MessageItem from './MessageItem';
import { MessageSquare } from 'lucide-react';

export default function MessageList() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messagesMap, activeConversationId } = useChatStore();

  const messages = (activeConversationId && messagesMap[activeConversationId]) || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto py-3 space-y-1">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-slate-300">Chưa có tin nhắn nào</h3>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện với đồng nghiệp!
          </p>
        </div>
      ) : (
        <>
          <div className="text-center py-2">
            <span className="text-[10px] text-slate-500 font-medium bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
              Đầu cuộc trò chuyện được mã hóa & lưu trữ an toàn
            </span>
          </div>

          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}

          <div ref={bottomRef} />
        </>
      )}
    </div>
  );
}
