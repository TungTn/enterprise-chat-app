'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore, DEFAULT_PERMISSIONS } from '@/stores/useChatStore';
import {
  X,
  Users,
  Edit3,
  ShieldCheck,
  AlertTriangle,
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  Crown,
  LogOut,
  Trash2,
} from 'lucide-react';
import { ChannelMemberRole, GroupPermissions, UserRole } from '@enterprise-chat/shared-types';
import { useModalDismiss } from '@/hooks/useModalDismiss';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/identicon/svg?seed=company',
  'https://api.dicebear.com/7.x/identicon/svg?seed=engineering',
  'https://api.dicebear.com/7.x/identicon/svg?seed=coffee',
  'https://api.dicebear.com/7.x/identicon/svg?seed=project',
  'https://api.dicebear.com/7.x/identicon/svg?seed=marketing',
  'https://api.dicebear.com/7.x/identicon/svg?seed=design',
];

export default function GroupManagementModal() {
  const {
    isGroupManagementOpen,
    toggleGroupManagement,
    conversations,
    activeConversationId,
    currentUser,
    updateGroupInfo,
    updateGroupPermissions,
    updateMemberRole,
    removeMemberFromGroup,
    transferGroupOwnership,
    leaveGroup,
    disbandGroup,
  } = useChatStore();

  const { handleBackdropClick } = useModalDismiss({
    isOpen: isGroupManagementOpen,
    onClose: () => toggleGroupManagement(false),
  });

  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'permissions' | 'danger'>('info');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  const conv = conversations.find((c) => c.id === activeConversationId);
  const permissions: GroupPermissions = conv?.permissions || DEFAULT_PERMISSIONS;

  useEffect(() => {
    if (conv) {
      setName(conv.name || '');
      setDescription(conv.description || '');
      setAvatarUrl('');
    }
  }, [conv]);

  if (!isGroupManagementOpen || !conv) return null;

  const isOwner = currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.DEPARTMENT_MANAGER;

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateGroupInfo(conv.id, {
      name: name.trim(),
      description: description.trim(),
      avatarUrl: avatarUrl || undefined,
    });
    toggleGroupManagement(false);
  };

  const handlePermissionChange = (key: keyof GroupPermissions, value: 'all' | 'admins') => {
    updateGroupPermissions(conv.id, {
      ...permissions,
      [key]: value,
    });
  };

  // Filter members
  const memberList = (conv.members && conv.members.length > 0)
    ? conv.members
    : [
        {
          id: 'u-admin',
          fullName: 'Nguyễn Văn Quản Trị (Bạn)',
          email: 'admin@company.com',
          role: UserRole.SUPER_ADMIN,
          status: 'ONLINE' as any,
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
          createdAt: '',
        },
        {
          id: 'u-techlead',
          fullName: 'Trần Trọng Kỹ Thuật',
          email: 'lead.tech@company.com',
          role: UserRole.DEPARTMENT_MANAGER,
          status: 'ONLINE' as any,
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=techlead',
          createdAt: '',
        },
        {
          id: 'u-dev',
          fullName: 'Lê Hoàng Lập Trình',
          email: 'dev@company.com',
          role: UserRole.EMPLOYEE,
          status: 'ONLINE' as any,
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=dev',
          createdAt: '',
        },
      ];

  const filteredMembers = memberList.filter((m) =>
    (m.fullName || m.email || '').toLowerCase().includes(searchMember.toLowerCase())
  );

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg">
              {conv.name ? conv.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white truncate max-w-sm">{conv.name}</h3>
              <span className="text-[11px] text-slate-400">
                {memberList.length} thành viên • Quản trị nhóm & Phân quyền
              </span>
            </div>
          </div>
          <button
            onClick={() => toggleGroupManagement(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-semibold px-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'info'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Thông tin nhóm</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Thành viên ({memberList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Quyền hạn</span>
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ml-auto ${
              activeTab === 'danger'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-slate-400 hover:text-red-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>Khu vực nguy hiểm</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs">
          {/* TAB 1: THÔNG TIN NHÓM */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Tên nhóm trò chuyện <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên nhóm..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Mô tả nhóm</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập mục đích, quy định nhóm..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-2">Ảnh đại diện nhóm</label>
                <div className="flex items-center gap-3">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-10 h-10 rounded-xl overflow-hidden border-2 p-0.5 transition-all ${
                        avatarUrl === url ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/20' : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover rounded-lg" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => toggleGroupManagement(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 shadow-md shadow-blue-500/20"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: THÀNH VIÊN */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm thành viên trong nhóm..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="divide-y divide-slate-800/60 max-h-[45vh] overflow-y-auto">
                {filteredMembers.map((member) => {
                  const isMemberAdmin = member.role === UserRole.SUPER_ADMIN || member.role === UserRole.DEPARTMENT_MANAGER;
                  const isCurrent = currentUser?.id === member.id;

                  return (
                    <div key={member.id} className="py-2.5 flex items-center justify-between hover:bg-slate-950/40 px-2 rounded-lg transition-colors relative">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={member.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.id}`}
                            alt={member.fullName}
                            className="w-8 h-8 rounded-full object-cover bg-slate-800"
                          />
                          {member.status === 'ONLINE' && (
                            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{member.fullName}</span>
                            {isMemberAdmin ? (
                              <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5" /> Quản trị viên
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                Thành viên
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">{member.email}</span>
                        </div>
                      </div>

                      {/* Dropdown action button */}
                      {!isCurrent && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuUserId(activeMenuUserId === member.id ? null : member.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuUserId === member.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-1 z-30">
                              {!isMemberAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateMemberRole(conv.id, member.id, ChannelMemberRole.ADMIN);
                                    setActiveMenuUserId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-xs text-blue-400"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Bổ nhiệm Quản trị viên</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateMemberRole(conv.id, member.id, ChannelMemberRole.MEMBER);
                                    setActiveMenuUserId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-xs text-amber-400"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Hạ quyền Quản trị viên</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  transferGroupOwnership(conv.id, member.id);
                                  setActiveMenuUserId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-xs text-purple-400"
                              >
                                <Crown className="w-3.5 h-3.5" />
                                <span>Chuyển nhượng Trưởng nhóm</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  removeMemberFromGroup(conv.id, member.id);
                                  setActiveMenuUserId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-xs text-red-400 border-t border-slate-800/80"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Xóa khỏi nhóm</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: QUYỀN HẠN (PERMISSIONS) */}
          {activeTab === 'permissions' && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                Thiết lập quyền gửi tin nhắn và các thao tác của thành viên trong nhóm trò chuyện.
              </div>

              {[
                {
                  key: 'allowEditInfo' as keyof GroupPermissions,
                  title: 'Chỉnh sửa thông tin nhóm',
                  desc: 'Cho phép đổi tên, mô tả và ảnh đại diện nhóm',
                },
                {
                  key: 'allowSendMessages' as keyof GroupPermissions,
                  title: 'Gửi tin nhắn',
                  desc: 'Cho phép thành viên gửi tin nhắn trao đổi trong nhóm',
                },
                {
                  key: 'allowSendMedia' as keyof GroupPermissions,
                  title: 'Gửi hình ảnh & tệp đính kèm',
                  desc: 'Cho phép tải lên tệp tin và ảnh',
                },
                {
                  key: 'allowPinMessages' as keyof GroupPermissions,
                  title: 'Ghim tin nhắn',
                  desc: 'Cho phép ghim tin nhắn quan trọng lên đầu hội thoại',
                },
                {
                  key: 'allowAddMembers' as keyof GroupPermissions,
                  title: 'Thêm thành viên mới',
                  desc: 'Cho phép mời đồng nghiệp khác vào nhóm',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div className="max-w-xs">
                    <p className="font-semibold text-slate-200">{item.title}</p>
                    <span className="text-[10px] text-slate-500">{item.desc}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handlePermissionChange(item.key, 'all')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        permissions[item.key] === 'all'
                          ? 'bg-blue-600 text-white font-medium shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermissionChange(item.key, 'admins')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        permissions[item.key] === 'admins'
                          ? 'bg-blue-600 text-white font-medium shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Chỉ Admin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-red-400">
                  <LogOut className="w-4 h-4" />
                  <span>Rời khỏi nhóm trò chuyện</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Bạn sẽ không còn nhận được thông báo hay tin nhắn từ nhóm này nữa. Bạn chỉ có thể tham gia lại nếu được thành viên khác thêm vào.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Bạn có chắc chắn muốn rời khỏi nhóm này không?')) {
                      leaveGroup(conv.id);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all shadow-md shadow-red-600/20"
                >
                  Rời nhóm
                </button>
              </div>

              {isOwner && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 font-bold text-red-400">
                    <Trash2 className="w-4 h-4" />
                    <span>Giải tán nhóm trò chuyện</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Hành động này sẽ xóa vĩnh viễn nhóm và toàn bộ lịch sử tin nhắn của các thành viên. Không thể hoàn tác sau khi thực hiện.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('CẢNH BÁO: Bạn có chắc chắn muốn giải tán vĩnh viễn nhóm trò chuyện này không?')) {
                        disbandGroup(conv.id);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold transition-all shadow-md shadow-red-700/20"
                  >
                    Giải tán nhóm vĩnh viễn
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
