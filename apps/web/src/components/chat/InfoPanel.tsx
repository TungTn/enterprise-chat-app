'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  X,
  Phone,
  Video,
  Bell,
  BellOff,
  Pin,
  FileText,
  Image as ImageIcon,
  Link2,
  Users,
  Search,
  ShieldCheck,
  UserPlus,
  Settings,
  Star,
  ExternalLink,
  Copy,
  Check,
  Download,
  LogOut,
  FolderOpen,
  FileSpreadsheet,
  Archive,
  Code,
  HardDrive,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface AttachmentItem {
  id: string;
  conversationId: string;
  fileName: string;
  originalName: string;
  fileSizeBytes: number;
  mimeType: string;
  downloadUrl: string;
  directDownloadUrl: string;
  createdAt: string;
  uploader?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

interface LinkItem {
  url: string;
  domain: string;
  sender?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  createdAt: string;
  messageId: string;
}

interface StorageResponse {
  stats: {
    totalFiles: number;
    totalBytes: number;
    mediaCount: number;
    documentCount: number;
    linkCount: number;
    isPermanent: boolean;
  };
  media: AttachmentItem[];
  files: AttachmentItem[];
  links: LinkItem[];
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatShortDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}`;
  } catch {
    return '';
  }
}

function getFileVisual(name: string, mime?: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || mime?.includes('pdf')) {
    return {
      icon: FileText,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      label: 'PDF',
    };
  }
  if (['doc', 'docx'].includes(ext) || mime?.includes('word')) {
    return {
      icon: FileText,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      label: 'DOC',
    };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime?.includes('excel') || mime?.includes('spreadsheet')) {
    return {
      icon: FileSpreadsheet,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      label: 'XLS',
    };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime?.includes('zip') || mime?.includes('compressed')) {
    return {
      icon: Archive,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      label: 'ZIP',
    };
  }
  if (['json', 'sql', 'js', 'ts', 'py', 'html', 'css', 'xml'].includes(ext)) {
    return {
      icon: Code,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      label: ext.toUpperCase(),
    };
  }

  return {
    icon: FileText,
    color: 'text-slate-400 bg-slate-800 border-slate-700',
    label: ext.toUpperCase() || 'FILE',
  };
}

export default function InfoPanel() {
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [storageData, setStorageData] = useState<StorageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    currentUser,
    conversations,
    activeConversationId,
    messagesMap,
    infoPanelTab,
    setInfoPanelTab,
    toggleInfoPanel,
    setActiveConversationId,
    createDirectApi,
    startCall,
    toggleStarred,
    toggleCreateGroup,
    toggleGroupManagement,
    togglePinConversation,
    setMuteDuration,
    leaveGroup,
    setLightboxImage,
  } = useChatStore();

  const conversation = conversations.find((c) => c.id === activeConversationId);

  const handleStartDirectChat = async (targetUserId?: string) => {
    if (!targetUserId || targetUserId === currentUser?.id) return;
    const existingDirect = conversations.find(
      (c) => c.type === 'DIRECT' && c.members?.some((m) => m.id === targetUserId)
    );
    if (existingDirect) {
      setActiveConversationId(existingDirect.id);
    } else {
      try {
        const newConvId = await createDirectApi(targetUserId);
        if (newConvId) {
          setActiveConversationId(newConvId);
        }
      } catch (err) {
        console.error('Failed to create direct conversation:', err);
      }
    }
  };

  // Fetch real media & files from backend
  const fetchStorageData = () => {
    if (!activeConversationId) return;
    setIsLoading(true);
    apiRequest<StorageResponse>(`/files/conversation/${activeConversationId}`)
      .then((data) => {
        setStorageData(data);
      })
      .catch((err) => {
        console.warn('Lỗi khi tải kho tệp & ảnh hội thoại:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchStorageData();
  }, [activeConversationId]);

  // Re-fetch when memory messages update with new attachments
  useEffect(() => {
    const activeMsgs = (activeConversationId && messagesMap[activeConversationId]) || [];
    const hasAttachments = activeMsgs.some((m) => m.attachments && m.attachments.length > 0);
    if (hasAttachments && storageData) {
      fetchStorageData();
    }
  }, [(activeConversationId && messagesMap[activeConversationId]?.length) || 0]);

  // Close mute menu on Escape
  useEffect(() => {
    if (!showMuteMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMuteMenu(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMuteMenu]);

  // Copy link helper
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Extract from local memory fallback if API is loading or empty
  const localAttachments = useMemo(() => {
    const msgs = (activeConversationId && messagesMap[activeConversationId]) || [];
    const atts: AttachmentItem[] = [];
    msgs.forEach((m) => {
      if (m.attachments) {
        m.attachments.forEach((a) => {
          atts.push({
            id: a.id,
            conversationId: activeConversationId || '',
            fileName: a.fileName,
            originalName: (a as any).originalName || a.fileName,
            fileSizeBytes: a.fileSizeBytes,
            mimeType: a.mimeType,
            downloadUrl: a.downloadUrl || `/api/files/${a.id}/view`,
            directDownloadUrl: `/api/files/${a.id}/download`,
            createdAt: m.createdAt,
            uploader: {
              id: m.senderId,
              fullName: m.senderName,
              avatarUrl: m.senderAvatarUrl,
            },
          });
        });
      }
    });
    return atts;
  }, [activeConversationId, messagesMap]);

  // Combined media list
  const allMedia = useMemo(() => {
    if (storageData && storageData.media) return storageData.media;
    return localAttachments.filter(
      (a) =>
        a.mimeType?.startsWith('image/') ||
        a.mimeType?.startsWith('video/') ||
        a.fileName.match(/\.(png|jpg|jpeg|gif|webp|svg|mp4|mov|webm)$/i),
    );
  }, [storageData, localAttachments]);

  // Combined files list
  const allFiles = useMemo(() => {
    if (storageData && storageData.files) return storageData.files;
    return localAttachments.filter(
      (a) =>
        !a.mimeType?.startsWith('image/') &&
        !a.mimeType?.startsWith('video/') &&
        !a.fileName.match(/\.(png|jpg|jpeg|gif|webp|svg|mp4|mov|webm)$/i),
    );
  }, [storageData, localAttachments]);

  // Combined links list
  const allLinks = useMemo(() => {
    if (storageData && storageData.links) return storageData.links;
    const msgs = (activeConversationId && messagesMap[activeConversationId]) || [];
    const list: LinkItem[] = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    msgs.forEach((m) => {
      if (m.content) {
        const matches = m.content.match(urlRegex);
        if (matches) {
          matches.forEach((url) => {
            try {
              list.push({
                url,
                domain: new URL(url).hostname,
                sender: { id: m.senderId, fullName: m.senderName, avatarUrl: m.senderAvatarUrl },
                createdAt: m.createdAt,
                messageId: m.id,
              });
            } catch {
              list.push({
                url,
                domain: 'web',
                sender: { id: m.senderId, fullName: m.senderName, avatarUrl: m.senderAvatarUrl },
                createdAt: m.createdAt,
                messageId: m.id,
              });
            }
          });
        }
      }
    });
    return list;
  }, [storageData, activeConversationId, messagesMap]);

  // Filtered collections based on search input
  const filteredMedia = useMemo(() => {
    if (!searchTerm.trim()) return allMedia;
    const term = searchTerm.toLowerCase();
    return allMedia.filter(
      (m) =>
        m.fileName.toLowerCase().includes(term) ||
        m.originalName.toLowerCase().includes(term) ||
        m.uploader?.fullName.toLowerCase().includes(term),
    );
  }, [allMedia, searchTerm]);

  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return allFiles;
    const term = searchTerm.toLowerCase();
    return allFiles.filter(
      (f) =>
        f.fileName.toLowerCase().includes(term) ||
        f.originalName.toLowerCase().includes(term) ||
        f.uploader?.fullName.toLowerCase().includes(term),
    );
  }, [allFiles, searchTerm]);

  const filteredLinks = useMemo(() => {
    if (!searchTerm.trim()) return allLinks;
    const term = searchTerm.toLowerCase();
    return allLinks.filter(
      (l) =>
        l.url.toLowerCase().includes(term) ||
        l.domain.toLowerCase().includes(term) ||
        l.sender?.fullName.toLowerCase().includes(term),
    );
  }, [allLinks, searchTerm]);

  const membersList = useMemo(() => {
    return conversation?.members || [];
  }, [conversation]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return membersList;
    const term = searchTerm.toLowerCase();
    return membersList.filter(
      (m) =>
        m.fullName.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        (m.phoneNumber && m.phoneNumber.includes(term)),
    );
  }, [membersList, searchTerm]);

  if (!conversation) return null;

  const isGroup = conversation.type === 'CHANNEL';
  const otherMember = !isGroup
    ? conversation.members?.find((m) => m.id !== currentUser?.id) || conversation.members?.[0]
    : null;
  const conversationDisplayName = isGroup
    ? conversation.name
    : conversation.name || otherMember?.fullName || 'Trò chuyện 1-1';

  const totalSafeBytes =
    storageData?.stats.totalBytes ||
    allMedia.reduce((acc, m) => acc + (m.fileSizeBytes || 0), 0) +
      allFiles.reduce((acc, f) => acc + (f.fileSizeBytes || 0), 0);
  const totalSafeFiles =
    storageData?.stats.totalFiles !== undefined
      ? storageData.stats.totalFiles
      : allMedia.length + allFiles.length;

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 text-slate-200 flex flex-col flex-shrink-0 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
            Thông tin & Kho lưu trữ
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchStorageData}
            disabled={isLoading}
            className={`p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${
              isLoading ? 'animate-spin text-blue-400' : ''
            }`}
            title="Làm mới kho tài liệu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleInfoPanel(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
        {/* Hero Section */}
        <div className="p-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20 mb-2.5 uppercase overflow-hidden">
            {!isGroup && otherMember?.avatarUrl ? (
              <img
                src={otherMember.avatarUrl}
                alt={conversationDisplayName || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              conversationDisplayName ? conversationDisplayName.charAt(0) : 'C'
            )}
          </div>
          <h4 className="font-bold text-sm text-white truncate px-2">{conversationDisplayName}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto line-clamp-1">
            {conversation.description || (isGroup ? 'Kênh trao đổi nhóm nội bộ' : 'Trò chuyện trực tiếp 1-1')}
          </p>

          {/* SĐT 1-1 */}
          {!isGroup && otherMember?.phoneNumber && (
            <div className="mt-2.5 p-2 bg-slate-950/80 border border-slate-800 rounded-xl text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Phone className="w-3 h-3" />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-medium">SĐT di động</span>
                  <span className="text-xs font-semibold text-slate-200 font-mono">
                    {otherMember.phoneNumber}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startCall('audio')}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-sm"
                  title="Gọi thoại WebRTC"
                >
                  <Phone className="w-2.5 h-2.5" />
                  <span>Gọi</span>
                </button>
                <a
                  href={`tel:${otherMember.phoneNumber}`}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded"
                  title="Quay số trực tiếp"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <button
              onClick={() => togglePinConversation(conversation.id)}
              className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-0.5 ${
                conversation.isPinned
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title={conversation.isPinned ? 'Bỏ ghim' : 'Ghim hội thoại'}
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium">{conversation.isPinned ? 'Đã ghim' : 'Ghim'}</span>
            </button>

            <button
              onClick={() => toggleStarred(true)}
              className="p-2 rounded-xl border border-slate-700/60 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex flex-col items-center gap-0.5"
              title="Tin nhắn đã lưu (Đánh dấu sao)"
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9px] font-medium">Tin lưu</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMuteMenu(!showMuteMenu)}
                className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-0.5 ${
                  conversation.isMuted
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Cài đặt thông báo"
              >
                {conversation.isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                <span className="text-[9px] font-medium">{conversation.isMuted ? 'Đã tắt' : 'Chuông'}</span>
              </button>

              {showMuteMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMuteMenu(false)}
                  />
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-44 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1 z-30 text-left text-xs">
                    {conversation.isMuted ? (
                      <button
                        onClick={() => {
                          setMuteDuration(conversation.id, 'unmute');
                          setShowMuteMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-emerald-400 flex items-center gap-2"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Bật lại thông báo</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setMuteDuration(conversation.id, '1h');
                            setShowMuteMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                        >
                          Tắt trong 1 giờ
                        </button>
                        <button
                          onClick={() => {
                            setMuteDuration(conversation.id, '8h');
                            setShowMuteMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                        >
                          Tắt trong 8 giờ
                        </button>
                        <button
                          onClick={() => {
                            setMuteDuration(conversation.id, '24h');
                            setShowMuteMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                        >
                          Tắt trong 24 giờ
                        </button>
                        <button
                          onClick={() => {
                            setMuteDuration(conversation.id, 'forever');
                            setShowMuteMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-red-400 border-t border-slate-800/80"
                        >
                          Cho đến khi mở lại
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {isGroup && (
              <>
                <button
                  onClick={() => toggleCreateGroup(true)}
                  className="p-2 rounded-xl border border-slate-700/60 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex flex-col items-center gap-0.5"
                  title="Thêm thành viên"
                >
                  <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[9px] font-medium">Thêm</span>
                </button>

                <button
                  onClick={() => toggleGroupManagement(true)}
                  className="p-2 rounded-xl border border-slate-700/60 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex flex-col items-center gap-0.5"
                  title="Quản lý nhóm & Phân quyền"
                >
                  <Settings className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[9px] font-medium">Quản lý</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Permanent Storage Banner: Khắc phục triệt để lỗi của Zalo */}
        <div className="p-3.5">
          <div className="p-3 bg-gradient-to-br from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-500/30 rounded-2xl shadow-inner">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-500/30 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-white tracking-wide">
                    Lưu trữ an toàn vĩnh viễn
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    Không hết hạn
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 mt-1 leading-snug">
                  Mọi tệp, ảnh và tài liệu được lưu trữ vĩnh viễn trên MinIO / S3 nội bộ của MIC/BPM. Không bao giờ bị mất hoặc hết hạn như Zalo.
                </p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                  <span className="text-white font-semibold">{totalSafeFiles} tệp</span>
                  <span>•</span>
                  <span className="text-blue-300 font-medium">{formatBytes(totalSafeBytes)}</span>
                  <span>•</span>
                  <span>{allLinks.length} liên kết</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Media & Resources Tabs */}
        <div>
          <div className="flex border-b border-slate-800 text-[11px] font-semibold bg-slate-950/40">
            <button
              onClick={() => setInfoPanelTab('media')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
                infoPanelTab === 'media'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Ảnh ({filteredMedia.length})
            </button>
            <button
              onClick={() => setInfoPanelTab('files')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
                infoPanelTab === 'files'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Tệp ({filteredFiles.length})
            </button>
            <button
              onClick={() => setInfoPanelTab('links')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
                infoPanelTab === 'links'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Link ({filteredLinks.length})
            </button>
            <button
              onClick={() => setInfoPanelTab('members')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
                infoPanelTab === 'members'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Người ({filteredMembers.length})
            </button>
          </div>

          {/* Quick in-panel search */}
          <div className="px-3.5 pt-3 pb-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tệp, ảnh, tên người gửi..."
                className="w-full bg-slate-950/90 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="p-3.5 text-xs">
            {/* 1. Tab Ảnh / Media */}
            {infoPanelTab === 'media' && (
              <div>
                {filteredMedia.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {filteredMedia.map((item) => (
                      <div
                        key={item.id}
                        className="group relative aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-800/80 hover:border-blue-500/80 transition-all shadow-sm cursor-pointer"
                        title={`${item.originalName}\nNgười gửi: ${item.uploader?.fullName || 'Ẩn danh'}\n${formatShortDate(item.createdAt)} • ${formatBytes(item.fileSizeBytes)}`}
                        onClick={() => setLightboxImage(item.downloadUrl)}
                      >
                        <img
                          src={item.downloadUrl}
                          alt={item.originalName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImage(item.downloadUrl);
                            }}
                            className="p-1 rounded bg-slate-900/80 hover:bg-blue-600 text-white transition-colors"
                            title="Phóng to"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={item.directDownloadUrl || item.downloadUrl}
                            download={item.originalName}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded bg-slate-900/80 hover:bg-emerald-600 text-white transition-colors"
                            title="Tải về"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-[11px] font-medium text-slate-400">Chưa có hình ảnh nào</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Ảnh gửi trong chat sẽ được tự động lưu vĩnh viễn tại đây
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2. Tab Tệp tài liệu */}
            {infoPanelTab === 'files' && (
              <div>
                {filteredFiles.length > 0 ? (
                  <div className="space-y-1.5">
                    {filteredFiles.map((file) => {
                      const visual = getFileVisual(file.originalName, file.mimeType);
                      const VisualIcon = visual.icon;
                      return (
                        <div
                          key={file.id}
                          className="flex items-center gap-2.5 p-2 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all group"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border font-bold text-[9px] ${visual.color}`}
                          >
                            <span>{visual.label}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="font-medium text-slate-200 truncate text-[11px] leading-snug group-hover:text-blue-400 transition-colors"
                              title={file.originalName}
                            >
                              {file.originalName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 truncate">
                              <span className="font-mono text-slate-300">
                                {formatBytes(file.fileSizeBytes)}
                              </span>
                              <span>•</span>
                              <span className="truncate">{file.uploader?.fullName || 'Người gửi'}</span>
                              <span>•</span>
                              <span>{formatShortDate(file.createdAt)}</span>
                            </div>
                          </div>
                          <a
                            href={file.directDownloadUrl || file.downloadUrl}
                            download={file.originalName}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors flex-shrink-0"
                            title="Tải tệp xuống máy tính"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-[11px] font-medium text-slate-400">Chưa có tệp tài liệu nào</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      PDF, Word, Excel gửi trong chat sẽ được lưu trữ vĩnh viễn
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. Tab Liên kết Web */}
            {infoPanelTab === 'links' && (
              <div>
                {filteredLinks.length > 0 ? (
                  <div className="space-y-1.5">
                    {filteredLinks.map((l, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Link2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-300 block truncate font-mono">
                            {l.domain}
                          </span>
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-400 hover:underline truncate block"
                            title={l.url}
                          >
                            {l.url}
                          </a>
                          <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
                            {l.sender?.fullName || 'Người gửi'} • {formatShortDate(l.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleCopyLink(l.url)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Sao chép liên kết"
                          >
                            {copiedLink === l.url ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Mở tab mới"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    <Link2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-[11px] font-medium text-slate-400">Chưa có liên kết nào</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Các đường dẫn URL gửi trong tin nhắn sẽ hiển thị tại đây
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 4. Tab Thành viên */}
            {infoPanelTab === 'members' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Thành viên ({filteredMembers.length})
                  </span>
                  {isGroup && (
                    <button
                      onClick={() => toggleGroupManagement(true)}
                      className="text-blue-400 hover:text-blue-300 text-[11px] font-medium"
                    >
                      Quản lý
                    </button>
                  )}
                </div>

                {filteredMembers.map((m) => {
                  const isCurrent = m.id === currentUser?.id;
                  return (
                    <div
                      key={m.id || m.email}
                      onClick={() => !isCurrent && handleStartDirectChat(m.id)}
                      className={`flex items-center justify-between py-1.5 px-2 rounded-xl transition-colors ${
                        !isCurrent
                          ? 'cursor-pointer hover:bg-slate-800/60 active:scale-[0.99]'
                          : 'hover:bg-slate-800/30'
                      }`}
                      title={!isCurrent ? `Nhắn tin với ${m.fullName}` : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex-shrink-0">
                          {m.avatarUrl ? (
                            <img
                              src={m.avatarUrl}
                              alt={m.fullName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-blue-400 font-bold text-xs flex items-center justify-center">
                              {m.fullName.charAt(0)}
                            </div>
                          )}
                          <span
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-slate-900 ${
                              m.status === 'ONLINE'
                                ? 'bg-emerald-500'
                                : m.status === 'AWAY'
                                ? 'bg-amber-500'
                                : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 text-xs leading-tight truncate hover:text-blue-400 transition-colors">
                            {m.fullName}
                          </p>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {m.departmentName || m.email}
                          </span>
                        </div>
                      </div>
                      {m.phoneNumber && (
                        <a
                          href={`tel:${m.phoneNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                          title={`Gọi ${m.phoneNumber}`}
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Danger Action: Leave Group */}
        {isGroup && (
          <div className="p-4">
            <button
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn rời khỏi nhóm này không?')) {
                  leaveGroup(conversation.id);
                  toggleInfoPanel(false);
                }
              }}
              className="w-full py-2 px-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Rời khỏi nhóm trò chuyện</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
