self.addEventListener('push', function(event) {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'Forexyy News', body: event.data.text() };
    }
  }

  const title = payload.title || 'New Story on Forexyy';
  const options = {
    body: payload.body || 'Check out our latest news and analysis.',
    icon: payload.icon || '/forexyy_logo_80.png',
    badge: '/forexyy_logo_80.png',
    data: {
      url: payload.url || 'https://forexyy.com'
    },
    vibrate: [100, 50, 100],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || 'https://forexyy.com';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window is already open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.startsWith('https://forexyy.com') && 'focus' in client) {
          client.focus();
          // Optional: client.navigate(urlToOpen);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
