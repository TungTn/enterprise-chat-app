'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  Hash,
  MessageSquare,
  Search,
  Plus,
  Settings,
  Bell,
  BellOff,
  Pin,
  Users,
  CheckCircle2,
  Lock,
  User,
  ArrowRight,
  Info,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { ConversationType, UserProfile, ConversationSummary, PresenceStatus } from '@enterprise-chat/shared-types';
import ViberAccountPanel from './ViberAccountPanel';

function getStatusDotClass(status?: PresenceStatus): string {
  switch (status) {
    case PresenceStatus.ONLINE:
      return 'bg-emerald-500';
    case PresenceStatus.AWAY:
      return 'bg-amber-500';
    case PresenceStatus.BUSY:
      return 'bg-rose-500';
    case PresenceStatus.OFFLINE:
    default:
      return 'bg-slate-500';
  }
}

function getStatusTitle(status?: PresenceStatus): string {
  switch (status) {
    case PresenceStatus.ONLINE:
      return 'Trực tuyến (Online)';
    case PresenceStatus.AWAY:
      return 'Vắng mặt (Away)';
    case PresenceStatus.BUSY:
      return 'Đang bận (Busy)';
    case PresenceStatus.OFFLINE:
    default:
      return 'Ngoại tuyến (Offline)';
  }
}

