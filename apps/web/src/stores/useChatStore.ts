import { create } from 'zustand';
import { ChatState, DEFAULT_PERMISSIONS, DEFAULT_SETTINGS } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createChatSlice } from './slices/chatSlice';
import { createCallSlice } from './slices/callSlice';
import { createUiSlice } from './slices/uiSlice';

export const useChatStore = create<ChatState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createChatSlice(...a),
  ...createCallSlice(...a),
  ...createUiSlice(...a),
}));

export { DEFAULT_PERMISSIONS, DEFAULT_SETTINGS };
export type { ChatState };
