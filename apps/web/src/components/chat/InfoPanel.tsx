'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export default function InfoPanel() {
  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'files'>('members');
  const [isMuted, setIsMuted] = useState(false);

  const {
    conversations,
    activeConversationId,
    toggleInfoPanel,
    startCall,
    toggleSearch,
    toggleCreateGroup,
  } = useChatStore();

  const conversation = conversations.find((c) => c.id === activeConversationId);
  if (!conversation) return null;

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 text-slate-200 flex flex-col flex-shrink-0 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-white">Thông tin hội thoại</h3>
        <button
          onClick={() => toggleInfoPanel(false)}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Profile */}
      <div className="p-6 text-center border-b border-slate-800/80">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-blue-500/20 mb-3 uppercase">
          {conversation.name ? conversation.name.charAt(0) : 'C'}
        </div>
        <h4 className="font-bold text-base text-white truncate">{conversation.name}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          {conversation.description || 'Kênh trao đổi công việc nội bộ doanh nghiệp'}
        </p>

        {/* Action Pills */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => startCall('audio')}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all shadow-sm"
            title="Gọi thoại"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => startCall('video')}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all shadow-sm"
            title="Gọi video"
          >
            <Video className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={() => toggleSearch(true)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all shadow-sm"
            title="Tìm kiếm trong cuộc trò chuyện"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl transition-all shadow-sm ${
              isMuted
                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={isMuted ? 'Bật lại thông báo' : 'Tắt thông báo'}
          >
            {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-2.5 border-b-2 text-center transition-all ${
            activeTab === 'members'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Thành viên
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-2.5 border-b-2 text-center transition-all ${
            activeTab === 'media'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Media & Ảnh
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-2.5 border-b-2 text-center transition-all ${
            activeTab === 'files'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Tài liệu
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 text-xs">
        {activeTab === 'members' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Danh sách thành viên (4)
              </span>
              <button
                onClick={() => toggleCreateGroup(true)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            {[
              { name: 'Nguyễn Văn Quản Trị', role: 'Super Admin', online: true },
              { name: 'Trần Trọng Kỹ Thuật', role: 'Tech Lead', online: true },
              { name: 'Lê Hoàng Lập Trình', role: 'Senior Dev', online: true },
              { name: 'Phạm Thị Nhân Sự', role: 'HR Manager', online: false },
            ].map((m) => (
              <div key={m.name} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-blue-400 font-bold flex items-center justify-center">
                      {m.name.charAt(0)}
                    </div>
                    {m.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 leading-tight">{m.name}</p>
                    <span className="text-[10px] text-slate-500">{m.role}</span>
                  </div>
                </div>
                {m.role.includes('Admin') && (
                  <span title="Quản trị viên">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'media' && (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700/60 relative group flex items-center justify-center text-slate-500 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-5 h-5" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-2">
            {[
              { name: 'Bao_cao_trien_khai_Q4.pdf', size: '2.4 MB', date: '24/10' },
              { name: 'Kien_truc_Monorepo.docx', size: '1.1 MB', date: '25/10' },
              { name: 'Database_Schema_v2.sql', size: '480 KB', date: '26/10' },
            ].map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-2.5 p-2 bg-slate-950/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
              >
                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 truncate">{f.name}</p>
                  <span className="text-[10px] text-slate-500">{f.size} • {f.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
