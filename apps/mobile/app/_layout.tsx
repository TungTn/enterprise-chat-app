import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#020617' }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0f172a' },
            headerTintColor: '#f8fafc',
            headerTitleStyle: { fontWeight: 'bold' },
            contentStyle: { backgroundColor: '#020617' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="chat/[id]"
            options={{
              title: 'Cuộc hội thoại',
              headerBackTitle: 'Quay lại',
            }}
          />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}
