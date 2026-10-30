export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    // Calling /api on the same port (3000) avoids Windows Firewall blocking port 4000
    // Next.js rewrites transparently proxies /api to port 4000 internally!
    return '/api';
  }
  return 'http://localhost:4000/api';
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('enterprise_chat_token') : null);
  if (authToken && authToken !== 'mock-token-admin') {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi hệ thống: ${response.status}`);
  }

  return response.json();
}
