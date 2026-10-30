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
import IncomingCallModal from '@/components/modals/IncomingCallModal';
import CreatePollModal from '@/components/modals/CreatePollModal';
import CreateGroupModal from '@/components/modals/CreateGroupModal';
import SettingsModal from '@/components/modals/SettingsModal';
import ForwardMessageModal from '@/components/modals/ForwardMessageModal';
import StarredMessagesModal from '@/components/modals/StarredMessagesModal';
import GroupManagementModal from '@/components/modals/GroupManagementModal';
import ImageLightboxModal from '@/components/modals/ImageLightboxModal';
import AuthModal from '@/components/modals/AuthModal';
import ReadReceiptsModal from '@/components/modals/ReadReceiptsModal';

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
  Star,
  Users,
  Settings,
  LogOut,
  LogIn,
  ChevronDown,
  ChevronLeft,
  MoreVertical,
  UserCheck,
  Building,
  Check,
  FolderOpen,
  Lock,
  KeyRound,
} from 'lucide-react';
import { ConversationType, PresenceStatus, UserRole } from '@enterprise-chat/shared-types';

export default function ChatApp() {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'widget_showcase'>('full');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);
  const [isChatActionsOpen, setIsChatActionsOpen] = useState(false);

  const {
    currentUser,
    setCurrentUser,
    conversations,
    activeConversationId,
    isInfoPanelOpen,
    infoPanelTab,
    toggleInfoPanel,
    openMediaPanel,
    toggleSearch,
    startCall,
    toggleAiSummary,
    toggleStarred,
    toggleGroupManagement,
    settings,
    updateSettings,
    toggleSettings,
    toggleQuickWidget,
    initAuth,
    toggleAuthModal,
    logout,
    updateUserProfile,
    isScreenLocked,
    setScreenLocked,
    callNotice,
    t,
  } = useChatStore();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isEmb = params.get('embedded') === 'true' || window.self !== window.top;
      setIsEmbedded(isEmb);

      // Check query params for instant BPM SSO login
      const bpmUser = params.get('bpm_user');
      const bpmName = params.get('bpm_name');
      const bpmPhone = params.get('bpm_phone');
      const bpmToken = params.get('bpm_token');

      if (bpmUser) {
        useChatStore.getState().setWebHostUser(bpmUser);
        const targetEmail = `${bpmUser}@mic.vn`.toLowerCase();
        const { currentUser: current, token: currentToken } = useChatStore.getState();
        if (!current || !currentToken || current.email?.toLowerCase() !== targetEmail) {
          useChatStore.getState().ssoBpmLogin(
            {
              username: bpmUser,
              fullName: bpmName || bpmUser,
              phoneNumber: bpmPhone || undefined,
              email: targetEmail,
            },
            bpmToken || undefined
          );
        }
      }

      const handleGatewayMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'MIC_GATEWAY_AUTH') {
          const { user, token } = event.data.payload || {};
          if (user) {
            const hostUser = user.username || user.code || user.sub;
            if (hostUser) {
              useChatStore.getState().setWebHostUser(hostUser);
            }
            console.log('[EnterpriseChat] Received auth from Gateway:', hostUser || user?.fullName);
            const targetEmail = (user.email || (hostUser ? `${hostUser}@mic.vn` : '')).toLowerCase();
            const { currentUser: current, token: currentToken } = useChatStore.getState();
            if (!current || !currentToken || (targetEmail && current.email?.toLowerCase() !== targetEmail)) {
              await useChatStore.getState().ssoBpmLogin(user, token);
            }
          }
        }
      };
      window.addEventListener('message', handleGatewayMessage);
      if (isEmb) {
        window.parent.postMessage({ type: 'MIC_CHAT_REQUEST_AUTH' }, '*');
      }
      return () => window.removeEventListener('message', handleGatewayMessage);
    }
  }, []);

  useEffect(() => {
    initAuth();
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', settings.appearance?.themeId || 'dots');
      document.documentElement.setAttribute('lang', settings.account?.language || 'vi');
    }
  }, [settings.appearance?.themeId, settings.account?.language]);

  // Auto-refresh conversations when window gains focus or tab becomes visible
  useEffect(() => {
    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const { token } = useChatStore.getState();
        if (token) {
          useChatStore.getState().fetchConversations();
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Responsive narrow detection (e.g. inside compact floating widget bubble or mobile screens)
  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 640);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // When active conversation changes, hide mobile list to show the chat
  useEffect(() => {
    if (activeConversationId) {
      setShowMobileList(false);
    }
  }, [activeConversationId]);

  // Post unread count to parent window (BPM Gateway Floating Bubble)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      window.parent.postMessage(
        {
          type: 'MIC_CHAT_UNREAD_COUNT',
          unreadCount: totalUnread,
        },
        '*'
      );
    }
  }, [conversations]);

  // Listen for logout command from parent host (BPM Portal)
  useEffect(() => {
    const handleParentMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MIC_CHAT_LOGOUT') {
        logout();
      }
      if (event.data?.type === 'MIC_BUBBLE_VISIBILITY') {
        const isOpen = Boolean(event.data.isOpen);
        useChatStore.getState().setIsBubbleOpen(isOpen);
        if (isOpen && activeConversationId) {
          useChatStore.getState().markConversationAsRead(activeConversationId);
        }
      }
    };
    window.addEventListener('message', handleParentMessage);
    return () => window.removeEventListener('message', handleParentMessage);
  }, [logout, activeConversationId]);

  // Close profile dropdown or chat actions on Escape
  useEffect(() => {
    if (!isProfileMenuOpen && !isChatActionsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileMenuOpen(false);
        setIsChatActionsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileMenuOpen, isChatActionsOpen]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const toggleSound = () => {
    updateSettings({
      notifications: {
        ...settings.notifications,
        playSound: !settings.notifications.playSound,
      },
    });
  };

  if (!mounted) {
    return (
      <div className="flex h-full w-full min-h-screen items-center justify-center bg-slate-950 text-slate-400 select-none" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-400">Đang khởi tạo Trò chuyện...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${isEmbedded ? 'h-full w-full' : 'h-screen w-screen'} overflow-hidden theme-bg-root text-slate-100 font-sans antialiased`}
      data-theme={settings.appearance?.themeId || 'dots'}
      suppressHydrationWarning
    >
      {/* Top Navigation Global Header */}
      {!isEmbedded && (
      <header className="h-14 border-b theme-border theme-bg-header px-4 flex items-center justify-between flex-shrink-0 z-40 select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-primary-bg flex items-center justify-center font-bold text-white shadow-lg">
              EC
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-white">ENTERPRISE CHAT</span>
              <span className="text-[10px] text-slate-400 font-semibold ml-2 bg-slate-800/80 px-2 py-0.5 rounded-full border theme-border">
                v2.5
              </span>
            </div>
          </div>

          {/* Dual-View Mode Switcher */}
          <div className="hidden sm:flex items-center bg-slate-950/60 p-1 rounded-xl border theme-border text-xs">
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'full'
                  ? 'theme-primary-bg text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('mode_fullscreen')}
            </button>
            <button
              onClick={() => {
                setViewMode('widget_showcase');
                toggleQuickWidget(true);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'widget_showcase'
                  ? 'theme-primary-bg text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('mode_widget')}
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
            title={settings.notifications.playSound ? t('sound_mute') : t('sound_unmute')}
          >
            {settings.notifications.playSound ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* User Profile Pill or Login Button */}
          {currentUser ? (
            <div className="relative pl-3 border-l border-slate-800">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                      currentUser.status === PresenceStatus.ONLINE
                        ? 'bg-emerald-500'
                        : currentUser.status === PresenceStatus.AWAY
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-semibold text-white leading-tight">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    {currentUser.status === PresenceStatus.ONLINE
                      ? t('status_online')
                      : currentUser.status === PresenceStatus.AWAY
                      ? t('status_away')
                      : t('status_busy')}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </span>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 theme-bg-card border theme-border rounded-2xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Info Header */}
                    <div className="flex items-center gap-3 p-2 bg-slate-950/70 rounded-xl border theme-border mb-3">
                      <img
                        src={currentUser.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'}
                        alt={currentUser.fullName}
                        className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-white truncate">
                          {currentUser.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {currentUser.email}
                        </div>
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="w-3 h-3" />
                          <span>{currentUser.phoneNumber || t('profile_no_phone')}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {currentUser.role === UserRole.SUPER_ADMIN
                              ? 'Admin'
                              : currentUser.role === UserRole.DEPARTMENT_MANAGER
                              ? 'Manager'
                              : 'Staff'}
                          </span>
                          {currentUser.departmentName && (
                            <span className="text-[10px] text-slate-400 truncate">
                              • {currentUser.departmentName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Selectors */}
                    <div className="space-y-1 mb-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                        {t('status_activity')}
                      </div>
                      <button
                        onClick={() => {
                          updateUserProfile({ status: PresenceStatus.ONLINE });
                          setIsProfileMenuOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          currentUser.status === PresenceStatus.ONLINE ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{t('status_online_full')}</span>
                        </div>
                        {currentUser.status === PresenceStatus.ONLINE && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          updateUserProfile({ status: PresenceStatus.AWAY });
                          setIsProfileMenuOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          currentUser.status === PresenceStatus.AWAY ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>{t('status_away_full')}</span>
                        </div>
                        {currentUser.status === PresenceStatus.AWAY && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          updateUserProfile({ status: PresenceStatus.BUSY });
                          setIsProfileMenuOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          currentUser.status === PresenceStatus.BUSY ? 'text-rose-400 bg-rose-500/10' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>{t('status_busy_full')}</span>
                        </div>
                        {currentUser.status === PresenceStatus.BUSY && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          updateUserProfile({ status: PresenceStatus.OFFLINE });
                          setIsProfileMenuOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          currentUser.status === PresenceStatus.OFFLINE ? 'text-slate-400 bg-slate-500/10' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-500" />
                          <span>{t('status_offline_full')}</span>
                        </div>
                        {currentUser.status === PresenceStatus.OFFLINE && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="border-t theme-border pt-2 space-y-1">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          toggleSettings(true);
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                      >
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <span>{t('settings_account_phone')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          toggleAuthModal(true);
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                      >
                        <UserCheck className="w-4 h-4 text-blue-400" />
                        <span>{t('switch_account')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          logout();
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('logout')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="pl-3 border-l theme-border">
              <button
                onClick={() => toggleAuthModal(true)}
                className="px-3 py-1.5 rounded-xl theme-primary-bg hover:opacity-90 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('login')}</span>
              </button>
            </div>
          )}
        </div>
      </header>
      )}

      {/* Main View Area */}
      {viewMode === 'full' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Conversation Directory */}
          <div
            className={`${
              isNarrow
                ? showMobileList || !activeConversationId
                  ? 'w-full h-full block'
                  : 'hidden'
                : 'w-72 sm:w-80 flex-shrink-0 h-full block'
            }`}
          >
            <ConversationList />
          </div>

          {/* Middle Column: Chat Main Stage */}
          <div
            className={`flex-1 flex flex-col h-full theme-bg-chat relative overflow-hidden ${
              isNarrow && (showMobileList || !activeConversationId) ? 'hidden' : 'flex'
            }`}
          >
            {activeConv ? (
              <>
                {/* Active Chat Header */}
                <div className="h-14 px-3 sm:px-4 theme-bg-header border-b theme-border flex items-center justify-between flex-shrink-0 z-20">
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    {isNarrow && (
                      <button
                        onClick={() => {
                          setShowMobileList(true);
                          useChatStore.getState().setActiveConversationId(null);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                        title="Quay lại danh sách hội thoại"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}
                    <div
                      onClick={() => toggleInfoPanel()}
                      className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1"
                    >
                    {(() => {
                      const partner = activeConv.members?.find((m) => m.id !== currentUser?.id);
                      const activeConvName =
                        activeConv.type === ConversationType.CHANNEL
                          ? `#${activeConv.name}`
                          : activeConv.name || partner?.fullName || 'Trò chuyện 1-1';

                      return (
                        <>
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs overflow-hidden">
                              {activeConv.type === ConversationType.CHANNEL ? (
                                <Hash className="w-4 h-4" />
                              ) : partner?.avatarUrl ? (
                                <img
                                  src={partner.avatarUrl}
                                  alt={activeConvName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                activeConvName.charAt(0) || 'C'
                              )}
                            </div>
                            {activeConv.type !== ConversationType.CHANNEL && (
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                                  partner?.status === PresenceStatus.ONLINE
                                    ? 'bg-emerald-500'
                                    : partner?.status === PresenceStatus.AWAY
                                    ? 'bg-amber-500'
                                    : partner?.status === PresenceStatus.BUSY
                                    ? 'bg-rose-500'
                                    : 'bg-slate-500'
                                }`}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h2
                              className="text-xs sm:text-sm font-bold text-white truncate leading-tight whitespace-nowrap block"
                              title={activeConvName}
                            >
                              {activeConvName}
                            </h2>
                            {activeConv.type === ConversationType.CHANNEL ? (
                              <span className="text-[10px] text-slate-400 font-medium truncate whitespace-nowrap block">
                                {t('internal_channel')}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[10px] font-medium truncate whitespace-nowrap">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${
                                    partner?.status === PresenceStatus.ONLINE
                                      ? 'bg-emerald-500'
                                      : partner?.status === PresenceStatus.AWAY
                                      ? 'bg-amber-500'
                                      : partner?.status === PresenceStatus.BUSY
                                      ? 'bg-rose-500'
                                      : 'bg-slate-500'
                                  }`}
                                />
                                <span
                                  className={
                                    partner?.status === PresenceStatus.ONLINE
                                      ? 'text-emerald-400'
                                      : partner?.status === PresenceStatus.AWAY
                                      ? 'text-amber-400'
                                      : partner?.status === PresenceStatus.BUSY
                                      ? 'text-rose-400'
                                      : 'text-slate-400'
                                  }
                                >
                                  {partner?.status === PresenceStatus.ONLINE
                                    ? t('status_online')
                                    : partner?.status === PresenceStatus.AWAY
                                    ? t('status_away')
                                    : partner?.status === PresenceStatus.BUSY
                                    ? t('status_busy')
                                    : (t('status_offline') || 'Ngoại tuyến')}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                    </div>
                  </div>

                  {/* Header Actions (Consolidated into 1 button on narrow/bubbles) */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isNarrow && (
                      <>
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
                          title={t('ai_summary_title')}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">{t('ai_summary')}</span>
                        </button>
                      </>
                    )}

                    {/* Single More Actions Menu Button */}
                    <div className="relative">
                      <button
                        onClick={() => setIsChatActionsOpen(!isChatActionsOpen)}
                        className={`p-2 rounded-lg transition-colors ${
                          isChatActionsOpen
                            ? 'bg-slate-800 text-white'
                            : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Tùy chọn & Hành động"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isChatActionsOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsChatActionsOpen(false)}
                          />
                          <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                            {isNarrow && (
                              <>
                                <button
                                  onClick={() => {
                                    setIsChatActionsOpen(false);
                                    startCall('audio');
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                                >
                                  <Phone className="w-4 h-4 text-emerald-400" />
                                  <span>Cuộc gọi thoại</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setIsChatActionsOpen(false);
                                    startCall('video');
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-blue-400 transition-colors"
                                >
                                  <Video className="w-4 h-4 text-blue-400" />
                                  <span>Cuộc gọi video</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setIsChatActionsOpen(false);
                                    toggleSearch();
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                                >
                                  <Search className="w-4 h-4 text-slate-400" />
                                  <span>Tìm kiếm tin nhắn</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setIsChatActionsOpen(false);
                                    toggleAiSummary(true);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 text-purple-300 hover:bg-slate-800 hover:text-purple-200 transition-colors"
                                >
                                  <Sparkles className="w-4 h-4 text-purple-400" />
                                  <span>{t('ai_summary')}</span>
                                </button>

                                <div className="my-1 border-t border-slate-800" />
                              </>
                            )}

                            <button
                              onClick={() => {
                                setIsChatActionsOpen(false);
                                toggleStarred(true);
                              }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-amber-400 transition-colors"
                            >
                              <Star className="w-4 h-4 text-amber-400" />
                              <span>Tin nhắn đã lưu (Đánh dấu sao)</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsChatActionsOpen(false);
                                openMediaPanel('files');
                              }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-blue-400 transition-colors"
                            >
                              <FolderOpen className="w-4 h-4 text-blue-400" />
                              <span>Kho File & Đa phương tiện</span>
                            </button>

                            {activeConv.type === ConversationType.CHANNEL && (
                              <button
                                onClick={() => {
                                  setIsChatActionsOpen(false);
                                  toggleGroupManagement(true);
                                }}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-purple-400 transition-colors"
                              >
                                <Settings className="w-4 h-4 text-purple-400" />
                                <span>Quản lý nhóm & Phân quyền</span>
                              </button>
                            )}

                            <div className="my-1 border-t border-slate-800" />

                            <button
                              onClick={() => {
                                setIsChatActionsOpen(false);
                                toggleInfoPanel();
                              }}
                              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                              <Info className="w-4 h-4 text-slate-400" />
                              <span>Chi tiết hội thoại & Thành viên</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
      {!isEmbedded && <FloatingChatWidget />}

      {/* Floating Call Notification Toast */}
      {callNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-slate-900/95 border border-slate-700/80 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-300">
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>{callNotice}</span>
        </div>
      )}

      {/* System Modals */}
      <AiSummaryModal />
      <CallModal />
      <IncomingCallModal />
      <CreatePollModal />
      <CreateGroupModal />
      <GroupManagementModal />
      <SettingsModal />
      <ForwardMessageModal />
      <StarredMessagesModal />
      <ImageLightboxModal />
      <AuthModal />
      <ReadReceiptsModal />

      {/* Viber-style Screen Lock Overlay */}
      {isScreenLocked && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-2xl">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Màn hình đã khóa (Screen Lock)</h2>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            Hệ thống trò chuyện doanh nghiệp MIC đang được khóa để bảo vệ thông tin mật nội bộ khi bạn rời khỏi bàn làm việc.
          </p>
          <button
            onClick={() => setScreenLocked(false)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            Mở khóa màn hình
          </button>
          <span className="text-[11px] text-slate-500 mt-6">
            Tài khoản hiện tại: {currentUser?.fullName || 'shqt 20'} ({currentUser?.email || 'shqt20@mic.vn'})
          </span>
        </div>
      )}
    </div>
  );
}
