'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import {
  Send,
  Paperclip,
  Smile,
  BarChart2,
  Sparkles,
  X,
  AtSign,
  Mic,
  Trash2,
  FileText,
  Image as ImageIcon,
  Radio,
  Loader2,
} from 'lucide-react';
import { MessageType, AttachmentMetadata } from '@enterprise-chat/shared-types';
import { uploadFileToMinio } from '@/lib/uploadService';
import ImagePastePreviewModal from '@/components/modals/ImagePastePreviewModal';

const COMMON_EMOJIS = ['😀', '😂', '👍', '❤️', '🎉', '🔥', '🚀', '👏', '👀', '💯', '☕', '💡', '✅', '🙏', '🎯', '⚡', '✨', '🤝'];

interface SelectedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  previewUrl?: string;
}

export default function MessageInput() {
  const [text, setText] = useState('');
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [pasteModalImage, setPasteModalImage] = useState<{
    url: string;
    file: File | Blob;
    name: string;
    size: number;
  } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPopper, setShowMentionPopper] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Upload progress state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    conversations,
    activeConversationId,
    colleagues,
    token,
    sendMessage,
    replyingMessage,
    setReplyingMessage,
    editingMessage,
    setEditingMessage,
    editMessage,
    toggleCreatePoll,
    toggleAiSummary,
    t,
  } = useChatStore();

  const currentConv = conversations.find((c) => c.id === activeConversationId);
  const isGroup = currentConv?.type === 'CHANNEL';
  const memberList = (currentConv?.members && currentConv.members.length > 0)
    ? currentConv.members
    : colleagues;

  interface MentionCandidate {
    id: string;
    fullName: string;
    displayLabel: string;
    email: string;
  }

  const mentionCandidates: MentionCandidate[] = useMemo(() => {
    const list: MentionCandidate[] = [];
    const hasAllAlready = text.includes('@all');
    if (isGroup && !hasAllAlready) {
      list.push({
        id: 'all',
        fullName: 'all',
        displayLabel: `all (Thông báo toàn bộ ${memberList.length} thành viên)`,
        email: 'Nhắc đến tất cả mọi người trong nhóm',
      });
    }
    memberList.forEach((m) => {
      list.push({
        id: m.id,
        fullName: m.fullName,
        displayLabel: m.fullName,
        email: m.email,
      });
    });
    return list;
  }, [isGroup, memberList, text]);

  const filteredMentionCandidates: MentionCandidate[] = useMemo(() => {
    if (!mentionQuery) return mentionCandidates;
    const q = mentionQuery.toLowerCase();
    return mentionCandidates.filter((m: MentionCandidate) => {
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.id === 'all' && 'all'.includes(q))
      );
    });
  }, [mentionCandidates, mentionQuery]);

  // Close emoji picker or mention popper on Escape
  useEffect(() => {
    if (!showEmojiPicker && !showMentionPopper) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEmojiPicker(false);
        setShowMentionPopper(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showEmojiPicker, showMentionPopper]);

  // Populate text when editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartRecording = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      }
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access denied or not available, using simulated recording mode:', err);
      setIsRecording(true);
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleSendRecording = async () => {
    if (!activeConversationId) return;
    const duration = Math.max(recordingSeconds, 1);
    const waveData = Array.from({ length: 28 }, () => Math.floor(Math.random() * 65) + 20);

    let voiceUrl = 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg';
    let attachmentId: string | undefined;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Wait short moment for recorder to flush final data chunk
    await new Promise((r) => setTimeout(r, 150));

    if (audioChunksRef.current.length > 0) {
      try {
        setIsUploading(true);
        setUploadPercent(0);
        setUploadProgress('Đang tải lên bản ghi âm MinIO S3...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceFileName = `voice-${Date.now()}.webm`;
        const uploaded = await uploadFileToMinio(
          audioBlob,
          voiceFileName,
          'audio/webm',
          activeConversationId,
          token || undefined,
          (pct) => setUploadPercent(pct),
        );
        voiceUrl = uploaded.downloadUrl || voiceUrl;
        attachmentId = uploaded.id;
      } catch (err) {
        console.warn('Voice upload to MinIO error, falling back:', err);
      } finally {
        setIsUploading(false);
        setUploadProgress('');
        setUploadPercent(0);
      }
    }

    sendMessage({
      conversationId: activeConversationId,
      content: 'Tin nhắn thoại',
      type: MessageType.VOICE,
      voice: {
        url: voiceUrl,
        duration,
        waveData,
      },
      attachments: attachmentId ? [{
        id: attachmentId,
        fileName: `voice-${duration}s.webm`,
        fileSizeBytes: 1024 * duration,
        mimeType: 'audio/webm',
        downloadUrl: voiceUrl,
      }] : undefined,
    });

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Clipboard Paste Image -> Open Preview Modal with Caption
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const url = event.target?.result as string;
            setPasteModalImage({
              url,
              file,
              name: file.name && file.name !== 'image.png' ? file.name : `screenshot-${Date.now()}.png`,
              size: file.size,
            });
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleSendPasteModalImage = async (caption: string) => {
    if (!pasteModalImage || !activeConversationId) return;
    const { url, file, name, size } = pasteModalImage;
    setPasteModalImage(null);

    setIsUploading(true);
    setUploadPercent(0);
    setUploadProgress(`Đang tải ảnh lên...: ${name}`);
    let attachment: AttachmentMetadata;
    try {
      attachment = await uploadFileToMinio(
        file,
        name,
        'image/png',
        activeConversationId,
        token || undefined,
        (pct) => setUploadPercent(pct),
      );
    } catch (err) {
      console.warn('Upload image failed, falling back:', err);
      attachment = {
        id: `temp-${Date.now()}`,
        fileName: name,
        fileSizeBytes: size,
        mimeType: 'image/png',
        downloadUrl: url,
      };
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      setUploadPercent(0);
    }

    sendMessage({
      conversationId: activeConversationId,
      content: caption || 'Đã gửi một hình ảnh',
      replyTo: replyingMessage || undefined,
      attachments: [attachment],
    });
  };

  // File Attachment Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: SelectedFile[] = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionPopper && filteredMentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMentionCandidates.length) % filteredMentionCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMentionCandidates[mentionIndex] || filteredMentionCandidates[0];
        if (selected) {
          insertMention(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionPopper(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      if (editingMessage) setEditingMessage(null);
      if (replyingMessage) setReplyingMessage(null);
      setShowMentionPopper(false);
      setShowEmojiPicker(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Only trigger mention when @ is at start of string or preceded by whitespace.
    // If preceded by another @ (e.g. @@, @@@) or non-whitespace (e.g. email@), DO NOT trigger!
    const match = val.match(/(?:^|\s)@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentionPopper(true);
      setMentionIndex(0);
    } else {
      setShowMentionPopper(false);
      setMentionQuery('');
    }
  };

  const insertMention = (candidate: { id: string; fullName: string }) => {
    const tag = candidate.id === 'all' ? '@all' : `@${candidate.fullName}`;
    setText((prev) => {
      // Replace any trailing mention query and any consecutive @ characters typed by mistake
      const replaced = prev.replace(/(?:^|\s)@+[^\s@]*$/, (matched) => {
        const leadingWhitespace = matched.startsWith(' ') || matched.startsWith('\n') ? matched[0] : '';
        return `${leadingWhitespace}${tag} `;
      });
      if (replaced !== prev) return replaced;
      const lastAt = prev.lastIndexOf('@');
      if (lastAt !== -1) {
        return prev.slice(0, lastAt) + `${tag} `;
      }
      return prev + `${tag} `;
    });
    setShowMentionPopper(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!activeConversationId) return;

    if (editingMessage) {
      if (text.trim()) {
        editMessage(editingMessage.id, text.trim());
        setText('');
      }
      return;
    }

    if (!text.trim() && !pastedImage && selectedFiles.length === 0) return;

    const finalAttachments: AttachmentMetadata[] = [];
    const filesToUpload: { name: string; size: number; type: string; file: File | Blob; previewUrl?: string }[] = selectedFiles.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      file: f.file,
      previewUrl: f.previewUrl,
    }));

    if (pastedImage) {
      try {
        const fetchRes = await fetch(pastedImage);
        const blob = await fetchRes.blob();
        filesToUpload.push({
          name: `screenshot-${Date.now()}.png`,
          size: blob.size,
          type: 'image/png',
          file: blob,
          previewUrl: pastedImage,
        });
      } catch (err) {
        console.warn('Convert pasted image error:', err);
      }
    }

    // Upload files to MinIO S3
    if (filesToUpload.length > 0) {
      setIsUploading(true);
      setUploadPercent(0);
      for (let i = 0; i < filesToUpload.length; i++) {
        const item = filesToUpload[i];
        const basePercent = Math.round((i / filesToUpload.length) * 100);
        setUploadProgress(`Đang tải tệp (${i + 1}/${filesToUpload.length}): ${item.name}`);
        try {
          const uploaded = await uploadFileToMinio(
            item.file,
            item.name,
            item.type,
            activeConversationId,
            token || undefined,
            (pct) => {
              const currentOverall = Math.round(basePercent + (pct / filesToUpload.length));
              setUploadPercent(Math.min(100, currentOverall));
            },
          );
          finalAttachments.push(uploaded);
        } catch (err) {
          console.error('Upload file to MinIO failed:', err);
          finalAttachments.push({
            id: `temp-${Date.now()}-${i}`,
            fileName: item.name,
            fileSizeBytes: item.size,
            mimeType: item.type,
            downloadUrl: item.previewUrl || '#',
          });
        }
      }
      setIsUploading(false);
      setUploadProgress('');
      setUploadPercent(0);
    }

    sendMessage({
      conversationId: activeConversationId,
      content: text.trim() || (pastedImage ? 'Ảnh chụp màn hình' : finalAttachments.length > 0 ? `Đã gửi ${finalAttachments.length} tệp đính kèm` : ''),
      replyTo: replyingMessage || undefined,
      attachments: finalAttachments.length > 0 ? finalAttachments : undefined,
    });

    setText('');
    setPastedImage(null);
    setSelectedFiles([]);
    setShowEmojiPicker(false);
    setShowMentionPopper(false);
  };

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 relative select-none">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Reply Banner */}
      {replyingMessage && (
        <div className="mb-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            <span className="text-slate-400">Đang trả lời</span>
            <span className="font-semibold text-blue-400">{replyingMessage.senderName}:</span>
            <span className="text-slate-300 truncate">{replyingMessage.content}</span>
          </div>
          <button
            onClick={() => setReplyingMessage(null)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Edit Banner */}
      {editingMessage && (
        <div className="mb-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
          <span className="font-medium text-amber-400">Đang chỉnh sửa tin nhắn (Nhấn Esc để hủy)</span>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploading Progress Indicator */}
      {isUploading && (
        <div className="mb-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg flex flex-col gap-1.5 text-xs text-blue-400 animate-in fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span className="truncate font-medium">{uploadProgress || 'Đang tải tệp lên...'}</span>
            </div>
            <span className="font-semibold text-blue-300 flex-shrink-0">{uploadPercent}%</span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Selected Attachments Preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedFiles.map((file) => (
            <div
              key={file.id}
              className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 flex items-center gap-2 text-xs pr-2"
            >
              {file.previewUrl ? (
                <img src={file.previewUrl} alt={file.name} className="w-7 h-7 rounded object-cover" />
              ) : (
                <div className="w-7 h-7 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              )}
              <div className="max-w-[120px] truncate">
                <span className="font-medium text-slate-200 block truncate text-[11px]">{file.name}</span>
                <span className="text-[9px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button
                onClick={() => removeSelectedFile(file.id)}
                className="text-slate-400 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Clipboard Pasted Image Preview */}
      {pastedImage && (
        <div className="mb-2 relative inline-block group">
          <img
            src={pastedImage}
            alt="Pasted screenshot"
            className="h-20 w-auto rounded-lg border border-slate-700 object-cover shadow-md"
          />
          <button
            onClick={() => setPastedImage(null)}
            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Mention Autocomplete Popper */}
      {showMentionPopper && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMentionPopper(false)}
          />
          <div className="absolute left-4 bottom-full mb-2 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-30 max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between px-2 mb-1.5 pb-1 border-b border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <AtSign className="w-3 h-3 text-blue-400" /> Nhắc đến thành viên
              </span>
              {mentionQuery && (
                <span className="text-[10px] text-blue-400 font-mono">@{mentionQuery}</span>
              )}
            </div>
            <div className="space-y-0.5">
              {filteredMentionCandidates.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  Không tìm thấy thành viên phù hợp
                </div>
              ) : (
                filteredMentionCandidates.map((m, idx) => {
                  const isAll = m.id === 'all';
                  const isSelected = idx === mentionIndex;

                  return (
                    <button
                      key={m.id}
                      onClick={() => insertMention(m)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-2.5 ${
                        isSelected
                          ? isAll
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg shadow-amber-500/30'
                            : 'bg-blue-600 text-white font-medium shadow-sm'
                          : isAll
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm ${
                          isAll
                            ? isSelected
                              ? 'bg-white/20 text-white ring-1 ring-white/40'
                              : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                            : isSelected
                            ? 'bg-blue-700 text-white'
                            : 'bg-slate-800 text-blue-400'
                        }`}
                      >
                        {isAll ? '📢' : m.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold truncate text-xs ${isAll && !isSelected ? 'text-amber-300 font-bold' : ''}`}>
                            {m.displayLabel || m.fullName}
                          </span>
                          {isAll && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wider flex-shrink-0 ml-1 ${
                                isSelected
                                  ? 'bg-white/25 text-white'
                                  : 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                              }`}
                            >
                              Toàn nhóm
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] block truncate font-mono mt-0.5 ${
                            isSelected ? 'text-white/80' : isAll ? 'text-amber-400/80' : 'text-slate-400'
                          }`}
                        >
                          {m.email}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowEmojiPicker(false)}
          />
          <div className="absolute right-4 bottom-full mb-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3 z-30 w-72">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Biểu cảm cảm xúc
            </span>
            <div className="grid grid-cols-6 gap-2 text-xl">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                    textareaRef.current?.focus();
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-center hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Voice Recording Active Bar */}
      {isRecording ? (
        <div className="flex items-center justify-between bg-slate-950 border border-red-500/30 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-sm font-bold text-red-400">{formatSeconds(recordingSeconds)}</span>
            <span className="text-xs text-slate-400">Đang ghi âm tin nhắn thoại...</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelRecording}
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="Hủy ghi âm"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSendRecording}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20"
              title="Gửi tin nhắn thoại"
            >
              <span>Gửi</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Regular Input Box */
        <div className="flex flex-col bg-slate-950/80 border theme-border rounded-xl focus-within:border-blue-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={t('input_placeholder')}
            rows={2}
            className="w-full bg-transparent p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          />

          {/* Action Toolbars */}
          <div className="px-3 py-2 flex items-center justify-between border-t border-slate-900/80">
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
                title="Đính kèm tệp tin / hình ảnh"
              >
                <Paperclip className="w-4 h-4 text-blue-400" />
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
                title="Chèn biểu cảm Emoji"
              >
                <Smile className="w-4 h-4 text-amber-400" />
              </button>

              <button
                type="button"
                onClick={handleStartRecording}
                className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-red-400 transition-colors"
                title="Ghi âm tin nhắn thoại"
              >
                <Mic className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => toggleCreatePoll(true)}
                className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
                title="Tạo cuộc khảo sát bình chọn"
              >
                <BarChart2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => toggleAiSummary(true)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-xs font-medium"
                title="Tóm tắt cuộc trò chuyện bằng AI (Smart Summary)"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Tóm tắt AI</span>
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={(!text.trim() && !pastedImage && selectedFiles.length === 0) || isUploading}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                !isUploading && (text.trim() || pastedImage || selectedFiles.length > 0)
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải...</span>
                </>
              ) : (
                <>
                  <span>{editingMessage ? 'Lưu' : 'Gửi'}</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Image Paste Preview Modal */}
      <ImagePastePreviewModal
        isOpen={!!pasteModalImage}
        imageUrl={pasteModalImage?.url || null}
        fileName={pasteModalImage?.name}
        fileSizeBytes={pasteModalImage?.size}
        onClose={() => setPasteModalImage(null)}
        onSend={handleSendPasteModalImage}
      />
    </div>
  );
}
