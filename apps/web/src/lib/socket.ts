import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${host}:4000/chat`;
  }
  return 'http://localhost:4000/chat';
}

export function getSocket(token?: string): Socket {
  if (!socket && token) {
    const wsUrl = getWsUrl();
    socket = io(wsUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Enterprise Chat WebSocket Gateway');
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Disconnected from Chat Gateway:', reason);
    });
  }

  return socket!;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Request and dispatch Native Desktop Notifications
export function showDesktopNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined') return;

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, {
            icon: '/favicon.ico',
            ...options,
          });
        }
      });
    }
  }
}
