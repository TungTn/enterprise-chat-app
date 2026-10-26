'use client';

import React from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { Sparkles, X, CheckSquare, Copy, Send, Loader2 } from 'lucide-react';

export default function AiSummaryModal() {
  const {
    isAiSummaryOpen,
    toggleAiSummary,
    isGeneratingSummary,
    currentAiSummary,
    generateAiSummary,
    sendMessage,
    activeConversationId,
  } = useChatStore();

  if (!isAiSummaryOpen) return null;

  const handlePostToChat = () => {
    if (!currentAiSummary || !activeConversationId) return;

    const checklistMarkdown = [
      `🤖 **[Tóm Tắt Cuộc Trò Chuyện Bằng AI]**`,
      `**Chủ đề:** ${currentAiSummary.topic}`,
      ``,
      `**Điểm mấu chốt:**`,
      ...currentAiSummary.keyPoints.map((p) => `• ${p}`),
      ``,
      `**Nhiệm vụ tiếp theo (Action Checklist):**`,
      ...currentAiSummary.actionItems.map(
        (a) => `${a.status === 'done' ? '☑' : '☐'} ${a.task}`
      ),
    ].join('\n');

    sendMessage({
      conversationId: activeConversationId,
      content: checklistMarkdown,
    });

    toggleAiSummary(false);
  };

  const handleCopy = () => {
    if (!currentAiSummary) return;
    const text = [
      `Chủ đề: ${currentAiSummary.topic}`,
      `Điểm chính:\n` + currentAiSummary.keyPoints.map((p) => `- ${p}`).join('\n'),
      `Nhiệm vụ:\n` + currentAiSummary.actionItems.map((a) => `- [ ] ${a.task}`).join('\n'),
    ].join('\n\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white leading-tight">
                AI Conversation Summary
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Tự động phân tích & trích xuất hành động thông minh
              </span>
            </div>
          </div>
          <button
            onClick={() => toggleAiSummary(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {!currentAiSummary && !isGeneratingSummary && (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-200 text-sm">
                Sẵn sàng phân tích cuộc trò chuyện
              </h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                AI sẽ trích xuất vấn đề cốt lõi, các quyết định quan trọng và danh sách công việc cần làm từ dòng tin nhắn.
              </p>
              <button
                onClick={generateAiSummary}
                className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-2 mx-auto"
              >
                <Sparkles className="w-4 h-4" />
                <span>Bắt đầu tóm tắt</span>
              </button>
            </div>
          )}

          {isGeneratingSummary && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              <p className="font-medium text-slate-300">Đang phân tích các tin nhắn và tổng hợp...</p>
            </div>
          )}

          {currentAiSummary && !isGeneratingSummary && (
            <div className="space-y-4">
              {/* Topic Box */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                  Chủ đề thảo luận
                </span>
                <p className="font-bold text-slate-200 text-sm leading-tight">
                  {currentAiSummary.topic}
                </p>
              </div>

              {/* Key points */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  5 Điểm mấu chốt đã thống nhất
                </span>
                <div className="space-y-1.5">
                  {currentAiSummary.keyPoints.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-purple-400 font-bold">•</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action checklist */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Nhiệm vụ tiếp theo (Action Checklist)
                </span>
                <div className="space-y-1.5">
                  {currentAiSummary.actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare
                          className={`w-4 h-4 ${
                            item.status === 'done' ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        />
                        <span
                          className={`font-medium ${
                            item.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {item.task}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          item.status === 'done'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {item.status === 'done' ? 'Đã xong' : 'Đang xử lý'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {currentAiSummary && !isGeneratingSummary && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép</span>
            </button>

            <button
              onClick={handlePostToChat}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi vào nhóm chat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
