/**
 * Receives a SyncPack (manifest + every local table) and keeps it as one dated JSON file per
 * device: data/<deviceId>/<exportedAt>.json. Files are never overwritten or merged, so a phone
 * that was reset cannot erase what an earlier sync kept. The payload is stored as sent: the same
 * inspectable JSON the chest exports, no account, no parsing beyond naming the file.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const MAX_BYTES = 50 * 1024 * 1024; // ponytail: a whole farm is a few MB; raise when a sync hits it
const DEVICE_ID = /^[a-z0-9-]{1,64}$/i; // the folder name comes from the client, so no slashes or dots

/** Connect-style middleware: handles /api/sync, calls next() for anything else */
export function syncHandler(dataDir) {
  return async (req, res, next) => {
    if (new URL(req.url, 'http://x').pathname !== '/api/sync') return next();
    // A native build (capacitor://) or the Vite dev origin posts cross-origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    if (req.method !== 'POST') return reply(res, 405, { error: 'POST a SyncPack here' });

    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > MAX_BYTES) return reply(res, 413, { error: `larger than ${MAX_BYTES} bytes` });
    }
    let pack;
    try { pack = JSON.parse(body); } catch { return reply(res, 400, { error: 'invalid JSON' }); }
    const { deviceId, exportedAt } = pack?.manifest ?? {};
    if (!DEVICE_ID.test(deviceId ?? '') || typeof pack.tables !== 'object' || pack.tables === null) {
      return reply(res, 400, { error: 'expected manifest.deviceId and tables' });
    }

    const stamp = (Number.isNaN(Date.parse(exportedAt)) ? new Date().toISOString() : exportedAt).replace(/[:.]/g, '-');
    const file = join(deviceId, `${stamp}.json`);
    try {
      await mkdir(join(dataDir, deviceId), { recursive: true });
      await writeFile(join(dataDir, file), JSON.stringify(pack, null, 2));
    } catch (err) {
      console.error('sync: could not write', file, err);
      return reply(res, 500, { error: 'could not store the pack' });
    }
    const records = Object.values(pack.tables).reduce((n, rows) => n + (Array.isArray(rows) ? rows.length : 0), 0);
    console.log(`sync: ${records} records from ${deviceId} → ${file}`);
    reply(res, 200, { ok: true, file, records });
  };
}

function reply(res, status, json) {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(json));
}
