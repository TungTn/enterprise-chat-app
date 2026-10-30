'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { X, Users, Check } from 'lucide-react';
import { ConversationType, ChannelScope } from '@enterprise-chat/shared-types';
import { useModalDismiss } from '@/hooks/useModalDismiss';

export default function CreateGroupModal() {
  const {
    isCreateGroupOpen,
    toggleCreateGroup,
    conversations,
    setConversations,
    setActiveConversationId,
    createChannelApi,
    colleagues,
  } = useChatStore();

  const { handleBackdropClick } = useModalDismiss({
    isOpen: isCreateGroupOpen,
    onClose: () => toggleCreateGroup(false),
  });

  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCreateGroupOpen) return null;

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter((item) => item !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const cleanName = groupName.trim().toLowerCase().replace(/\s+/g, '-');

    try {
      const channelId = await createChannelApi({
        name: cleanName,
        scope: ChannelScope.COMPANY,
        description: `Nhóm thảo luận ${groupName.trim()}`,
        memberIds: selectedUserIds,
      });

      if (!channelId) {
        // Local fallback
        const newGroup = {
          id: `c-group-${Date.now()}`,
          type: ConversationType.CHANNEL,
          name: cleanName,
          scope: ChannelScope.DEPARTMENT,
          description: `Nhóm thảo luận ${groupName.trim()}`,
          unreadCount: 0,
          members: [],
        };
        setConversations([newGroup, ...conversations]);
        setActiveConversationId(newGroup.id);
      }
    } finally {
      setIsSubmitting(false);
      toggleCreateGroup(false);
      setGroupName('');
      setSelectedUserIds([]);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Tạo nhóm / kênh làm việc mới</h3>
          </div>
          <button
            onClick={() => toggleCreateGroup(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="p-4 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Tên nhóm / kênh</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="VD: du-an-enterprise-chat"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1">
              Thêm thành viên ({selectedUserIds.length})
            </label>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {colleagues.map((c) => {
                const isSelected = selectedUserIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSelectUser(c.id)}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{c.fullName}</p>
                      <span className="text-[10px] text-slate-500">{c.departmentName || c.email}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => toggleCreateGroup(false)}
              className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/20"
            >
              Tạo nhóm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
