'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  X,
  LogIn,
  UserPlus,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  UserCheck,
  Building2,
  Code2,
  Briefcase,
} from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';

const DEMO_ACCOUNTS = [
  {
    role: 'BPM Account',
    name: 'shqt 20',
    email: 'shqt20@mic.vn',
    password: 'Company@123',
    department: 'Cán bộ MIC Gateway',
    icon: ShieldCheck,
    color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30 hover:border-purple-400',
  },
  {
    role: 'Staff',
    name: 'Tùng (tungtn)',
    email: 'tungtn@gmail.com',
    password: 'Company@123',
    department: 'Phòng Phát triển',
    icon: UserCheck,
    color: 'from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:border-cyan-400',
  },
  {
    role: 'Admin',
    name: 'Nguyễn Văn Quản Trị',
    email: 'admin@company.com',
    password: 'Company@123',
    department: 'Ban Giám Đốc',
    icon: ShieldCheck,
    color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30 hover:border-amber-400',
  },
  {
    role: 'Tech Lead',
    name: 'Trần Trọng Kỹ Thuật',
    email: 'lead.tech@company.com',
    password: 'Company@123',
    department: 'Phòng Công nghệ',
    icon: Code2,
    color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30 hover:border-blue-400',
  },
  {
    role: 'Senior Dev',
    name: 'Lê Hoàng Lập Trình',
    email: 'developer@company.com',
    password: 'Company@123',
    department: 'Phòng Phát triển',
    icon: Building2,
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30 hover:border-emerald-400',
  },
  {
    role: 'HR Manager',
    name: 'Phạm Thị Nhân Sự',
    email: 'hr@company.com',
    password: 'Company@123',
    department: 'Phòng Nhân sự',
    icon: Briefcase,
    color: 'from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30 hover:border-pink-400',
  },
];

export default function AuthModal() {
  const {
    isAuthModalOpen,
    toggleAuthModal,
    currentUser,
    login,
    register,
    authError,
    setAuthError,
  } = useChatStore();

  const { handleBackdropClick } = useModalDismiss({
    isOpen: isAuthModalOpen,
    onClose: () => toggleAuthModal(false),
  });

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }
    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    if (success) {
      setPassword('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setAuthError('Vui lòng điền đầy đủ tất cả các trường');
      return;
    }
    if (password.length < 6) {
      setAuthError('Mật khẩu phải chứa ít nhất 6 ký tự');
      return;
    }
    setIsLoading(true);
    const success = await register({ fullName, email, password });
    setIsLoading(false);
    if (success) {
      setPassword('');
      setFullName('');
    }
  };

  const handleQuickLogin = async (demo: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setIsLoading(true);
    await login(demo.email, demo.password);
    setIsLoading(false);
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              EC
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Enterprise Chat</h3>
              <p className="text-[11px] text-slate-400">Hệ thống liên lạc nội bộ doanh nghiệp</p>
            </div>
          </div>
          {currentUser && (
            <button
              onClick={() => toggleAuthModal(false)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="p-2 bg-slate-950/60 border-b border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setAuthError(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setAuthError(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng ký mới</span>
          </button>
        </div>

        {/* Error Banner */}
        {authError && (
          <div className="m-4 mb-0 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{authError}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email công ty
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Đăng nhập hệ thống</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Minh Đức"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email công ty
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="duc.hoang@company.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mật khẩu (tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đăng ký...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Tạo tài khoản & Đăng nhập</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Login with Demo Accounts */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Đăng nhập nhanh (Tài khoản mẫu):
              </span>
              <span className="text-[10px] text-slate-500 font-mono">pass: Company@123</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((demo) => {
                const IconComponent = demo.icon;
                return (
                  <button
                    key={demo.email}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleQuickLogin(demo)}
                    className={`p-2.5 rounded-xl border bg-gradient-to-br text-left transition-all group flex flex-col justify-between ${demo.color}`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">{demo.role}</span>
                      <IconComponent className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="font-semibold text-xs text-white truncate w-full">
                      {demo.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate w-full mt-0.5">
                      {demo.department}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500">
          Xác thực mã hóa mật khẩu chuẩn bcrypt & Token JWT an toàn
        </div>
      </div>
    </div>
  );
}
