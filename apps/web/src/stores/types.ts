import {
  UserProfile,
  ChatMessage,
  ConversationSummary,
  ActiveCallState,
  CallType,
  ChatAiSummary,
  ChatSettings,
  MessageType,
  PresenceStatus,
  UserRole,
  ChannelScope,
  GroupPermissions,
  ChannelMemberRole,
  ConversationType,
  MessageDeliveryStatus,
  IceServerConfig,
} from '@enterprise-chat/shared-types';

export const DEFAULT_SETTINGS: ChatSettings = {
  notifications: {
    oneOnOne: true,
    group: true,
    mentions: true,
    playSound: true,
    combinedSound: false,
    unreadBadge: true,
    taskbarAlert: true,
  },
  appearance: {
    mode: 'light',
    themeId: 'dots',
  },
  account: {
    interfaceScale: '100%',
    language: 'vi',
    startAutomatically: true,
  },
};

export const DEFAULT_PERMISSIONS: GroupPermissions = {
  allowEditInfo: 'all',
  allowSendMessages: 'all',
  allowSendMedia: 'all',
  allowPinMessages: 'all',
  allowAddMembers: 'all',
};

export interface AuthSlice {
  currentUser: UserProfile | null;
  token: string | null;
  webHostUser: string | null;
  colleagues: UserProfile[];
  isAuthModalOpen: boolean;
  authError: string | null;

  setCurrentUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setWebHostUser: (username: string | null) => void;
  toggleAuthModal: (force?: boolean) => void;
  setAuthError: (err: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  ssoBpmLogin: (bpmUser: any, bpmToken?: string) => Promise<boolean>;
  register: (data: { email: string; password: string; fullName: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  switchAccount: (email: string, password?: string) => Promise<boolean>;
  updateUserProfile: (data: {
    fullName?: string;
    phoneNumber?: string;
    status?: PresenceStatus;
    statusMessage?: string;
  }) => Promise<boolean>;
  initAuth: () => Promise<void>;
  fetchColleagues: () => Promise<void>;
  searchUsersApi: (query: string) => Promise<UserProfile[]>;
}

export interface OutboxMessage {
  tempId: string;
  conversationId: string;
  payload: {
    conversationId: string;
    content: string;
    type?: MessageType;
    clientMessageId: string;
    attachmentIds?: string[];
    attachments?: any[];
    parentId?: string;
  };
  createdAt: number;
}

export interface ChatSlice {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messagesMap: Record<string, ChatMessage[]>;
  replyingMessage: ChatMessage | null;
  editingMessage: ChatMessage | null;
  messageToForward: ChatMessage | null;
  searchQuery: string;
  isGeneratingSummary: boolean;
  currentAiSummary: ChatAiSummary | null;
  readReceiptsMessage: ChatMessage | null;

  // Pagination & Outbox State
  outboxQueue: OutboxMessage[];
  hasMoreMap: Record<string, boolean>;
  cursorsMap: Record<string, string | null>;
  isLoadingOlder: boolean;

  setConversations: (conversations: ConversationSummary[]) => void;
  setActiveConversationId: (id: string | null) => void;
  setMessages: (conversationId: string, messages: ChatMessage[]) => void;
  sendMessage: (payload: {
    conversationId: string;
    content: string;
    type?: MessageType;
    attachmentIds?: string[];
    attachments?: any[];
    replyTo?: ChatMessage;
    poll?: any;
    voice?: any;
    forwardedFrom?: { senderName: string };
  }) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  togglePinMessage: (messageId: string) => void;
  toggleStarMessage: (messageId: string) => void;
  votePoll: (messageId: string, optionId: string) => void;
  setReplyingMessage: (msg: ChatMessage | null) => void;
  setEditingMessage: (msg: ChatMessage | null) => void;
  setMessageToForward: (msg: ChatMessage | null) => void;
  setSearchQuery: (q: string) => void;
  setReadReceiptsMessage: (msg: ChatMessage | null) => void;

  togglePinConversation: (convId: string) => void;
  toggleMuteConversation: (convId: string) => void;
  setMuteDuration: (convId: string, duration: '1h' | '8h' | '24h' | 'forever' | 'unmute') => void;
  updateGroupInfo: (convId: string, data: { name?: string; description?: string; avatarUrl?: string }) => void;
  updateGroupPermissions: (convId: string, permissions: GroupPermissions) => void;
  updateMemberRole: (convId: string, userId: string, role: ChannelMemberRole) => void;
  removeMemberFromGroup: (convId: string, userId: string) => void;
  transferGroupOwnership: (convId: string, newOwnerId: string) => void;
  leaveGroup: (convId: string) => void;
  disbandGroup: (convId: string) => void;

  generateAiSummary: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  syncDeltaMessages: (conversationId: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  createChannelApi: (data: {
    name: string;
    scope: ChannelScope;
    description?: string;
    departmentId?: string;
    memberIds?: string[];
  }) => Promise<string | null>;
  createDirectApi: (targetUserId: string) => Promise<string | null>;
  fetchOlderMessages: (conversationId: string) => Promise<boolean>;
  processOutboxQueue: () => Promise<void>;
}

export interface IncomingCallState {
  callId: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: CallType;
}

export interface CallSlice {
  activeCall: ActiveCallState | null;
  incomingCall: IncomingCallState | null;
  isCallModalOpen: boolean;
  callNotice: string | null;

  startCall: (type: CallType) => void;
  endCall: (durationSeconds?: number) => void;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  setIncomingCall: (call: IncomingCallState | null) => void;
  setCallNotice: (notice: string | null) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleCallMinimize: () => void;
  toggleCallModal: (force?: boolean) => void;
  fetchIceServers: () => Promise<IceServerConfig[]>;
}

export interface UiSlice {
  isInfoPanelOpen: boolean;
  infoPanelTab: 'members' | 'media' | 'files' | 'links';
  isSettingsOpen: boolean;
  isCreateGroupOpen: boolean;
  isGroupManagementOpen: boolean;
  isCreatePollOpen: boolean;
  isAiSummaryOpen: boolean;
  isStarredOpen: boolean;
  isForwardOpen: boolean;
  isSearchOpen: boolean;
  isQuickWidgetOpen: boolean;
  lightboxImage: string | null;
  isViberPanelOpen: boolean;
  isScreenLocked: boolean;
  isBubbleOpen: boolean;
  settings: ChatSettings;

  setIsBubbleOpen: (isOpen: boolean) => void;
  toggleInfoPanel: (force?: boolean) => void;
  setInfoPanelTab: (tab: 'members' | 'media' | 'files' | 'links') => void;
  openMediaPanel: (tab?: 'media' | 'files' | 'links') => void;
  toggleSettings: (force?: boolean) => void;
  toggleCreateGroup: (force?: boolean) => void;
  toggleGroupManagement: (force?: boolean) => void;
  toggleCreatePoll: (force?: boolean) => void;
  toggleAiSummary: (force?: boolean) => void;
  toggleStarred: (force?: boolean) => void;
  toggleForward: (force?: boolean) => void;
  toggleSearch: (force?: boolean) => void;
  toggleQuickWidget: (force?: boolean) => void;
  setLightboxImage: (url: string | null) => void;
  toggleViberPanel: (force?: boolean) => void;
  setScreenLocked: (locked: boolean) => void;
  updateSettings: (partial: Partial<ChatSettings>) => void;
  t: (key: string) => string;
}

export type ChatState = AuthSlice & ChatSlice & CallSlice & UiSlice;
