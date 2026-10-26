'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import ConversationList from '@/components/chat/ConversationList';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import InfoPanel from '@/components/chat/InfoPanel';
import PinnedMessageBar from '@/components/chat/PinnedMessageBar';
import InChatSearchBar from '@/components/chat/InChatSearchBar';
import FloatingChatWidget from '@/components/chat/FloatingChatWidget';

// Modals
import AiSummaryModal from '@/components/modals/AiSummaryModal';
import CallModal from '@/components/modals/CallModal';
import CreatePollModal from '@/components/modals/CreatePollModal';
import CreateGroupModal from '@/components/modals/CreateGroupModal';
import SettingsModal from '@/components/modals/SettingsModal';
import ForwardMessageModal from '@/components/modals/ForwardMessageModal';
import StarredMessagesModal from '@/components/modals/StarredMessagesModal';

import {
  Phone,
  Video,
  Info,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  Monitor,
  MessageSquare,
  Hash,
} from 'lucide-react';
import { ConversationType } from '@enterprise-chat/shared-types';

export default function ChatApp() {
  const [viewMode, setViewMode] = useState<'full' | 'widget_showcase'>('full');

  const {
    currentUser,
    conversations,
    activeConversationId,
    isInfoPanelOpen,
    toggleInfoPanel,
    toggleSearch,
    startCall,
    toggleAiSummary,
    settings,
    updateSettings,
    toggleQuickWidget,
    initAuth,
  } = useChatStore();

  useEffect(() => {
    initAuth();
  }, []);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const toggleSound = () => {
    updateSettings({
      notifications: {
        ...settings.notifications,
        playSound: !settings.notifications.playSound,
      },
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Navigation Global Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between flex-shrink-0 z-40 select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              EC
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-white">ENTERPRISE CHAT</span>
              <span className="text-[10px] text-slate-400 font-semibold ml-2 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                v2.5
              </span>
            </div>
          </div>

          {/* Dual-View Mode Switcher */}
          <div className="hidden sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'full'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toàn màn hình
            </button>
            <button
              onClick={() => {
                setViewMode('widget_showcase');
                toggleQuickWidget(true);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'widget_showcase'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cửa sổ nổi (Widget)
            </button>
          </div>
        </div>

        {/* Right Top Bar Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all ${
              settings.notifications.playSound
                ? 'border-slate-700 text-slate-300 hover:text-white bg-slate-800/80'
                : 'border-red-500/30 text-red-400 bg-red-500/10'
            }`}
            title={settings.notifications.playSound ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {settings.notifications.playSound ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* User Profile Pill */}
          {currentUser && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
              <div className="relative">
                <img
                  src={currentUser.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'}
                  alt={currentUser.fullName}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-semibold text-white leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Trực tuyến</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main View Area */}
      {viewMode === 'full' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Conversation Directory */}
          <div className="w-72 sm:w-80 flex-shrink-0 h-full">
            <ConversationList />
          </div>

          {/* Middle Column: Chat Main Stage */}
          <div className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
            {activeConv ? (
              <>
                {/* Active Chat Header */}
                <div className="h-14 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-shrink-0 z-20">
                  <div
                    onClick={() => toggleInfoPanel()}
                    className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                      {activeConv.type === ConversationType.CHANNEL ? (
                        <Hash className="w-4 h-4" />
                      ) : (
                        activeConv.name?.charAt(0) || 'C'
                      )}
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-white leading-tight">
                        {activeConv.type === ConversationType.CHANNEL ? `#${activeConv.name}` : activeConv.name}
                      </h2>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {activeConv.type === ConversationType.CHANNEL
                          ? 'Kênh nội bộ • Trực tuyến'
                          : 'Đang hoạt động'}
                      </span>
                    </div>
                  </div>

                  {/* Header Quick Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startCall('audio')}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Bắt đầu cuộc gọi thoại"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startCall('video')}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                      title="Bắt đầu cuộc gọi video"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleSearch()}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Tìm kiếm từ khóa trong chat"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleAiSummary(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-purple-500/20"
                      title="Tóm tắt cuộc trò chuyện bằng AI (Smart Summary)"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">AI Summary</span>
                    </button>
                    <button
                      onClick={() => toggleInfoPanel()}
                      className={`p-2 rounded-lg transition-colors ${
                        isInfoPanelOpen
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="Chi tiết hội thoại & tài liệu"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Top Pinned Messages Ticker */}
                <PinnedMessageBar />

                {/* Keyword Search Bar */}
                <InChatSearchBar />

                {/* Message Stream */}
                <MessageList />

                {/* Input Console */}
                <MessageInput />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <MessageSquare className="w-12 h-12 mb-3 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-300">Chọn một cuộc trò chuyện</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Chọn kênh hoặc người đồng nghiệp bên cột trái để bắt đầu trao đổi công việc.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Info & Media Drawer */}
          {isInfoPanelOpen && <InfoPanel />}
        </div>
      ) : (
        /* Widget Showcase Mode */
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center select-none">
          <div className="max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">Chế độ Cửa sổ Chat Nổi (Floating Widget)</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tiện ích chat nổi luôn thường trực ở góc dưới bên phải màn hình. Nhân viên có thể vừa thao tác duyệt hồ sơ, xử lý nghiệp vụ chính vừa trao đổi nhanh mà không bị che khuất màn hình.
            </p>
            <div className="pt-2">
              <button
                onClick={() => toggleQuickWidget(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all"
              >
                Mở hộp chat nổi ngay bây giờ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Widget (Always available at bottom right) */}
      <FloatingChatWidget />

      {/* System Modals */}
      <AiSummaryModal />
      <CallModal />
      <CreatePollModal />
      <CreateGroupModal />
      <SettingsModal />
      <ForwardMessageModal />
      <StarredMessagesModal />
    </div>
  );
}
