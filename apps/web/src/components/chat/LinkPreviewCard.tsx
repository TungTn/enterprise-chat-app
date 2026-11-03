'use client';

import React, { useState } from 'react';
import { LinkPreviewMetadata } from '@enterprise-chat/shared-types';
import { ExternalLink, Globe, Utensils, ShoppingBag } from 'lucide-react';

interface LinkPreviewCardProps {
  preview?: LinkPreviewMetadata | null;
  isSelf?: boolean;
}

export default function LinkPreviewCard({ preview, isSelf }: LinkPreviewCardProps) {
  const [imageError, setImageError] = useState(false);

  if (!preview || !preview.url) return null;

  // Detect domain brand for custom styling (Grab, Shopee, Baemin, etc.)
  const lowerUrl = preview.url.toLowerCase();
  const isGrab = lowerUrl.includes('grab.com');
  const isShopee = lowerUrl.includes('shopee.vn') || lowerUrl.includes('shopee.com');

  // Extract clean hostname for display
  let displayHost = preview.siteName || '';
  try {
    const parsed = new URL(preview.url);
    if (!displayHost || displayHost === parsed.hostname) {
      displayHost = parsed.hostname.replace(/^www\./i, '');
    }
  } catch {
    displayHost = preview.siteName || 'Website';
  }

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(preview.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={handleCardClick}
      className={`mt-2 rounded-xl border overflow-hidden max-w-sm transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md group text-left ${
        isSelf
          ? 'bg-blue-800/80 border-blue-400/40 hover:border-white/60 hover:bg-blue-800'
          : 'bg-slate-900/90 border-slate-700/60 hover:border-slate-500 hover:bg-slate-900'
      }`}
    >
      {/* Banner / OpenGraph Image */}
      {preview.imageUrl && !imageError && (
        <div className="relative w-full h-44 bg-slate-950 overflow-hidden flex items-center justify-center">
          <img
            src={preview.imageUrl}
            alt={preview.title || 'Preview image'}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Brand Overlay Badge (if Grab or Shopee) */}
          {isGrab && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow">
              <Utensils className="w-3 h-3" />
              <span>Grab</span>
            </div>
          )}
          {isShopee && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-orange-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow">
              <ShoppingBag className="w-3 h-3" />
              <span>Shopee</span>
            </div>
          )}
        </div>
      )}

      {/* Content Meta Section */}
      <div className="p-3 space-y-1.5">
        {/* Site Name & Favicon */}
        <div className="flex items-center gap-1.5 text-[11px] opacity-75 font-medium truncate">
          {preview.favIcon ? (
            <img
              src={preview.favIcon}
              alt=""
              className="w-3.5 h-3.5 rounded-xs object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span className="truncate">{displayHost}</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>

        {/* Title */}
        {preview.title && (
          <h4
            className={`font-semibold text-xs leading-snug line-clamp-2 ${
              isSelf ? 'text-white' : 'text-slate-100 group-hover:text-blue-300'
            }`}
          >
            {preview.title}
          </h4>
        )}

        {/* Description snippet */}
        {preview.description && (
          <p
            className={`text-[11px] leading-relaxed line-clamp-2 ${
              isSelf ? 'text-blue-100/90' : 'text-slate-400'
            }`}
          >
            {preview.description}
          </p>
        )}

        {/* Deep link button CTA */}
        <div className="pt-1.5 flex items-center justify-between border-t border-white/10 mt-2">
          <span className={`text-[10px] truncate max-w-[200px] opacity-75 font-mono`}>
            {preview.url.replace(/^https?:\/\//i, '')}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
              isGrab
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-xs'
                : isShopee
                ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-xs'
                : isSelf
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isGrab ? 'Mở Grab ➔' : isShopee ? 'Mở Shopee ➔' : 'Mở liên kết ➔'}
          </span>
        </div>
      </div>
    </div>
  );
}
