// Sunshine Play School ERP — Service Worker & Push Notification Handler
const CACHE_NAME = 'sunshine-erp-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push Notification Handler
self.addEventListener('push', (event) => {
  let data = {
    title: 'Sunshine Play School',
    body: 'New notification from Sunshine Play School ERP',
    url: '/staff/messages',
    icon: '/apple-touch-icon.png',
    badge: '/favicon.png',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/apple-touch-icon.png',
    badge: data.badge || '/favicon.png',
    data: {
      url: data.url || '/staff/messages',
      timestamp: Date.now(),
    },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler — Route to target page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
