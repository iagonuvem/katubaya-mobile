import { expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncHandler } from './sync.mjs';

it('keeps each sync as one dated JSON file per device and rejects unsafe ids', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kb-sync-'));
  const sync = syncHandler(dir);
  const server = createServer((req, res) => sync(req, res, () => res.writeHead(404).end()));
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/api/sync`;

  const pack = { manifest: { deviceId: 'phone-1', exportedAt: '2026-10-31T10:00:00.000Z' }, tables: { crops: [{ id: 'a' }, { id: 'b' }], lots: [] } };
  const ok = await fetch(url, { method: 'POST', body: JSON.stringify(pack) });
  expect(await ok.json()).toEqual({ ok: true, file: join('phone-1', '2026-10-31T10-00-00-000Z.json'), records: 2 });
  expect(readdirSync(join(dir, 'phone-1'))).toEqual(['2026-10-31T10-00-00-000Z.json']);
  expect(JSON.parse(readFileSync(join(dir, 'phone-1', '2026-10-31T10-00-00-000Z.json'), 'utf8'))).toEqual(pack);

  const bad = await fetch(url, { method: 'POST', body: JSON.stringify({ manifest: { deviceId: '../etc' }, tables: {} }) });
  expect(bad.status).toBe(400);
  expect(readdirSync(dir)).toEqual(['phone-1']);
  server.close();
});
