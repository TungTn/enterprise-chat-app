import { Platform } from 'react-native';
import Constants from 'expo-constants';

declare const process: { env: Record<string, string | undefined> };

const getDevHost = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:4000/api`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api';
};

export const API_BASE_URL = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) || getDevHost();

export async function mobileApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi hệ thống: ${response.status}`);
  }

  return response.json();
}
