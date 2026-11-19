/* Lets phones install the staff app. It does not store any hotel data: every request goes straight to the server. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
