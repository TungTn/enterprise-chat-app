// Enterprise Chat Service Worker - Background Notifications & Offline Handler
const CACHE_NAME = 'enterprise-chat-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push notifications (Web Push)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Enterprise Chat';
    const options = {
      body: data.body || 'Bạn có tin nhắn mới',
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'chat-notification',
      renotify: true,
      data: {
        url: data.url || '/',
        conversationId: data.conversationId,
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.warn('[SW] Push parse error:', err);
  }
});

// Handle clicking on Windows Action Center / OS notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const targetConvId = event.notification.data?.conversationId;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus if already open
      for (const client of clientList) {
        if ('focus' in client) {
          if (targetConvId) {
            client.postMessage({
              type: 'NAVIGATE_CONVERSATION',
              conversationId: targetConvId,
            });
          }
          return client.focus();
        }
      }
      // Open new window if not open
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Receive direct message from web app to display background notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
