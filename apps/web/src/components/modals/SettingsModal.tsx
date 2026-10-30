'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  X,
  Settings,
  Palette,
  Bell,
  Volume2,
  Globe,
  Sparkles,
  Key,
  ExternalLink,
  CheckCircle2,
  User,
  Phone,
  Save,
  Loader2,
} from 'lucide-react';
import { WallpaperThemeId } from '@enterprise-chat/shared-types';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { useModalDismiss } from '@/hooks/useModalDismiss';

export default function SettingsModal() {
  const { isSettingsOpen, toggleSettings, settings, updateSettings, currentUser, updateUserProfile, t } = useChatStore();

  const { handleBackdropClick } = useModalDismiss({
    isOpen: isSettingsOpen,
    onClose: () => toggleSettings(false),
  });

  const [geminiKey, setGeminiKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile & Phone Number states
  const [phoneInput, setPhoneInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('enterprise_gemini_api_key') || '';
      setGeminiKey(stored);
    }
    if (currentUser) {
      setPhoneInput(currentUser.phoneNumber || '');
      setFullNameInput(currentUser.fullName || '');
    }
  }, [isSettingsOpen, currentUser]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    await updateUserProfile({
      phoneNumber: phoneInput.trim() || undefined,
      fullName: fullNameInput.trim() || undefined,
    });
    setIsSavingProfile(false);
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 2500);
  };

  const handleSaveGeminiKey = () => {
    if (typeof window !== 'undefined') {
      if (geminiKey.trim()) {
        localStorage.setItem('enterprise_gemini_api_key', geminiKey.trim());
      } else {
        localStorage.removeItem('enterprise_gemini_api_key');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  if (!isSettingsOpen) return null;

  const themes: { id: WallpaperThemeId; nameKey: string; color: string }[] = [
    { id: 'dots', nameKey: 'theme_dots', color: '#2563eb' },
    { id: 'dark', nameKey: 'theme_dark', color: '#0f172a' },
    { id: 'indigo', nameKey: 'theme_indigo', color: '#7c3aed' },
    { id: 'emerald', nameKey: 'theme_emerald', color: '#059669' },
    { id: 'minimal', nameKey: 'theme_minimal', color: '#475569' },
  ];

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg theme-bg-card border theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 theme-bg-header border-b theme-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800/80 text-slate-200 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">{t('settings_title')}</h3>
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
          {/* User Profile & Phone Number Section */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-3">
              <User className="w-4 h-4 text-emerald-400" />
              <span>{t('profile_title')}</span>
            </div>
            <form onSubmit={handleSaveProfile} className="p-4 bg-slate-950/60 border theme-border rounded-xl space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b theme-border">
                <img
                  src={currentUser?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'}
                  alt={currentUser?.fullName || 'User'}
                  className="w-11 h-11 rounded-full border border-slate-700 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-200 text-xs truncate">
                    {currentUser?.fullName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {currentUser?.email}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {currentUser?.departmentName || 'Enterprise Member'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('profile_phone_label')}</span>
                </label>
                <input
                  type="tel"
                  placeholder={t('profile_phone_placeholder')}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border theme-border rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono tracking-wide"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {t('profile_phone_desc')}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('profile_name_label')}
                </label>
                <input
                  type="text"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border theme-border rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                {profileSaveSuccess ? (
                  <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('profile_saved')}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    {currentUser?.phoneNumber ? `${t('profile_current_phone')} ${currentUser.phoneNumber}` : t('profile_no_phone')}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('profile_saving')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{t('profile_save_btn')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Themes */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-3">
              <Palette className="w-4 h-4 text-blue-400" />
              <span>{t('themes_title')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((th) => (
                <button
                  key={th.id}
                  onClick={() =>
                    updateSettings({
                      appearance: { ...settings.appearance, themeId: th.id },
                    })
                  }
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    settings.appearance.themeId === th.id
                      ? 'border-blue-500 bg-blue-500/10 text-white font-medium ring-1 ring-blue-500/30'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: th.color }}
                  />
                  <span className="truncate">{t(th.nameKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-3">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>{t('language_title')}</span>
            </div>
            <div className="p-3 bg-slate-950/60 border theme-border rounded-xl space-y-3">
              <div>
                <p className="font-semibold text-slate-200">{t('language_app')}</p>
                <span className="text-[10px] text-slate-400">
                  {t('language_desc')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = (settings.account?.language || 'vi') === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() =>
                        updateSettings({
                          account: {
                            ...settings.account,
                            language: lang.code,
                          },
                        })
                      }
                      className={`px-3 py-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/20 text-white font-semibold ring-1 ring-indigo-500/30'
                          : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs truncate font-medium">{lang.nativeName}</div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider">{lang.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-3">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>{t('notifications_title')}</span>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-slate-950/60 border theme-border rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">{t('notif_sound')}</p>
                  <span className="text-[10px] text-slate-500">
                    {t('notif_sound_desc')}
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
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-950/60 border theme-border rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">{t('notif_badge')}</p>
                  <span className="text-[10px] text-slate-500">
                    {t('notif_badge_desc')}
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
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* AI Settings (Google Gemini) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>{t('ai_settings_title')}</span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
              >
                {t('ai_get_free_key')} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="p-4 bg-slate-950/60 border theme-border rounded-xl space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t('ai_key_label')}
                </label>
                <span className="text-[10px] text-slate-400 block mb-2">
                  {t('ai_key_desc')}
                </span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={t('ai_key_placeholder')}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-900 border theme-border rounded-xl text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleSaveGeminiKey}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-1.5"
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>{t('ai_saved')}</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5" />
                        <span>{t('ai_save_key')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{t('ai_status_label')}</span>
                {geminiKey.trim() ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('ai_status_ready')}
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">
                    {t('ai_status_nlp')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 theme-bg-header border-t theme-border flex justify-end">
          <button
            onClick={() => toggleSettings(false)}
            className="px-5 py-2 theme-primary-bg hover:opacity-90 text-white rounded-xl font-semibold shadow-md"
          >
            {t('close_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
