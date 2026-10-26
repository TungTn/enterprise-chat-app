import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { UserPlus, X, MessageSquare, Check } from 'lucide-react-native';
import { PresenceStatus, UserRole, ConversationType } from '@enterprise-chat/shared-types';
import { useMobileChatStore } from '../../src/stores/useMobileChatStore';

interface ColleagueDirectory {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: PresenceStatus;
  department: string;
}

const COMPANY_STAFF: ColleagueDirectory[] = [
  {
    id: 'lead',
    fullName: 'Trần Trọng Kỹ Thuật (Tech Lead)',
    email: 'lead.tech@company.com',
    role: UserRole.DEPARTMENT_MANAGER,
    status: PresenceStatus.ONLINE,
    department: 'Công Nghệ & Kỹ Thuật',
  },
  {
    id: 'dev',
    fullName: 'Lê Hoàng Lập Trình (Dev)',
    email: 'developer@company.com',
    role: UserRole.EMPLOYEE,
    status: PresenceStatus.ONLINE,
    department: 'Công Nghệ & Kỹ Thuật',
  },
  {
    id: 'hr',
    fullName: 'Phạm Thị Nhân Sự (HR)',
    email: 'hr@company.com',
    role: UserRole.EMPLOYEE,
    status: PresenceStatus.AWAY,
    department: 'Phòng Nhân Sự',
  },
  {
    id: 'finance',
    fullName: 'Vũ Thị Kế Toán (Finance)',
    email: 'finance@company.com',
    role: UserRole.EMPLOYEE,
    status: PresenceStatus.BUSY,
    department: 'Tài Chính Kế Toán',
  },
];

export default function DirectMessagesScreen() {
  const router = useRouter();
  const { conversations, messagesMap, addDirectMessage } = useMobileChatStore();
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Filter conversations of type DIRECT
  const directChats = conversations.filter((c) => c.type === ConversationType.DIRECT);

  const getStatusColor = (status: PresenceStatus) => {
    switch (status) {
      case PresenceStatus.ONLINE:
        return '#10b981'; // emerald-500
      case PresenceStatus.AWAY:
        return '#f59e0b'; // amber-500
      case PresenceStatus.BUSY:
        return '#ef4444'; // red-500
      default:
        return '#64748b'; // slate-500
    }
  };

  const handleStartChatWith = (staff: ColleagueDirectory) => {
    const dmId = addDirectMessage({
      id: staff.id,
      fullName: staff.fullName,
      department: staff.department,
    });
    setShowStaffModal(false);
    router.push(`/chat/${dmId}` as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#f8fafc' }}>
              Tin Nhắn Trực Tiếp
            </Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
              Trò chuyện 1-1 riêng tư ({directChats.length} hội thoại)
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowStaffModal(true)}
            style={{
              backgroundColor: '#2563eb',
              padding: 10,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <UserPlus color="#ffffff" size={18} />
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold' }}>Chat Mới</Text>
          </TouchableOpacity>
        </View>

        {/* Direct Conversations List */}
        <View style={{ gap: 10 }}>
          {directChats.map((item) => {
            const msgs = messagesMap[item.id] || [];
            const lastMsg = msgs[msgs.length - 1];

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(`/chat/${item.id}` as any)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: '#0f172a',
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#1e293b',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View style={{ position: 'relative', marginRight: 14 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#1e293b',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#334155',
                    }}
                  >
                    <Text style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: 16 }}>
                      {item.name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: '#10b981',
                      borderWidth: 2,
                      borderColor: '#0f172a',
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#f1f5f9' }}>
                      {item.name}
                    </Text>
                    {lastMsg?.createdAt && (
                      <Text style={{ fontSize: 11, color: '#64748b' }}>{lastMsg.createdAt}</Text>
                    )}
                  </View>

                  <Text numberOfLines={1} style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {lastMsg ? `${lastMsg.senderName.split(' ')[0]}: ${lastMsg.content}` : 'Bắt đầu cuộc trò chuyện'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal: Chọn nhân sự từ danh bạ công ty */}
      <Modal visible={showStaffModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#0f172a',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              gap: 16,
              maxHeight: '80%',
              borderWidth: 1,
              borderColor: '#1e293b',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: 'bold' }}>
                  Danh Bạ Doanh Nghiệp
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                  Chọn đồng nghiệp để bắt đầu trò chuyện trực tiếp
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowStaffModal(false)}>
                <X color="#94a3b8" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10 }}>
              {COMPANY_STAFF.map((staff) => (
                <TouchableOpacity
                  key={staff.id}
                  onPress={() => handleStartChatWith(staff)}
                  style={{
                    backgroundColor: '#020617',
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#1e293b',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#1e293b',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                        {staff.fullName.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#f1f5f9', fontSize: 14, fontWeight: '600' }}>
                        {staff.fullName}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                        {staff.department} • {staff.email}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: getStatusColor(staff.status),
                    }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
