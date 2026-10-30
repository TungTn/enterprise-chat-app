'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  Sparkles,
  X,
  CheckSquare,
  Copy,
  Send,
  Loader2,
  Key,
  ExternalLink,
  CheckCircle2,
  Bot,
  BrainCircuit,
  Calendar,
  Users,
  MessageSquare,
} from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';

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

  const { handleBackdropClick } = useModalDismiss({
    isOpen: isAiSummaryOpen,
    onClose: () => toggleAiSummary(false),
  });

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('enterprise_gemini_api_key');
      setSavedKey(key);
      if (key) setApiKeyInput(key);
    }
  }, [isAiSummaryOpen]);

  if (!isAiSummaryOpen) return null;

  const handleSaveApiKey = () => {
    if (typeof window !== 'undefined') {
      if (apiKeyInput.trim()) {
        localStorage.setItem('enterprise_gemini_api_key', apiKeyInput.trim());
        setSavedKey(apiKeyInput.trim());
      } else {
        localStorage.removeItem('enterprise_gemini_api_key');
        setSavedKey(null);
      }
      setShowKeyConfig(false);
    }
  };

  const handlePostToChat = () => {
    if (!currentAiSummary || !activeConversationId) return;

    const checklistMarkdown = [
      `🤖 **[Tóm Tắt Cuộc Trò Chuyện Bằng ${
        currentAiSummary.modelUsed === 'gemini-2.5-flash' ? 'Google Gemini AI' : 'AI Nội Bộ'
      }]**`,
      `**Chủ đề:** ${currentAiSummary.topic}`,
      ``,
      `**Điểm mấu chốt:**`,
      ...currentAiSummary.keyPoints.map((p) => `• ${p}`),
      ``,
      currentAiSummary.decisions && currentAiSummary.decisions.length > 0
        ? `**Quyết định quan trọng:**\n` +
          currentAiSummary.decisions.map((d) => `✓ ${d}`).join('\n') +
          '\n'
        : '',
      `**Nhiệm vụ tiếp theo (Action Checklist):**`,
      ...currentAiSummary.actionItems.map(
        (a) => `${a.status === 'done' ? '☑' : '☐'} ${a.task}`
      ),
    ]
      .filter(Boolean)
      .join('\n');

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
      currentAiSummary.decisions && currentAiSummary.decisions.length > 0
        ? `Quyết định:\n` + currentAiSummary.decisions.map((d) => `- ${d}`).join('\n')
        : '',
      `Nhiệm vụ:\n` + currentAiSummary.actionItems.map((a) => `- [ ] ${a.task}`).join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white leading-tight">
                  Tóm Tắt Hội Thoại Thông Minh
                </h3>
                {currentAiSummary?.modelUsed === 'gemini-2.5-flash' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                    Gemini 2.5 Flash
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                    <BrainCircuit className="w-2.5 h-2.5 text-cyan-400" />
                    NLP Thông Minh
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Tự động phân tích hội thoại & trích xuất hành động thông minh
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className={`p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                savedKey
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
              title="Cấu hình Google Gemini API Key"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">
                {savedKey ? 'Gemini OK' : 'Thêm API Key'}
              </span>
            </button>
            <button
              onClick={() => toggleAiSummary(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* API Key Inline Configuration Drawer */}
        {showKeyConfig && (
          <div className="p-3 bg-purple-950/20 border-b border-purple-900/30 text-xs space-y-2 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-purple-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-purple-400" />
                Google Gemini API Key
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
              >
                Lấy Key miễn phí từ Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Nhập AIzaSy... (Để trống nếu dùng NLP mặc định)"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-xs"
              >
                Lưu
              </button>
            </div>
          </div>
        )}

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
                AI sẽ trích xuất vấn đề cốt lõi, các quyết định quan trọng và danh sách công việc cần làm từ tin nhắn thực tế.
              </p>
              <div className="flex justify-center pt-2">
                <button
                  onClick={generateAiSummary}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu tóm tắt AI</span>
                </button>
              </div>
            </div>
          )}

          {isGeneratingSummary && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              <p className="font-medium text-slate-300">Đang đọc toàn bộ tin nhắn và phân tích dữ liệu...</p>
              <span className="text-[11px] text-slate-500">
                {savedKey ? 'Đang gửi prompt tới Google Gemini 2.5 Flash...' : 'Đang xử lý qua bộ phân tích ngôn ngữ tự nhiên...'}
              </span>
            </div>
          )}

          {currentAiSummary && !isGeneratingSummary && (
            <div className="space-y-4">
              {/* Metrics Header */}
              {currentAiSummary.metrics && (
                <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-400 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      <strong className="text-slate-200">{currentAiSummary.metrics.messageCount}</strong> tin nhắn
                    </span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      <strong className="text-slate-200">{currentAiSummary.metrics.participantCount}</strong> người tham gia
                    </span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>{currentAiSummary.metrics.timeRange}</span>
                  </div>
                </div>
              )}

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
                  Điểm mấu chốt đã thảo luận
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

              {/* Decisions if present */}
              {currentAiSummary.decisions && currentAiSummary.decisions.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                    Các quyết định đã chốt
                  </span>
                  <div className="space-y-1.5">
                    {currentAiSummary.decisions.map((d, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-950 border border-emerald-900/30 rounded-lg text-slate-200 leading-relaxed flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action checklist */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Nhiệm vụ tiếp theo (Action Items)
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 font-medium transition-all"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
              <button
                onClick={generateAiSummary}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 flex items-center gap-1.5 font-medium text-[11px]"
                title="Tạo lại bản tóm tắt"
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Tóm tắt lại</span>
              </button>
            </div>

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
