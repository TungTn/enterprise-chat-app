'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface Props {
  isOpen: boolean;
  imageUrl: string | null;
  fileName?: string;
  fileSizeBytes?: number;
  onClose: () => void;
  onSend: (caption: string) => void;
}

export default function ImagePastePreviewModal({
  isOpen,
  imageUrl,
  fileName = 'Ảnh chụp màn hình',
  fileSizeBytes,
  onClose,
  onSend,
}: Props) {
  const [caption, setCaption] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { handleBackdropClick } = useModalDismiss({
    isOpen,
    onClose,
  });

  // Reset caption & autofocus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setCaption('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSend(caption.trim());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const formattedSize = fileSizeBytes
    ? fileSizeBytes > 1024 * 1024
      ? `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(fileSizeBytes / 1024).toFixed(0)} KB`
    : null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white">Gửi hình ảnh</h3>
              <p className="text-[10px] text-slate-400">
                {fileName} {formattedSize ? `• ${formattedSize}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image Preview Box */}
        <div className="p-4 bg-slate-950/90 flex items-center justify-center max-h-[55vh] overflow-hidden">
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-[50vh] max-w-full object-contain rounded-xl shadow-md border border-slate-800/80"
          />
        </div>

        {/* Caption Input & Action Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Thêm chú thích cho ảnh này... (Nhấn Enter để gửi)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
              Enter ↵
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500">
              Nhấn <strong>Esc</strong> để hủy • <strong>Enter</strong> để gửi
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => onSend(caption.trim())}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi ảnh</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
