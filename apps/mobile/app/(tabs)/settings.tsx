import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Switch, Alert } from 'react-native';
import { Shield, Bell, Moon, LogOut, Info, User, Check, RefreshCw } from 'lucide-react-native';
import { useMobileChatStore } from '../../src/stores/useMobileChatStore';
import { UserRole, PresenceStatus } from '@enterprise-chat/shared-types';

const DEMO_ACCOUNTS = [
  {
    id: 'u-admin',
    fullName: 'Nguyễn Văn Quản Trị',
    email: 'admin@company.com',
    role: UserRole.SUPER_ADMIN,
    department: 'Ban Giám Đốc',
  },
  {
    id: 'u-techlead',
    fullName: 'Trần Trọng Kỹ Thuật',
    email: 'lead.tech@company.com',
    role: UserRole.DEPARTMENT_MANAGER,
    department: 'Khối Công Nghệ & Kỹ Thuật',
  },
  {
    id: 'u-dev',
    fullName: 'Lê Hoàng Lập Trình',
    email: 'developer@company.com',
    role: UserRole.EMPLOYEE,
    department: 'Khối Công Nghệ & Kỹ Thuật',
  },
];

export default function SettingsScreen() {
  const { currentUser, setCurrentUser } = useMobileChatStore();
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSwitchAccount = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setCurrentUser({
      id: acc.id,
      fullName: acc.fullName,
      email: acc.email,
      role: acc.role,
      status: PresenceStatus.ONLINE,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    });
    Alert.alert('Đổi tài khoản', `Bạn hiện đang đăng nhập với tư cách: ${acc.fullName}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng Xuất',
      'Bạn có chắc chắn muốn đăng xuất tài khoản trên thiết bị này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => Alert.alert('Đã đăng xuất', 'Phiên làm việc đã kết thúc an toàn.') },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* User Card */}
        <View
          style={{
            backgroundColor: '#0f172a',
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#1e293b',
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#2563eb',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>
              {currentUser.fullName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#f8fafc' }}>
              {currentUser.fullName}
            </Text>
            <Text style={{ fontSize: 12, color: '#38bdf8', marginTop: 2 }}>
              {currentUser.role} • {currentUser.email}
            </Text>
          </View>
        </View>

        {/* Section: Chuyển đổi tài khoản Demo để test */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4 }}>
          Tài Khoản Thử Nghiệm (Chuyển vai trò)
        </Text>
        <View style={{ backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20, padding: 8, gap: 6 }}>
          {DEMO_ACCOUNTS.map((acc) => {
            const isSelected = acc.id === currentUser.id;

            return (
              <TouchableOpacity
                key={acc.id}
                onPress={() => handleSwitchAccount(acc)}
                style={{
                  backgroundColor: isSelected ? '#1e3a8a' : '#020617',
                  borderWidth: 1,
                  borderColor: isSelected ? '#3b82f6' : '#1e293b',
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>
                    {acc.fullName}
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                    {acc.department} ({acc.role})
                  </Text>
                </View>

                {isSelected && <Check color="#38bdf8" size={18} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section: Bảo Mật */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4 }}>
          Bảo Mật & Riêng Tư
        </Text>
        <View style={{ backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 }}>
          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Shield color="#38bdf8" size={20} />
              <Text style={{ color: '#f1f5f9', fontSize: 14, fontWeight: '500' }}>
                Xác thực sinh trắc học (FaceID / TouchID)
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: '#334155', true: '#2563eb' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Section: Thông Báo */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4 }}>
          Thông Báo & Âm Thanh
        </Text>
        <View style={{ backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 }}>
          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Bell color="#fbbf24" size={20} />
              <Text style={{ color: '#f1f5f9', fontSize: 14, fontWeight: '500' }}>
                Thông báo tin nhắn mới
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#334155', true: '#2563eb' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Bell color="#34d399" size={20} />
              <Text style={{ color: '#f1f5f9', fontSize: 14, fontWeight: '500' }}>
                Âm thanh thông báo
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#334155', true: '#2563eb' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Section: Thông tin ứng dụng */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 4 }}>
          Hệ Thống
        </Text>
        <View style={{ backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 24 }}>
          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Info color="#94a3b8" size={20} />
              <Text style={{ color: '#f1f5f9', fontSize: 14 }}>Phiên bản Mobile</Text>
            </View>
            <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: 'bold' }}>v2.0 (Expo SDK 58)</Text>
          </View>
          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Moon color="#a855f7" size={20} />
              <Text style={{ color: '#f1f5f9', fontSize: 14 }}>Giao diện</Text>
            </View>
            <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '600' }}>Enterprise Dark</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: '#1e293b',
            borderWidth: 1,
            borderColor: '#dc2626',
            padding: 14,
            borderRadius: 14,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <LogOut color="#ef4444" size={18} />
          <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 14 }}>
            Đăng Xuất Tài Khoản
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
