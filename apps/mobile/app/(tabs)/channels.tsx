import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Hash, Lock, Plus, X, Globe, Building } from 'lucide-react-native';
import { ChannelScope, ConversationType } from '@enterprise-chat/shared-types';
import { useMobileChatStore } from '../../src/stores/useMobileChatStore';

export default function ChannelsScreen() {
  const router = useRouter();
  const { conversations, messagesMap, addChannel, initMobileAuth } = useMobileChatStore();

  useEffect(() => {
    initMobileAuth();
  }, []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelScope, setChannelScope] = useState<ChannelScope>(ChannelScope.COMPANY);

  // Filter only channel conversations
  const channels = conversations.filter((c) => c.type === ConversationType.CHANNEL);

  const handleCreateChannel = () => {
    if (!channelName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên kênh.');
      return;
    }

    const id = addChannel({
      name: channelName.trim().toLowerCase().replace(/\s+/g, '-'),
      scope: channelScope,
      description: channelDesc.trim(),
    });

    setChannelName('');
    setChannelDesc('');
    setShowCreateModal(false);

    // Navigate to newly created channel
    router.push(`/chat/${id}` as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#f8fafc' }}>
              Kênh Trao Đổi
            </Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
              Toàn công ty & Phòng ban ({channels.length} kênh)
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#2563eb',
              padding: 10,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus color="#ffffff" size={18} />
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold' }}>Tạo Kênh</Text>
          </TouchableOpacity>
        </View>

        {/* Channels List */}
        <View style={{ gap: 10 }}>
          {channels.map((channel) => {
            const msgs = messagesMap[channel.id] || [];
            const lastMsg = msgs[msgs.length - 1];

            return (
              <TouchableOpacity
                key={channel.id}
                onPress={() => router.push(`/chat/${channel.id}` as any)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: '#0f172a',
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#1e293b',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: channel.scope === ChannelScope.COMPANY ? '#1e3a8a' : '#1e293b',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 14,
                    }}
                  >
                    {channel.scope === ChannelScope.DEPARTMENT ? (
                      <Lock color="#38bdf8" size={20} />
                    ) : (
                      <Hash color="#60a5fa" size={22} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#f1f5f9' }}>
                        #{channel.name}
                      </Text>
                      {lastMsg?.createdAt && (
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{lastMsg.createdAt}</Text>
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}
                    >
                      {lastMsg ? `${lastMsg.senderName.split(' ')[0]}: ${lastMsg.content}` : channel.description || 'Chưa có tin nhắn'}
                    </Text>
                  </View>
                </View>

                {channel.unreadCount > 0 && (
                  <View
                    style={{
                      backgroundColor: '#2563eb',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                      {channel.unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal: Tạo Kênh Mới */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#0f172a',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              gap: 16,
              borderWidth: 1,
              borderColor: '#1e293b',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: 'bold' }}>
                Tạo Kênh Trao Đổi Mới
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X color="#94a3b8" size={22} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '500' }}>Tên kênh (viết liền hoặc gạch ngang):</Text>
              <TextInput
                value={channelName}
                onChangeText={setChannelName}
                placeholder="ví dụ: du-an-mobile-2026"
                placeholderTextColor="#64748b"
                style={{
                  backgroundColor: '#020617',
                  color: '#ffffff',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#334155',
                  fontSize: 15,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '500' }}>Phạm vi kênh:</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setChannelScope(ChannelScope.COMPANY)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: channelScope === ChannelScope.COMPANY ? '#2563eb' : '#334155',
                    backgroundColor: channelScope === ChannelScope.COMPANY ? '#1e3a8a' : '#020617',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Globe color={channelScope === ChannelScope.COMPANY ? '#60a5fa' : '#94a3b8'} size={18} />
                  <Text style={{ color: '#f1f5f9', fontSize: 13, fontWeight: '600' }}>Toàn công ty</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setChannelScope(ChannelScope.DEPARTMENT)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: channelScope === ChannelScope.DEPARTMENT ? '#2563eb' : '#334155',
                    backgroundColor: channelScope === ChannelScope.DEPARTMENT ? '#1e3a8a' : '#020617',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Building color={channelScope === ChannelScope.DEPARTMENT ? '#60a5fa' : '#94a3b8'} size={18} />
                  <Text style={{ color: '#f1f5f9', fontSize: 13, fontWeight: '600' }}>Phòng ban</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '500' }}>Mô tả kênh (tùy chọn):</Text>
              <TextInput
                value={channelDesc}
                onChangeText={setChannelDesc}
                placeholder="Mô tả mục đích hoạt động của kênh..."
                placeholderTextColor="#64748b"
                style={{
                  backgroundColor: '#020617',
                  color: '#ffffff',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#334155',
                  fontSize: 14,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleCreateChannel}
              style={{
                backgroundColor: '#2563eb',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 'bold' }}>
                Xác Nhận Tạo Kênh
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
