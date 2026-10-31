import { describe, expect, it } from 'vitest';
import { generateAvailabilityMessage } from './availability';
import { getExpirationStatus } from './expiration';
import { getCropEmoji } from './availability';
import { planFifoConsumption, InsufficientStockError } from './processing';

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);

describe('getExpirationStatus', () => {
  it('classifies by days remaining (fresh > 3, expiring 1-3, expired <= 0)', () => {
    expect(getExpirationStatus(inDays(10))).toBe('fresh');
    expect(getExpirationStatus(inDays(4))).toBe('fresh');
    expect(getExpirationStatus(inDays(3))).toBe('expiring_soon');
    expect(getExpirationStatus(inDays(1))).toBe('expiring_soon');
    expect(getExpirationStatus(inDays(0))).toBe('expired');
    expect(getExpirationStatus(inDays(-1))).toBe('expired');
  });
});

describe('planFifoConsumption', () => {
  const lots = [
    { id: 'new', quantityRemaining: 10, expiresAtEstimate: '2026-11-20T00:00:00.000Z' },
    { id: 'old', quantityRemaining: 4, expiresAtEstimate: '2026-11-10T00:00:00.000Z' },
    { id: 'empty', quantityRemaining: 0, expiresAtEstimate: '2026-11-01T00:00:00.000Z' },
  ];

  it('consumes the closest expiry first and spills into the next lot', () => {
    expect(planFifoConsumption(lots, 6)).toEqual([
      { lotId: 'old', quantity: 4 },
      { lotId: 'new', quantity: 2 },
    ]);
  });

  it('refuses when stock is short, naming the gap', () => {
    expect(() => planFifoConsumption(lots, 15)).toThrow(InsufficientStockError);
  });
});

describe('getCropEmoji', () => {
  it('matches on the crop name containing the key, not the reverse', () => {
    expect(getCropEmoji('Mel')).toBe('🍯');
    expect(getCropEmoji('Melancia')).toBe('🍉');
    expect(getCropEmoji('Ovos Caipiras')).toBe('🥚');
  });
});

describe('generateAvailabilityMessage', () => {
  it('lists only included items, sorted, with quantity and price per unit', () => {
    const message = generateAvailabilityMessage({
      id: 'list', createdAt: '', updatedAt: '', isStale: false, inventorySnapshotAt: '',
      farmName: 'Sítio Pé de Serra', footerText: 'Retirada sáb, 7h às 11h',
      items: [
        { id: 'b', cropId: 'c2', cropName: 'Alface', quantity: 5, unit: 'unit', pricePerUnit: 3, isIncluded: true, sortOrder: 1 },
        { id: 'a', cropId: 'c1', cropName: 'Banana', cultivarName: 'Prata', quantity: 16, unit: 'kg', pricePerUnit: 6.5, isIncluded: true, sortOrder: 0 },
        { id: 'c', cropId: 'c4', cropName: 'Ovos Caipiras', quantity: 6, unit: 'dozen', isIncluded: true, sortOrder: 2 },
        { id: 'x', cropId: 'c3', cropName: 'Coentro', quantity: 3, unit: 'bunch', isIncluded: false, sortOrder: 3 },
      ],
    });

    expect(message).toBe([
      '*Sítio Pé de Serra* · Feira desta semana',
      '',
      '• Banana Prata: 16 kg · R$ 6,50/kg',
      '• Alface: 5 unid · R$ 3,00 a unid',
      '• Ovos Caipiras: 6 dz',
      '',
      'Retirada sáb, 7h às 11h',
    ].join('\n'));
  });

  it('names the next week and says when the stall is empty', () => {
    const message = generateAvailabilityMessage({
      id: 'list', createdAt: '', updatedAt: '', isStale: false, inventorySnapshotAt: '', windowId: 'next', items: [],
    });
    expect(message).toBe('Feira da próxima semana\n\nNada na barraca esta semana.');
  });
});
