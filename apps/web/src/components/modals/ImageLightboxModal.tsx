'use client';

import React from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { X, Download, ZoomIn } from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';

export default function ImageLightboxModal() {
  const { lightboxImage, setLightboxImage } = useChatStore();

  const { handleBackdropClick } = useModalDismiss({
    isOpen: !!lightboxImage,
    onClose: () => setLightboxImage(null),
  });

  if (!lightboxImage) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
      >
        {/* Top controls */}
        <div className="w-full flex items-center justify-between pb-3 text-slate-300">
          <span className="text-xs font-semibold flex items-center gap-1 text-slate-400">
            <ZoomIn className="w-4 h-4 text-blue-400" /> Xem chi tiết hình ảnh
          </span>
          <div className="flex items-center gap-2">
            <a
              href={lightboxImage}
              download="image.png"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 text-xs px-2.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải về</span>
            </a>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main image */}
        <div className="rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex items-center justify-center">
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-h-[80vh] max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
