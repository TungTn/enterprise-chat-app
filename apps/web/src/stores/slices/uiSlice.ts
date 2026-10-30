import { StateCreator } from 'zustand';
import { ChatSettings } from '@enterprise-chat/shared-types';
import { getTranslation } from '@/lib/i18n';
import { ChatState, UiSlice, DEFAULT_SETTINGS } from '../types';

export const loadSavedSettings = (): ChatSettings => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('enterprise_chat_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged: ChatSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
          appearance: { ...DEFAULT_SETTINGS.appearance, ...(parsed.appearance || {}) },
          account: { ...DEFAULT_SETTINGS.account, ...(parsed.account || {}) },
        };
        return merged;
      }
    } catch {
      // Ignore
    }
  }
  return DEFAULT_SETTINGS;
};

export const createUiSlice: StateCreator<ChatState, [], [], UiSlice> = (set, get) => ({
  isInfoPanelOpen: false,
  infoPanelTab: 'media',
  isSettingsOpen: false,
  isCreateGroupOpen: false,
  isGroupManagementOpen: false,
  isCreatePollOpen: false,
  isAiSummaryOpen: false,
  isStarredOpen: false,
  isForwardOpen: false,
  isSearchOpen: false,
  isQuickWidgetOpen: false,
  lightboxImage: null,
  isViberPanelOpen: false,
  isScreenLocked: false,
  isBubbleOpen: false,
  settings: loadSavedSettings(),

  setIsBubbleOpen: (isOpen) => set({ isBubbleOpen: isOpen }),
  toggleInfoPanel: (force) =>
    set((state) => ({ isInfoPanelOpen: force !== undefined ? force : !state.isInfoPanelOpen })),
  setInfoPanelTab: (tab) => set({ infoPanelTab: tab }),
  openMediaPanel: (tab = 'media') => set({ isInfoPanelOpen: true, infoPanelTab: tab }),
  toggleSettings: (force) =>
    set((state) => ({ isSettingsOpen: force !== undefined ? force : !state.isSettingsOpen })),
  toggleCreateGroup: (force) =>
    set((state) => ({ isCreateGroupOpen: force !== undefined ? force : !state.isCreateGroupOpen })),
  toggleGroupManagement: (force) =>
    set((state) => ({ isGroupManagementOpen: force !== undefined ? force : !state.isGroupManagementOpen })),
  toggleCreatePoll: (force) =>
    set((state) => ({ isCreatePollOpen: force !== undefined ? force : !state.isCreatePollOpen })),
  toggleAiSummary: (force) =>
    set((state) => ({ isAiSummaryOpen: force !== undefined ? force : !state.isAiSummaryOpen })),
  toggleStarred: (force) =>
    set((state) => ({ isStarredOpen: force !== undefined ? force : !state.isStarredOpen })),
  toggleForward: (force) =>
    set((state) => ({ isForwardOpen: force !== undefined ? force : !state.isForwardOpen })),
  toggleSearch: (force) =>
    set((state) => ({ isSearchOpen: force !== undefined ? force : !state.isSearchOpen })),
  toggleQuickWidget: (force) =>
    set((state) => ({ isQuickWidgetOpen: force !== undefined ? force : !state.isQuickWidgetOpen })),
  setLightboxImage: (url) => set({ lightboxImage: url }),
  toggleViberPanel: (force) =>
    set((state) => ({ isViberPanelOpen: force !== undefined ? force : !state.isViberPanelOpen })),
  setScreenLocked: (locked) => set({ isScreenLocked: locked }),

  updateSettings: (partial) => {
    set((state) => {
      const newSettings: ChatSettings = {
        ...state.settings,
        ...partial,
        notifications: {
          ...state.settings.notifications,
          ...(partial.notifications || {}),
        },
        appearance: {
          ...state.settings.appearance,
          ...(partial.appearance || {}),
        },
        account: {
          ...state.settings.account,
          ...(partial.account || {}),
        },
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('enterprise_chat_settings', JSON.stringify(newSettings));
        if (newSettings.appearance?.themeId) {
          document.documentElement.setAttribute('data-theme', newSettings.appearance.themeId);
        }
        if (newSettings.account?.language) {
          document.documentElement.setAttribute('lang', newSettings.account.language);
        }
      }

      return { settings: newSettings };
    });
  },

  t: (key: string) => {
    const { settings } = get();
    return getTranslation(settings.account?.language || 'vi', key);
  },
});
