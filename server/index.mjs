/**
 * The farmer's own server: serves the built app (dist/) to phones on the local network and keeps
 * every sync under server/data/. Run `npm run build` once, then `npm run serve`.
 *   PORT              port to listen on (default 8787)
 *   KATUBAYA_DATA_DIR where copies are kept (default server/data)
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncHandler } from './sync.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const dist = join(here, '..', 'dist');
const port = Number(process.env.PORT ?? 8787);
const dataDir = process.env.KATUBAYA_DATA_DIR ?? join(here, 'data');
const sync = syncHandler(dataDir);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const isFile = f => { try { return statSync(f).isFile(); } catch { return false; } };

function serveApp(req, res) {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(dist, path));
  if (!file.startsWith(dist) || !isFile(file)) file = join(dist, 'index.html'); // the app routes client-side
  if (!isFile(file)) return res.writeHead(404, { 'content-type': 'text/plain' }).end('dist/ is missing: run `npm run build` first');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}

createServer((req, res) => sync(req, res, () => serveApp(req, res)).catch(err => {
  console.error(err);
  res.writeHead(500).end();
})).listen(port, () => {
  const lan = Object.values(networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`katūbayá server · copies in ${dataDir}`);
  for (const host of ['localhost', ...lan]) console.log(`  http://${host}:${port}`);
});
