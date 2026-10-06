/* Tenura service worker — receives reminder push notifications.
   It deliberately does not cache pages: the app always loads fresh from the network. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Tenura', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Tenura reminder';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'You have a payment coming up.',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: data.tag || title,
      data: { url: data.url || './#/app' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || './#/app', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.registration.scope));
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