function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export default function ConversationList() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<'all' | 'unread' | 'channels' | 'direct'>('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<UserProfile[]>([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    conv: ConversationSummary;
  } | null>(null);

  const {
    currentUser,
    conversations,
    activeConversationId,
    setActiveConversationId,
    colleagues,
    toggleCreateGroup,
    toggleSettings,
    createDirectApi,
    searchUsersApi,
    fetchColleagues,
    togglePinConversation,
    toggleMuteConversation,
    toggleInfoPanel,
    openMediaPanel,
    leaveGroup,
    isViberPanelOpen,
    toggleViberPanel,
    t,
  } = useChatStore();

  useEffect(() => {
    fetchColleagues();
  }, [fetchColleagues]);

  // Close custom context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('contextmenu', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('contextmenu', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const isSearching = filterQuery.trim().length > 0;
  const normalizedQuery = removeVietnameseTones(filterQuery);
  const cleanPhoneDigits = filterQuery.replace(/\D/g, '');

  // Debounced search on server for any users in database
  useEffect(() => {
    const trimmed = filterQuery.trim();
    if (!trimmed) {
      setRemoteResults([]);
      setIsSearchingServer(false);
      return;
    }

    setIsSearchingServer(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsersApi(trimmed);
        setRemoteResults(results || []);
      } finally {
        setIsSearchingServer(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [filterQuery, searchUsersApi]);

  // Combine colleagues and remote search results
  const combinedUsers = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    colleagues.forEach((u) => map.set(u.id, u));
    remoteResults.forEach((u) => map.set(u.id, u));
    return Array.from(map.values());
  }, [colleagues, remoteResults]);

  // Search colleagues by name (accent-insensitive), phone number, and email
  const matchedColleagues = isSearching
    ? combinedUsers.filter((u) => {
        const nameNorm = removeVietnameseTones(u.fullName || '');
        const emailNorm = (u.email || '').toLowerCase();
        const deptNorm = removeVietnameseTones(u.departmentName || '');
        const userPhoneDigits = (u.phoneNumber || '').replace(/\D/g, '');

        if (nameNorm.includes(normalizedQuery)) return true;
        if (cleanPhoneDigits && userPhoneDigits.includes(cleanPhoneDigits)) return true;
        if (u.phoneNumber && u.phoneNumber.toLowerCase().includes(filterQuery.toLowerCase().trim())) return true;
        if (emailNorm.includes(filterQuery.toLowerCase().trim())) return true;
        if (deptNorm.includes(normalizedQuery)) return true;
        return false;
      })
    : [];

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const isChannel = c.type === ConversationType.CHANNEL;
    const partner = c.members?.find(
      (m) =>
        m.id !== currentUser?.id &&
        (!currentUser?.email || m.email?.toLowerCase() !== currentUser.email.toLowerCase())
    );
    const resolvedName = isChannel ? c.name : (c.name || partner?.fullName || 'Trò chuyện 1-1');
    const nameNorm = removeVietnameseTones(resolvedName || '');
    const partnerPhoneDigits = (partner?.phoneNumber || '').replace(/\D/g, '');

    const matchesName =
      nameNorm.includes(normalizedQuery) ||
      (cleanPhoneDigits && partnerPhoneDigits.includes(cleanPhoneDigits)) ||
      (partner?.email || '').toLowerCase().includes(filterQuery.toLowerCase().trim());
    if (!matchesName) return false;

    if (tab === 'unread') return c.unreadCount > 0;
    if (tab === 'channels') return c.type === ConversationType.CHANNEL;
    if (tab === 'direct') return c.type === ConversationType.DIRECT;
    return true;
  });

  // Sort pinned conversations to the top
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const handleStartDirectChat = async (colleagueId: string, colleagueName: string) => {
    // Check if DM conversation already exists
    const existing = conversations.find(
      (c) =>
        c.type === ConversationType.DIRECT &&
        (c.name?.includes(colleagueName) || c.members?.some((m) => m.id === colleagueId))
    );

    if (existing) {
      setActiveConversationId(existing.id);
      setFilterQuery('');
      return;
    }

    // Call API or create local DM
    const newConvId = await createDirectApi(colleagueId);
    if (newConvId) {
      setActiveConversationId(newConvId);
      setFilterQuery('');
    }
  };

  return (
    <div className="flex flex-col h-full theme-bg-sidebar border-r theme-border text-slate-200 select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3.5 border-b theme-border flex items-center justify-between theme-bg-header">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl theme-primary-bg flex items-center justify-center font-bold text-white shadow-md">
            EC
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-wide text-white leading-tight">ENTERPRISE CHAT</h1>
            <span className="text-[10px] text-slate-400 font-medium">Next.js v2.5</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleCreateGroup(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={t('new_group')}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleSettings(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={t('settings_title')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input Row with Viber Profile Trigger */}
      <div className="px-3 py-2 flex items-center gap-2 relative">
        <button
          ref={triggerRef}
          onClick={(e) => {
            e.stopPropagation();
            toggleViberPanel();
          }}
          className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-700 to-purple-600 hover:from-indigo-600 hover:to-purple-500 text-white flex items-center justify-center shadow-md transition-all active:scale-95 flex-shrink-0 border border-indigo-400/30 group"
          title="Cấu hình tài khoản & Menu Viber"
        >
          <img
            src={
              currentUser?.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.email || 'shqt20'}`
            }
            alt="Profile"
            className="w-7 h-7 rounded-md object-cover"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </button>

        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-slate-950/80 border theme-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Viber Account Drawer Dropdown */}
        {isViberPanelOpen && (
          <ViberAccountPanel triggerRef={triggerRef} onClose={() => toggleViberPanel(false)} />
        )}
      </div>

      {/* Tabs Filter Bar (Only shown when not searching) */}
      {!isSearching && (
        <div className="px-3 py-1 flex items-center gap-1 border-b theme-border text-xs">
          <button
            onClick={() => setTab('all')}
            className={`px-2 py-1 rounded-md transition-all ${
              tab === 'all'
                ? 'theme-primary-bg text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {t('tab_all')}
          </button>
          <button
            onClick={() => setTab('channels')}
            className={`px-2 py-1 rounded-md transition-all ${
              tab === 'channels'
                ? 'theme-primary-bg text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {t('tab_channels')}
          </button>
          <button
            onClick={() => setTab('direct')}
            className={`px-2 py-1 rounded-md transition-all ${
              tab === 'direct'
                ? 'theme-primary-bg text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {t('tab_direct')}
          </button>
          <button
            onClick={() => setTab('unread')}
            className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
              tab === 'unread'
                ? 'theme-primary-bg text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>{t('tab_unread')}</span>
          </button>
        </div>
      )}

      {/* Scrollable List Container */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {/* SECTION 1: SEARCH COLLEAGUES & CONTACTS (WHEN SEARCHING) */}
        {isSearching && (
          <div className="space-y-1 mb-3">
            <div className="px-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-blue-400" /> Người dùng & Đồng nghiệp ({matchedColleagues.length})
              </span>
              {isSearchingServer && (
                <span className="text-[10px] text-blue-400 animate-pulse font-medium">Đang tìm...</span>
              )}
            </div>

            {matchedColleagues.length === 0 ? (
              <div className="px-2.5 py-3 rounded-lg bg-slate-900/40 border border-slate-800/40 text-center text-xs text-slate-500 italic">
                {isSearchingServer ? 'Đang tìm kiếm người dùng...' : `Không tìm thấy người dùng phù hợp với "${filterQuery}"`}
              </div>
            ) : (
              <div className="space-y-1">
                {matchedColleagues.map((u) => (
                  <div
                    key={u.id}
                    className="px-2.5 py-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 flex items-center justify-between transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                          alt={u.fullName}
                          className="w-8 h-8 rounded-full object-cover bg-slate-800"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-slate-900 ${getStatusDotClass(u.status)}`}
                          title={getStatusTitle(u.status)}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-200 truncate">{u.fullName}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate mt-0.5">
                          {u.phoneNumber && (
                            <span className="text-emerald-400 font-medium bg-emerald-500/10 px-1 py-0.5 rounded">
                              {u.phoneNumber}
                            </span>
                          )}
                          {u.phoneNumber && (u.departmentName || u.email) && <span>•</span>}
                          <span className="truncate text-slate-400">{u.departmentName || u.email}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartDirectChat(u.id, u.fullName)}
                      className="p-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all text-[11px] font-medium flex items-center gap-1 flex-shrink-0 shadow-sm ml-2"
                      title={`Nhắn tin 1-1 với ${u.fullName}`}
                    >
                      <span>Chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: CONVERSATION LIST */}
        <div className="space-y-0.5">
          {isSearching && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
              Cuộc trò chuyện ({sortedConversations.length})
            </span>
          )}

          {sortedConversations.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs italic">
              Không tìm thấy cuộc trò chuyện nào
            </div>
          ) : (
            sortedConversations.map((c) => {
              const isActive = c.id === activeConversationId;
              const isChannel = c.type === ConversationType.CHANNEL;
              const partner = c.members?.find(
                (m) =>
                  m.id !== currentUser?.id &&
                  (!currentUser?.email || m.email?.toLowerCase() !== currentUser.email.toLowerCase())
              );
              const displayName = isChannel
                ? `#${c.name}`
                : (c.name || partner?.fullName || 'Trò chuyện 1-1');

              return (
                <button
                  key={c.id}
                  onClick={() => setActiveConversationId(c.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const menuWidth = 220;
                    const menuHeight = 240;
                    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
                    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
                    setContextMenu({ x, y, conv: c });
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {isChannel ? (
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Hash className="w-4 h-4" />
                      </div>
                    ) : partner?.avatarUrl ? (
                      <img
                        src={partner.avatarUrl}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover bg-slate-800"
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-blue-400'
                        }`}
                      >
                        {displayName.charAt(0) || 'U'}
                      </div>
                    )}

                    {!isChannel && (
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${getStatusDotClass(partner?.status)}`}
                        title={getStatusTitle(partner?.status)}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold truncate leading-tight">
                          {displayName}
                        </span>
                        {c.isPinned && (
                          <Pin className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-amber-200' : 'text-amber-400'}`} />
                        )}
                        {c.isMuted && (
                          <BellOff className={`w-3 h-3 flex-shrink-0 opacity-70 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        )}
                      </div>

                      {c.unreadCount > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                          {c.lastMessage?.content?.includes('@all') && (
                            <span className="bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1 py-0.2 rounded font-mono shadow-sm animate-pulse">
                              @all
                            </span>
                          )}
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {c.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>

                    {c.description && (
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isActive ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {c.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Custom Context Menu on Right Click */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[210px] bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl p-1 text-xs text-slate-200 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-2.5 py-1.5 border-b border-slate-800/80 mb-1 flex items-center justify-between">
            <span className="font-semibold text-[11px] text-slate-300 truncate max-w-[140px]">
              {contextMenu.conv.type === ConversationType.CHANNEL ? `#${contextMenu.conv.name}` : contextMenu.conv.name}
            </span>
            <span className="text-[9px] text-slate-500 uppercase font-mono">
              {contextMenu.conv.type === ConversationType.CHANNEL ? 'Kênh' : '1-1'}
            </span>
          </div>

          {/* Action 1: Ghim / Bỏ ghim */}
          <button
            onClick={() => {
              togglePinConversation(contextMenu.conv.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 flex items-center gap-2 transition-colors text-slate-200 hover:text-white"
          >
            <Pin className={`w-3.5 h-3.5 ${contextMenu.conv.isPinned ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>{contextMenu.conv.isPinned ? 'Bỏ ghim hội thoại' : 'Ghim lên đầu'}</span>
          </button>

          {/* Action 2: Bật / Tắt thông báo */}
          <button
            onClick={() => {
              toggleMuteConversation(contextMenu.conv.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 flex items-center gap-2 transition-colors text-slate-200 hover:text-white"
          >
            {contextMenu.conv.isMuted ? (
              <>
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bật lại thông báo</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Tắt thông báo</span>
              </>
            )}
          </button>

          {/* Action 3: Xem thông tin */}
          <button
            onClick={() => {
              setActiveConversationId(contextMenu.conv.id);
              toggleInfoPanel(true);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 flex items-center gap-2 transition-colors text-slate-200 hover:text-white"
          >
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Xem thông tin hội thoại</span>
          </button>

          {/* Action 4: Xem file & ảnh */}
          <button
            onClick={() => {
              setActiveConversationId(contextMenu.conv.id);
              openMediaPanel('media');
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 flex items-center gap-2 transition-colors text-slate-200 hover:text-white"
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>File & Ảnh đã chia sẻ</span>
          </button>

          <div className="my-1 border-t border-slate-800/80" />

          {/* Action 5: Rời nhóm / Đóng hội thoại */}
          <button
            onClick={() => {
              if (contextMenu.conv.type === ConversationType.CHANNEL) {
                leaveGroup(contextMenu.conv.id);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{contextMenu.conv.type === ConversationType.CHANNEL ? 'Rời khỏi kênh' : 'Đóng hội thoại'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
