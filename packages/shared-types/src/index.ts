// Role-Based Access Control (RBAC)
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  DEPARTMENT_MANAGER = 'DEPARTMENT_MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  GUEST = 'GUEST'
}

// User Presence Status
export enum PresenceStatus {
  ONLINE = 'ONLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

// Conversation Types
export enum ConversationType {
  DIRECT = 'DIRECT',
  CHANNEL = 'CHANNEL'
}

// Channel Scope
export enum ChannelScope {
  COMPANY = 'COMPANY',
  DEPARTMENT = 'DEPARTMENT',
  PRIVATE = 'PRIVATE'
}

// Channel Member Roles
export enum ChannelMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

// Message Types
export enum MessageType {
  TEXT = 'TEXT',
  ATTACHMENT = 'ATTACHMENT',
  VOICE = 'VOICE',
  POLL = 'POLL',
  SYSTEM = 'SYSTEM'
}

// Message Delivery Status
export enum MessageDeliveryStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

// Basic User Profile Interface
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: PresenceStatus;
  statusMessage?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  createdAt: string;
}

// Basic Department Interface
export interface Department {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  managerId?: string | null;
  memberCount?: number;
}

// Attachment Data
export interface AttachmentMetadata {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
}

// Voice Data
export interface ChatVoiceData {
  url: string;
  duration: number;
  waveData?: number[];
}

// Poll Data
export interface ChatPollOption {
  id: string;
  text: string;
  voterIds: string[];
  voterNames?: string[];
}

export interface ChatPoll {
  id: string;
  question: string;
  options: ChatPollOption[];
  isMultiple: boolean;
  totalVotes: number;
  createdBy?: string;
}

export interface VotePollDto {
  conversationId: string;
  pollId: string;
  optionId: string;
}

// Reply Preview
export interface ChatReplyPreview {
  messageId: string;
  senderName: string;
  content: string;
}

// Message Interface
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string;
  type: MessageType;
  parentId?: string | null;
  replyTo?: ChatReplyPreview;
  replyCount?: number;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
  forwardedFrom?: {
    senderName: string;
  };
  attachments?: AttachmentMetadata[];
  voice?: ChatVoiceData;
  poll?: ChatPoll;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  createdAt: string;
  updatedAt?: string;
}

// Group Permissions
export interface GroupPermissions {
  allowEditInfo: 'all' | 'admins';
  allowSendMessages: 'all' | 'admins';
  allowSendMedia: 'all' | 'admins';
  allowPinMessages: 'all' | 'admins';
  allowAddMembers: 'all' | 'admins';
}

// Call Types & State
export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface ActiveCallState {
  id: string;
  conversationId: string;
  conversationName: string;
  conversationAvatar?: string;
  isGroup: boolean;
  type: CallType;
  status: CallStatus;
  startTime?: number;
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isMinimized: boolean;
}

// AI Conversation Summary
export interface ChatAiActionItem {
  task: string;
  assignee?: string;
  status?: 'pending' | 'in_progress' | 'done';
}

export interface ChatAiSummary {
  topic: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ChatAiActionItem[];
  metrics: {
    messageCount: number;
    participantCount: number;
    timeRange: string;
  };
  generatedAt: string;
}

// Settings
export type ThemeMode = 'light' | 'dark' | 'device';
export type WallpaperThemeId = 'dots' | 'dark' | 'indigo' | 'emerald' | 'minimal';

export interface ChatAppearanceSettings {
  mode: ThemeMode;
  themeId: WallpaperThemeId;
}

export interface ChatNotificationSettings {
  oneOnOne: boolean;
  group: boolean;
  mentions: boolean;
  playSound: boolean;
  combinedSound: boolean;
  unreadBadge: boolean;
  taskbarAlert: boolean;
}

export interface ChatSettings {
  notifications: ChatNotificationSettings;
  appearance: ChatAppearanceSettings;
  account: {
    interfaceScale: string;
    language: 'vi' | 'en';
    startAutomatically: boolean;
  };
}

// Conversation Detail
export interface ConversationSummary {
  id: string;
  type: ConversationType;
  name?: string | null;
  scope?: ChannelScope | null;
  description?: string | null;
  departmentId?: string | null;
  isPinned?: boolean;
  isMuted?: boolean;
  unreadCount: number;
  lastMessage?: ChatMessage | null;
  permissions?: GroupPermissions;
  members: UserProfile[];
}

// WebSocket Event Names
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Rooms
  JOIN_CONVERSATION: 'conversation:join',
  LEAVE_CONVERSATION: 'conversation:leave',

  // Messages
  SEND_MESSAGE: 'message:send',
  NEW_MESSAGE: 'message:new',
  EDIT_MESSAGE: 'message:edit',
  MESSAGE_EDITED: 'message:edited',
  DELETE_MESSAGE: 'message:delete',
  MESSAGE_DELETED: 'message:deleted',
  REACT_MESSAGE: 'message:react',
  MESSAGE_REACTION_UPDATED: 'message:reaction_updated',
  PIN_MESSAGE: 'message:pin',
  MESSAGE_PINNED: 'message:pinned',

  // Polls
  POLL_VOTE: 'poll:vote',
  POLL_UPDATED: 'poll:updated',

  // Calls
  CALL_INITIATE: 'call:initiate',
  CALL_SIGNAL: 'call:signal',
  CALL_END: 'call:end',

  // Read Receipts & Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  USER_TYPING: 'typing:user',
  MARK_READ: 'message:read',
  READ_RECEIPT: 'message:read_receipt',

  // Presence
  PRESENCE_CHANGE: 'presence:change'
} as const;

// DTOs
export interface SendMessageDto {
  conversationId: string;
  content: string;
  type?: MessageType;
  parentId?: string;
  replyTo?: ChatReplyPreview;
  attachmentIds?: string[];
  voice?: ChatVoiceData;
  poll?: ChatPoll;
  forwardedFrom?: {
    senderName: string;
  };
  clientMessageId?: string; // Idempotency
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  user: UserProfile;
}

