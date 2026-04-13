self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'https://d1yei2z3i6k35z.cloudfront.net/10516146/675d2acfd4750_LogoOtoChatNBG.003.png',
    badge: 'https://d1yei2z3i6k35z.cloudfront.net/10516146/675d2acfd4750_LogoOtoChatNBG.003.png',
    data: {
      url: data.url,
      waLink: data.waLink
    },
    actions: [
      { action: 'view', title: '📋 View Lead' },
      { action: 'whatsapp', title: '💬 Send Message' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const data = event.notification.data;
  const action = event.action;

  if (action === 'whatsapp' && data.waLink) {
    event.waitUntil(
      clients.openWindow(data.waLink)
    );
  } else if (data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        for (let client of windowClients) {
          if (client.url === data.url && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(data.url);
      })
    );
  }
});
