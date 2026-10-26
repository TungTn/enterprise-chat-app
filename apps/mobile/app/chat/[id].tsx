import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Send,
  Paperclip,
  ArrowLeft,
  Phone,
  Video,
  Sparkles,
  X,
  Mic,
  MicOff,
  PhoneOff,
  FileText,
  Play,
  Pause,
  BarChart2,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react-native';
import { useMobileChatStore } from '../../src/stores/useMobileChatStore';
import { MessageType } from '@enterprise-chat/shared-types';

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const convId = id || 'c-general';

  const {
    currentUser,
    conversations,
    messagesMap,
    sendMessage,
    toggleReaction,
    votePoll,
    aiSummary,
    isGeneratingSummary,
    generateAiSummary,
    fetchRemoteMessages,
  } = useMobileChatStore();

  useEffect(() => {
    if (convId) {
      fetchRemoteMessages(convId);
    }
  }, [convId]);

  const [inputText, setInputText] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Dynamic conversation lookup or fallback
  const conversation = conversations.find((c) => c.id === convId) || {
    id: convId,
    name: convId.startsWith('dm-') ? 'Đồng Nghiệp' : `#${convId.replace('c-', '')}`,
    description: 'Hội thoại nội bộ',
  };

  const convDisplayName = conversation.name || 'Cuộc trò chuyện';
  const messages = messagesMap[convId] || [];

  // Call timer simulation
  useEffect(() => {
    let timer: any;
    if (showCallModal) {
      timer = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(timer);
  }, [showCallModal]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage({
      conversationId: convId,
      content: inputText.trim(),
    });
    setInputText('');
  };

  const handleSendSampleImage = () => {
    setShowAttachModal(false);
    sendMessage({
      conversationId: convId,
      content: 'Đã gửi hình ảnh sơ đồ kiến trúc hệ thống:',
      type: MessageType.ATTACHMENT,
      attachments: [
        {
          id: `att-${Date.now()}`,
          fileName: 'So_Do_Kien_Truc_He_Thong.png',
          fileSizeBytes: 1850000,
          mimeType: 'image/png',
        },
      ],
    });
  };

  const handleSendSampleDoc = () => {
    setShowAttachModal(false);
    sendMessage({
      conversationId: convId,
      content: 'Tài liệu báo cáo tiến độ tuần:',
      type: MessageType.ATTACHMENT,
      attachments: [
        {
          id: `att-${Date.now()}`,
          fileName: 'Bao_Cao_Tien_Do_Tuan.pdf',
          fileSizeBytes: 3200000,
          mimeType: 'application/pdf',
        },
      ],
    });
  };

  const handleSendSampleVoice = () => {
    setShowAttachModal(false);
    sendMessage({
      conversationId: convId,
      content: 'Tin nhắn thoại (0:12):',
      type: MessageType.VOICE,
      voice: {
        url: 'https://example.com/voice-12s.m4a',
        duration: 12,
      },
    });
  };

  const handleSendQuickPoll = () => {
    setShowAttachModal(false);
    sendMessage({
      conversationId: convId,
      content: 'Bình chọn nhanh trong phòng:',
      type: MessageType.POLL,
      poll: {
        id: `poll-${Date.now()}`,
        question: 'Team mình có đồng ý chốt kế hoạch tuần này không?',
        options: [
          { id: 'opt-yes', text: 'Đồng ý 100% 🚀', voterIds: [currentUser.id] },
          { id: 'opt-need-review', text: 'Cần họp thảo luận thêm ☕', voterIds: [] },
        ],
        isMultiple: false,
        totalVotes: 1,
      },
    });
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      {/* Header Bar */}
      <View
        style={{
          height: 58,
          backgroundColor: '#0f172a',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#1e293b',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft color="#94a3b8" size={22} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}
            >
              {convDisplayName}
            </Text>
            <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '500' }}>
              Trực tuyến • Enterprise Bảo Mật
            </Text>
          </View>
        </View>

        {/* Call & AI Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity
            onPress={() => {
              setCallType('audio');
              setShowCallModal(true);
            }}
            style={{ padding: 4 }}
          >
            <Phone color="#38bdf8" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setCallType('video');
              setShowCallModal(true);
            }}
            style={{ padding: 4 }}
          >
            <Video color="#38bdf8" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setShowSummaryModal(true);
              generateAiSummary(convDisplayName);
            }}
            style={{ padding: 4 }}
          >
            <Sparkles color="#c084fc" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Stream */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={{ flex: 1, padding: 16 }}
          contentContainerStyle={{ paddingBottom: 24, gap: 14 }}
        >
          {messages.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 }}>
              <Text style={{ color: '#64748b', fontSize: 14 }}>Chưa có tin nhắn trong cuộc trò chuyện này.</Text>
              <Text style={{ color: '#38bdf8', fontSize: 12 }}>Hãy gửi tin nhắn đầu tiên để bắt đầu!</Text>
            </View>
          ) : (
            messages.map((item) => {
              const isSelf = item.senderId === currentUser.id;

              return (
                <View
                  key={item.id}
                  style={{
                    alignSelf: isSelf ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  {!isSelf && (
                    <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, marginLeft: 4 }}>
                      {item.senderName}
                    </Text>
                  )}

                  {/* Message Bubble */}
                  <View
                    style={{
                      backgroundColor: isSelf ? '#2563eb' : '#0f172a',
                      borderRadius: 18,
                      padding: 12,
                      borderWidth: isSelf ? 0 : 1,
                      borderColor: '#1e293b',
                    }}
                  >
                    {item.content ? (
                      <Text style={{ color: '#ffffff', fontSize: 14, lineHeight: 20 }}>
                        {item.content}
                      </Text>
                    ) : null}

                    {/* Poll Component */}
                    {item.type === MessageType.POLL && item.poll && (
                      <View
                        style={{
                          marginTop: 10,
                          backgroundColor: '#020617',
                          borderRadius: 12,
                          padding: 12,
                          gap: 10,
                          borderWidth: 1,
                          borderColor: '#1e293b',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <BarChart2 color="#38bdf8" size={16} />
                          <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: 'bold' }}>
                            {item.poll.question}
                          </Text>
                        </View>

                        {item.poll.options.map((opt: any) => {
                          const hasVoted = opt.voterIds.includes(currentUser.id);
                          const total = item.poll ? item.poll.totalVotes : 1;
                          const pct = total > 0
                            ? Math.round((opt.voterIds.length / total) * 100)
                            : 0;

                          return (
                            <TouchableOpacity
                              key={opt.id}
                              onPress={() => votePoll(convId, item.id, opt.id)}
                              activeOpacity={0.7}
                              style={{
                                backgroundColor: hasVoted ? '#1e3a8a' : '#0f172a',
                                borderWidth: 1,
                                borderColor: hasVoted ? '#3b82f6' : '#334155',
                                borderRadius: 10,
                                padding: 10,
                                gap: 6,
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: '#f8fafc', fontSize: 13, fontWeight: hasVoted ? '600' : '400' }}>
                                  {hasVoted ? '✓ ' : ''}{opt.text}
                                </Text>
                                <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>
                                  {pct}% ({opt.voterIds.length})
                                </Text>
                              </View>

                              {/* Progress bar */}
                              <View style={{ height: 4, backgroundColor: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                                <View style={{ height: 4, width: `${pct}%`, backgroundColor: '#38bdf8' }} />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Attachment Component */}
                    {item.type === MessageType.ATTACHMENT && item.attachments && item.attachments.length > 0 && (
                      <View style={{ gap: 6, marginTop: 8 }}>
                        {item.attachments.map((att) => (
                          <TouchableOpacity
                            key={att.id}
                            onPress={() => Alert.alert('Tệp đính kèm', `Đang mở: ${att.fileName}`)}
                            style={{
                              backgroundColor: '#020617',
                              borderRadius: 12,
                              padding: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              borderWidth: 1,
                              borderColor: '#334155',
                            }}
                          >
                            <FileText color="#38bdf8" size={24} />
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>
                                {att.fileName}
                              </Text>
                              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                                {(att.fileSizeBytes / 1024 / 1024).toFixed(1)} MB • Nhấn để xem
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Voice Component */}
                    {item.type === MessageType.VOICE && (
                      <TouchableOpacity
                        onPress={() => setPlayingVoiceId(playingVoiceId === item.id ? null : item.id)}
                        style={{
                          marginTop: 8,
                          backgroundColor: '#020617',
                          borderRadius: 12,
                          padding: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          borderWidth: 1,
                          borderColor: '#334155',
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#2563eb',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {playingVoiceId === item.id ? (
                            <Pause color="#ffffff" size={16} />
                          ) : (
                            <Play color="#ffffff" size={16} />
                          )}
                        </View>

                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          {[40, 70, 30, 90, 60, 100, 40, 80, 50, 70, 30].map((h, idx) => (
                            <View
                              key={idx}
                              style={{
                                width: 3,
                                height: (h * 16) / 100,
                                backgroundColor: playingVoiceId === item.id ? '#38bdf8' : '#64748b',
                                borderRadius: 2,
                              }}
                            />
                          ))}
                        </View>

                        <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>
                          0:{item.voice?.duration || 15}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <Text
                      style={{
                        fontSize: 10,
                        color: isSelf ? '#bfdbfe' : '#64748b',
                        alignSelf: 'flex-end',
                        marginTop: 6,
                      }}
                    >
                      {item.createdAt}
                    </Text>
                  </View>

                  {/* Reaction Row */}
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {item.reactions &&
                      Object.entries(item.reactions).map(([emoji, userIds]) => {
                        if (userIds.length === 0) return null;
                        const hasReacted = userIds.includes(currentUser.id);

                        return (
                          <TouchableOpacity
                            key={emoji}
                            onPress={() => toggleReaction(convId, item.id, emoji)}
                            style={{
                              backgroundColor: hasReacted ? '#1e3a8a' : '#0f172a',
                              borderWidth: 1,
                              borderColor: hasReacted ? '#3b82f6' : '#334155',
                              borderRadius: 12,
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>{emoji}</Text>
                            <Text style={{ fontSize: 11, color: hasReacted ? '#60a5fa' : '#94a3b8', fontWeight: 'bold' }}>
                              {userIds.length}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                    {/* Quick Reaction buttons */}
                    <TouchableOpacity
                      onPress={() => toggleReaction(convId, item.id, '👍')}
                      style={{
                        backgroundColor: '#0f172a',
                        borderRadius: 12,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: '#1e293b',
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>👍</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleReaction(convId, item.id, '❤️')}
                      style={{
                        backgroundColor: '#0f172a',
                        borderRadius: 12,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: '#1e293b',
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>❤️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: '#0f172a',
            borderTopWidth: 1,
            borderTopColor: '#1e293b',
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => setShowAttachModal(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#1e293b',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Paperclip color="#38bdf8" size={18} />
          </TouchableOpacity>

          <TextInput
            style={{
              flex: 1,
              backgroundColor: '#020617',
              color: '#ffffff',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 14,
              borderWidth: 1,
              borderColor: '#334155',
            }}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#64748b"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={{
              backgroundColor: inputText.trim() ? '#2563eb' : '#1e293b',
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send color={inputText.trim() ? '#ffffff' : '#64748b'} size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modal: Đính kèm đa phương tiện */}
      <Modal visible={showAttachModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#0f172a',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              gap: 14,
              borderWidth: 1,
              borderColor: '#1e293b',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: 'bold' }}>
                Đính Kèm & Tiện Ích
              </Text>
              <TouchableOpacity onPress={() => setShowAttachModal(false)}>
                <X color="#94a3b8" size={22} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={handleSendSampleImage}
                style={{
                  backgroundColor: '#020617',
                  padding: 14,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: '#1e293b',
                }}
              >
                <ImageIcon color="#38bdf8" size={20} />
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>Gửi Ảnh Sơ Đồ Hệ Thống</Text>
                  <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Định dạng PNG/JPG chất lượng cao</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendSampleDoc}
                style={{
                  backgroundColor: '#020617',
                  padding: 14,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: '#1e293b',
                }}
              >
                <FileText color="#10b981" size={20} />
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>Gửi Báo Cáo PDF</Text>
                  <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Tệp tin tài liệu doanh nghiệp</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendSampleVoice}
                style={{
                  backgroundColor: '#020617',
                  padding: 14,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: '#1e293b',
                }}
              >
                <Mic color="#f59e0b" size={20} />
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>Gửi Tin Nhắn Thoại (Voice)</Text>
                  <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Ghi âm giọng nói 12 giây</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendQuickPoll}
                style={{
                  backgroundColor: '#020617',
                  padding: 14,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: '#1e293b',
                }}
              >
                <BarChart2 color="#a855f7" size={20} />
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>Tạo Cuộc Khảo Sát Bình Chọn</Text>
                  <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Thu thập ý kiến đồng nghiệp</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Cuộc gọi Voice / Video */}
      <Modal visible={showCallModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: '#020617',
            justifyContent: 'space-between',
            paddingVertical: 50,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          <View style={{ alignItems: 'center', gap: 12, marginTop: 40 }}>
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: '#1e293b',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#38bdf8',
              }}
            >
              <Text style={{ color: '#38bdf8', fontSize: 32, fontWeight: 'bold' }}>
                {convDisplayName.charAt(0)}
              </Text>
            </View>

            <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: 'bold' }}>
              {convDisplayName}
            </Text>
            <Text style={{ color: '#38bdf8', fontSize: 14, fontWeight: '500' }}>
              {callType === 'video' ? 'Cuộc gọi Video Nội Bộ' : 'Cuộc gọi Thoại Nội Bộ'}
            </Text>
            <Text style={{ color: '#10b981', fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>
              {formatTimer(callSeconds)}
            </Text>
          </View>

          {/* Controls */}
          <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setIsMicMuted(!isMicMuted)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: isMicMuted ? '#ef4444' : '#1e293b',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isMicMuted ? <MicOff color="#ffffff" size={24} /> : <Mic color="#ffffff" size={24} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowCallModal(false)}
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: '#dc2626',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <PhoneOff color="#ffffff" size={32} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsVideoMuted(!isVideoMuted)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: isVideoMuted ? '#ef4444' : '#1e293b',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Video color="#ffffff" size={24} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Tóm tắt AI */}
      <Modal visible={showSummaryModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#0f172a',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: '80%',
              gap: 16,
              borderWidth: 1,
              borderColor: '#1e293b',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles color="#c084fc" size={20} />
                <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: 'bold' }}>
                  AI Smart Summary
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSummaryModal(false)}>
                <X color="#94a3b8" size={22} />
              </TouchableOpacity>
            </View>

            {isGeneratingSummary ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
                <Text style={{ color: '#c084fc', fontSize: 14 }}>Đang phân tích tin nhắn và tổng hợp...</Text>
              </View>
            ) : aiSummary ? (
              <ScrollView contentContainerStyle={{ gap: 14 }}>
                <View style={{ backgroundColor: '#020617', padding: 14, borderRadius: 12 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' }}>Chủ đề chính</Text>
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600', marginTop: 4 }}>{aiSummary.topic}</Text>
                </View>

                <View style={{ backgroundColor: '#020617', padding: 14, borderRadius: 12, gap: 6 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' }}>Nội dung thảo luận chính</Text>
                  {aiSummary.keyPoints.map((pt, idx) => (
                    <Text key={idx} style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 18 }}>• {pt}</Text>
                  ))}
                </View>

                <View style={{ backgroundColor: '#020617', padding: 14, borderRadius: 12, gap: 6 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' }}>Hành động tiếp theo (Action Items)</Text>
                  {aiSummary.actionItems && aiSummary.actionItems.map((act, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CheckCircle color="#10b981" size={14} />
                      <Text style={{ color: '#f1f5f9', fontSize: 13 }}>{act.task}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
