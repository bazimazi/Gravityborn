import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(name)));
    else if (entry.name !== 'sw.js') result.push(name);
  }
  return result;
}
const assets = (await files('dist')).sort();
const hash = createHash('sha256');
for (const file of assets) hash.update(file).update(await readFile(file));
const version = hash.digest('hex').slice(0, 16);
const urls = assets.map((file) => '/' + path.relative('dist', file).replaceAll('\\', '/'));
await writeFile(
  'dist/sw.js',
  `// Generated atomically with this build. Updates activate after existing tabs close.
const CACHE = 'gravityborn-shell-${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('gravityborn-shell-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = event.request.mode === 'navigate' ? '/index.html' : url.pathname;
    return (await cache.match(key)) || fetch(event.request);
  })());
});
`,
);
console.log(`Offline shell ${version}: ${urls.length} local assets.`);
