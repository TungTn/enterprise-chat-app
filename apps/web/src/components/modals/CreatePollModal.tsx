'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';
import { MessageType } from '@enterprise-chat/shared-types';

export default function CreatePollModal() {
  const { isCreatePollOpen, toggleCreatePoll, sendMessage, activeConversationId } = useChatStore();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['Đồng ý', 'Cần thảo luận thêm']);
  const [isMultiple, setIsMultiple] = useState(false);

  if (!isCreatePollOpen) return null;

  const handleAddOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (val: string, index: number) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !activeConversationId) return;

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) return;

    const pollData = {
      id: `poll-${Date.now()}`,
      question: question.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt-${idx + 1}`,
        text,
        voterIds: [],
        voterNames: [],
      })),
      isMultiple,
      totalVotes: 0,
    };

    sendMessage({
      conversationId: activeConversationId,
      content: question.trim(),
      type: MessageType.POLL,
      poll: pollData,
    });

    toggleCreatePoll(false);
    setQuestion('');
    setOptions(['Đồng ý', 'Cần thảo luận thêm']);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Tạo khảo sát bình chọn</h3>
          </div>
          <button
            onClick={() => toggleCreatePoll(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {/* Question */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Câu hỏi khảo sát</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="VD: Thời điểm release phiên bản 2.0?"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Options */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Các lựa chọn</label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(e.target.value, idx)}
                    placeholder={`Lựa chọn ${idx + 1}`}
                    required
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 8 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm lựa chọn</span>
              </button>
            )}
          </div>

          {/* Multiple choice switch */}
          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <p className="font-semibold text-slate-200">Cho phép chọn nhiều phương án</p>
              <span className="text-[10px] text-slate-500">Người bình chọn có thể chọn nhiều hơn 1 mục</span>
            </div>
            <input
              type="checkbox"
              checked={isMultiple}
              onChange={(e) => setIsMultiple(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => toggleCreatePoll(false)}
              className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/20"
            >
              Tạo cuộc khảo sát
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
