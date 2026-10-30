'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  Sparkles,
  PhoneCall,
  Phone,
  Users,
  Bookmark,
  Lock,
  Settings,
  HelpCircle,
  LogOut,
  UserCheck,
  Edit2,
  Check,
  X,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { PresenceStatus, UserRole } from '@enterprise-chat/shared-types';

interface ViberAccountPanelProps {
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export default function ViberAccountPanel({ onClose, triggerRef }: ViberAccountPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const {
    currentUser,
    startCall,
    toggleStarred,
    toggleSettings,
    toggleAuthModal,
    setScreenLocked,
    logout,
    updateUserProfile,
    t,
  } = useChatStore();

  useEffect(() => {
    if (currentUser) {
      setEditFullName(currentUser.fullName || '');
      setEditPhone(currentUser.phoneNumber || '');
    }
  }, [currentUser]);

  // Click outside to close (ignoring clicks on the trigger button)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (panelRef.current && panelRef.current.contains(target)) ||
        (triggerRef?.current && triggerRef.current.contains(target))
      ) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, triggerRef]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) return;
    setIsSaving(true);
    try {
      await updateUserProfile({
        fullName: editFullName.trim(),
        phoneNumber: editPhone.trim(),
      });
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        ref={panelRef}
        className="absolute top-12 left-3 w-72 bg-[#1b1f28] border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col text-slate-200 select-none animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
        style={{
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 15px rgba(99, 102, 241, 0.15)',
        }}
      >
        {/* Top Header Profile Card */}
        <div className="p-3.5 bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-b border-slate-700/70">
          {!isEditingProfile ? (
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={
                    currentUser?.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.email || 'shqt20'}`
                  }
                  alt={currentUser?.fullName || 'User'}
                  className="w-12 h-12 rounded-full border-2 border-indigo-500/50 object-cover shadow-md"
                />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#1b1f28] ${
                    currentUser?.status === PresenceStatus.ONLINE
                      ? 'bg-emerald-500'
                      : currentUser?.status === PresenceStatus.AWAY
                      ? 'bg-amber-500'
                      : currentUser?.status === PresenceStatus.BUSY
                      ? 'bg-rose-500'
                      : 'bg-slate-500'
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white truncate leading-tight">
                    {currentUser?.fullName || 'shqt 20'}
                  </h3>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                    title="Chỉnh sửa thông tin tài khoản"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  {currentUser?.phoneNumber || '+84 38 746 2193'}
                </div>

                <div className="text-[10px] text-indigo-400 font-medium truncate mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  <span>{currentUser?.email || 'shqt20@mic.vn'}</span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Chỉnh sửa thông tin</span>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Họ và tên"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Số điện thoại"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3 py-1 rounded-lg text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Lưu
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Presence Status Quick Picker */}
        <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium">Trạng thái:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateUserProfile({ status: PresenceStatus.ONLINE })}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                currentUser?.status === PresenceStatus.ONLINE
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Trực tuyến"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Online</span>
            </button>

            <button
              onClick={() => updateUserProfile({ status: PresenceStatus.AWAY })}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                currentUser?.status === PresenceStatus.AWAY
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Vắng mặt"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Away</span>
            </button>

            <button
              onClick={() => updateUserProfile({ status: PresenceStatus.BUSY })}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                currentUser?.status === PresenceStatus.BUSY
                  ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Đang bận"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Busy</span>
            </button>
          </div>
        </div>

        {/* Viber Desktop Menu Actions */}
        <div className="p-2 space-y-0.5 overflow-y-auto max-h-[380px] custom-scrollbar text-xs">
          {/* Item 1: MIC Plus */}
          <div className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-200 group-hover:text-white leading-tight">
                  MIC Plus
                </div>
                <div className="text-[10px] text-slate-400">Tính năng bảo mật nâng cao</div>
              </div>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded-full">
              PRO
            </span>
          </div>

          {/* Item 2: MIC Out */}
          <div
            onClick={() => {
              onClose();
              startCall('audio');
            }}
            className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-200 group-hover:text-white leading-tight">
                  MIC Out
                </div>
                <div className="text-[10px] text-slate-400">Thoại nội bộ & Hotline SIP</div>
              </div>
            </div>
            <button className="text-[10px] font-semibold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-lg transition-colors">
              Add
            </button>
          </div>

          {/* Item 3: Use dial pad */}
          <button
            onClick={() => {
              onClose();
              startCall('audio');
            }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200 group-hover:text-white">
              Bàn phím quay số (Use dial pad)
            </span>
          </button>

          {/* Item 4: Contact list */}
          <button
            onClick={() => {
              onClose();
              toggleSettings(true);
            }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200 group-hover:text-white">
              Danh bạ cán bộ (Contact list)
            </span>
          </button>

          {/* Item 5: My Notes */}
          <button
            onClick={() => {
              onClose();
              toggleStarred(true);
            }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200 group-hover:text-white">
              Ghi chú của tôi (My Notes)
            </span>
          </button>

          {/* Item 6: Set screen lock */}
          <button
            onClick={() => {
              onClose();
              setScreenLocked(true);
            }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200 group-hover:text-white">
              Khóa màn hình (Set screen lock)
            </span>
          </button>

          {/* Item 7: Settings */}
          <button
            onClick={() => {
              onClose();
              toggleSettings(true);
            }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200 group-hover:text-white">
              Cài đặt hệ thống (Settings)
            </span>
          </button>

          {/* Item 8: Support */}
          <button
            onClick={() => setShowSupportModal(true)}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-200 group-hover:text-white">
              Trợ giúp & Hỗ trợ (Support)
            </span>
          </button>

          <div className="my-1.5 border-t border-slate-700/60" />

          {/* Switch Account */}
          <button
            onClick={() => {
              onClose();
              toggleAuthModal(true);
            }}
            className="w-full flex items-center gap-3 px-2.5 py-1.5 rounded-xl hover:bg-slate-800/60 text-slate-300 hover:text-white transition-colors text-left"
          >
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>Chuyển đổi tài khoản</span>
          </button>

          {/* Log out */}
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center gap-3 px-2.5 py-1.5 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>

        {/* Footer Version Info */}
        <div className="px-3.5 py-2.5 bg-slate-900/90 border-t border-slate-800 text-[10px] text-slate-500 flex flex-col">
          <span className="font-medium text-slate-400">Version 2.9.1.0 (MIC Edition)</span>
          <span>© 2010-2026 Tổng Công ty CP Bảo hiểm Quân đội (MIC)</span>
        </div>
      </div>

      {/* Support Dialog */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e2330] border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Trợ giúp & Hỗ trợ MIC Chat</h3>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <p>
                Hệ thống Trò chuyện Doanh nghiệp và Điều phối tác nghiệp nội bộ MIC.
              </p>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div>• Hotline IT: <span className="text-emerald-400">1900 558899 (Ext: 102)</span></div>
                <div>• Email hỗ trợ: <span className="text-blue-400">support.cntt@mic.vn</span></div>
                <div>• Cổng BPM Gateway: <span className="text-indigo-400">http://10.2.8.231:9000</span></div>
              </div>
            </div>
            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
