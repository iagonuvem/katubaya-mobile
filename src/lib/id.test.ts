import { afterEach, expect, it, vi } from 'vitest';
import { newId } from './id';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.restoreAllMocks());

it('falls back to a v4 UUID when crypto.randomUUID is missing (plain-http LAN)', () => {
  vi.spyOn(crypto, 'randomUUID').mockImplementation(undefined as never);
  Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
  const a = newId();
  const b = newId();
  expect(a).toMatch(V4);
  expect(a).not.toBe(b);
});
