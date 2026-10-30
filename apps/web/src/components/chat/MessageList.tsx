'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import MessageItem from './MessageItem';
import { MessageSquare, ArrowDown, Loader2 } from 'lucide-react';
import { formatMessageDateLabel } from '@/lib/formatDate';

export default function MessageList() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const {
    messagesMap,
    activeConversationId,
    hasMoreMap,
    isLoadingOlder,
    fetchOlderMessages,
    t,
  } = useChatStore();

  const messages = (activeConversationId && messagesMap[activeConversationId]) || [];

  // Instant scroll to latest message when switching conversation or opening chat
  useEffect(() => {
    if (!activeConversationId) return;

    // Immediately snap to bottom
    const scrollToBottomInstant = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    };

    scrollToBottomInstant();
    const t1 = setTimeout(scrollToBottomInstant, 50);
    const t2 = setTimeout(scrollToBottomInstant, 150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeConversationId]);

  // Smooth scroll when new message is appended
  const prevCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevCountRef.current && !isLoadingOlder) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, isLoadingOlder]);

  // Track scroll position to show floating "Cuộn xuống" button and load older messages
  const handleScroll = async () => {
    if (!containerRef.current || !activeConversationId) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);

    // If user scrolled near top and more older messages exist, fetch them smoothly
    if (scrollTop < 80 && !isLoadingOlder && hasMoreMap[activeConversationId]) {
      const prevScrollHeight = scrollHeight;
      const loaded = await fetchOlderMessages(activeConversationId);
      if (loaded && containerRef.current) {
        // Keep user view anchored at the exact message they were looking at
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const newScrollHeight = containerRef.current.scrollHeight;
            containerRef.current.scrollTop = newScrollHeight - prevScrollHeight + scrollTop;
          }
        });
      }
    }
  };

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const hasMore = Boolean(activeConversationId && hasMoreMap[activeConversationId]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-3 space-y-1 relative"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-slate-300">{t('no_messages')}</h3>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            {t('no_messages_desc')}
          </p>
        </div>
      ) : (
        <>
          {/* Older Messages Loader */}
          {isLoadingOlder && (
            <div className="flex justify-center items-center py-2 gap-2 text-xs text-blue-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang tải tin nhắn trước đó...</span>
            </div>
          )}

          {!hasMore && messages.length >= 30 && (
            <div className="text-center py-2 text-[11px] text-slate-500 font-medium">
              Đầu cuộc trò chuyện
            </div>
          )}

          <div className="text-center py-2">
            <span className="text-[10px] text-slate-500 font-medium bg-slate-900/60 px-3 py-1 rounded-full border theme-border">
              {t('encrypted_badge')}
            </span>
          </div>

          {messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isDifferentDay =
              !prevMsg ||
              (() => {
                const d1 = new Date(prevMsg.createdAt);
                const d2 = new Date(msg.createdAt);
                if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
                  return false;
                }
                return d1.toDateString() !== d2.toDateString();
              })();

            return (
              <React.Fragment key={msg.id}>
                {isDifferentDay && (
                  <div className="flex justify-center my-3 select-none">
                    <span
                      suppressHydrationWarning
                      className="text-[10px] font-semibold text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-0.5 rounded-full shadow-sm"
                    >
                      {formatMessageDateLabel(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageItem message={msg} />
              </React.Fragment>
            );
          })}

          <div ref={bottomRef} className="h-1" />
        </>
      )}

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 z-30 p-2.5 theme-primary-bg text-white rounded-full shadow-xl flex items-center gap-1.5 text-xs font-semibold animate-in fade-in zoom-in duration-200 group border border-white/20"
          title={t('jump_latest')}
        >
          <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          <span className="pr-1 text-[11px]">{t('jump_latest')}</span>
        </button>
      )}
    </div>
  );
}
