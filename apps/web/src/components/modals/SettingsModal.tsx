'use client';

import React from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { X, Settings, Palette, Bell, Volume2, Globe } from 'lucide-react';
import { WallpaperThemeId } from '@enterprise-chat/shared-types';

export default function SettingsModal() {
  const { isSettingsOpen, toggleSettings, settings, updateSettings } = useChatStore();

  if (!isSettingsOpen) return null;

  const themes: { id: WallpaperThemeId; name: string; color: string }[] = [
    { id: 'dots', name: 'Mặc định Enterprise Blue', color: '#2563eb' },
    { id: 'dark', name: 'Tối huyền bí (Midnight Dark)', color: '#0f172a' },
    { id: 'indigo', name: 'Tím Viber (Viber Purple)', color: '#7c3aed' },
    { id: 'emerald', name: 'Xanh Bạc Hà (Emerald Mint)', color: '#059669' },
    { id: 'minimal', name: 'Tối giản (Minimal Clean)', color: '#475569' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Cài đặt hệ thống</h3>
          </div>
          <button
            onClick={() => toggleSettings(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          {/* Themes */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-3">
              <Palette className="w-4 h-4 text-blue-400" />
              <span>Chủ đề giao diện (Themes)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() =>
                    updateSettings({
                      appearance: { ...settings.appearance, themeId: t.id },
                    })
                  }
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    settings.appearance.themeId === t.id
                      ? 'border-blue-500 bg-blue-500/10 text-white font-medium'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-3">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>Thông báo & Âm thanh</span>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">Phát âm thanh tin nhắn</p>
                  <span className="text-[10px] text-slate-500">
                    Phát chuông thông báo khi gửi và nhận tin nhắn mới
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.playSound}
                  onChange={(e) =>
                    updateSettings({
                      notifications: {
                        ...settings.notifications,
                        playSound: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">Huy hiệu tin nhắn chưa đọc</p>
                  <span className="text-[10px] text-slate-500">
                    Hiển thị số lượng tin chưa đọc trên thanh tiêu đề và widget
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.unreadBadge}
                  onChange={(e) =>
                    updateSettings({
                      notifications: {
                        ...settings.notifications,
                        unreadBadge: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </div>
            </div>
          </div>

          {/* Language */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-3">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Ngôn ngữ & Hiển thị</span>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Ngôn ngữ ứng dụng</p>
                <span className="text-[10px] text-slate-500">Tiếng Việt (Mặc định)</span>
              </div>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium">
                Tiếng Việt
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => toggleSettings(false)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
