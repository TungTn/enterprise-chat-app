import React from 'react';
import { Tabs } from 'expo-router';
import { Hash, MessageSquare, Users, Settings } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: 'Kênh',
          headerTitle: 'Kênh Thảo Luận',
          tabBarIcon: ({ color, size }) => <Hash color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="direct"
        options={{
          title: 'Trực tiếp',
          headerTitle: 'Tin Nhắn Trực Tiếp',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài đặt',
          headerTitle: 'Cài Đặt Hệ Thống',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
