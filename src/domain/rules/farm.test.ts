import { describe, expect, it } from 'vitest';
import type { AnimalGroup, Crop, HarvestEvent, Lot, Observation, Planting, Zone } from '../contracts/types';
import {
  animalLotStats,
  calendarDays,
  feiraStatus,
  lotLife,
  plotStatus,
  ritual,
  treeStage,
  weekKey,
  type FarmData,
} from './farm';

const NOW = new Date(2026, 9, 30, 9, 0); // Friday, 30 Oct 2026
const ago = (days: number, hour = 7) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const stamps = { createdAt: ago(400), updatedAt: ago(400) };

const crop = (id: string, extra: Partial<Crop> = {}): Crop => ({
  id, categoryId: 'c', name: id, defaultUnit: 'kg', shelfLifeDaysDefault: 7, isFavorite: false, ...stamps, ...extra,
});
const zone: Zone = { id: 'z', name: 'Canteiro', sortOrder: 0, type: 'canteiro', ...stamps };
const planting = (extra: Partial<Planting> = {}): Planting => ({
  id: 'p', zoneId: 'z', cropId: 'tomate', layer: 'medio', cells: [0, 1], countUnit: 'mudas', plantedAt: ago(30), ...stamps, ...extra,
});
const obs = (days: number, extra: Partial<Observation> = {}): Observation => ({ id: `o${days}`, zoneId: 'z', observedAt: ago(days), ...stamps, ...extra });

const empty: FarmData = {
  categories: [], crops: [crop('tomate', { cycleDays: 75 })], cultivars: [], zones: [zone], plantings: [], observations: [],
  harvests: [], lots: [], adjustments: [], animalGroups: [], animalAdjustments: [],
  settings: { id: 's', locale: 'pt-BR', theme: 'system', farmName: '', contactInfo: '', onboardingCompleted: true },
  ritualWeeks: [], notificationReads: [],
};

describe('calendar', () => {
  it('counts calendar days regardless of the hour', () => {
    expect(calendarDays(ago(1, 23), ago(0, 1))).toBe(1);
    expect(weekKey(NOW)).toBe('2026-W44');
  });
});

describe('lotLife', () => {
  const lot = (harvested: number, shelf: number) => ({ harvestedAt: ago(harvested), expiresAtEstimate: ago(harvested - shelf) });
  it('reads fresh, expiring, expires today and expired with the life bar', () => {
    expect(lotLife(lot(0, 7), NOW)).toMatchObject({ state: 'fresh', days: 7, fraction: 1, tone: 'canopy' });
    expect(lotLife(lot(4, 7), NOW)).toMatchObject({ state: 'soon', days: 3, tone: 'amber' });
    expect(lotLife(lot(4, 4), NOW)).toMatchObject({ state: 'today', days: 0, tone: 'urucum' });
    expect(lotLife(lot(6, 5), NOW)).toMatchObject({ state: 'expired', days: -1, fraction: 0 });
  });
});

describe('plotStatus', () => {
  it('is empty without plantings, preparing when observed lately', () => {
    expect(plotStatus(zone, empty, NOW).state).toBe('vazio');
    expect(plotStatus(zone, { ...empty, observations: [obs(5)] }, NOW).state).toBe('preparando');
  });

  it('asks for a look after 14 days, water when the soil was dry', () => {
    const plantings = [planting()];
    expect(plotStatus(zone, { ...empty, plantings, observations: [obs(14)] }, NOW).state).toBe('observar');
    expect(plotStatus(zone, { ...empty, plantings, observations: [obs(3, { soil: 0 })] }, NOW).state).toBe('seco');
  });

  it('is ready when mature by the cycle or harvested lately, else growing', () => {
    const observations = [obs(2, { soil: 1 })];
    expect(plotStatus(zone, { ...empty, plantings: [planting()], observations }, NOW).state).toBe('crescendo');
    expect(plotStatus(zone, { ...empty, plantings: [planting({ plantedAt: ago(80) })], observations }, NOW)).toMatchObject({ state: 'pronto', readyCropId: 'tomate' });
    const harvests = [{ id: 'h', cropId: 'tomate', zoneId: 'z', harvestedAt: ago(1), quantity: 2, unit: 'kg', lotId: 'l', ...stamps } as HarvestEvent];
    expect(plotStatus(zone, { ...empty, plantings: [planting()], observations, harvests }, NOW).state).toBe('pronto');
  });

  it('is pasture when only forage grows', () => {
    expect(plotStatus(zone, { ...empty, plantings: [planting({ layer: 'pasto' })] }, NOW).state).toBe('pasto');
  });
});

describe('feiraStatus', () => {
  const list = { id: 'l', items: [], isStale: false, inventorySnapshotAt: ago(1, 14), createdAt: ago(1, 14), updatedAt: ago(1, 14) };
  it('goes stale when stock changes after the list', () => {
    const harvests = [{ id: 'h', createdAt: ago(0, 6) } as HarvestEvent];
    expect(feiraStatus({ list, harvests, adjustments: [] }, NOW)).toMatchObject({ state: 'desatualizada', changes: 1 });
    expect(feiraStatus({ list, harvests: [], adjustments: [] }, NOW).state).toBe('pronta');
    expect(feiraStatus({ list: { ...list, sentAt: ago(0, 8) }, harvests: [], adjustments: [] }, NOW).state).toBe('enviada');
  });
});

describe('ritual', () => {
  it('lights each step from this week’s actions', () => {
    const lots: Lot[] = [];
    const harvests = [{ id: 'h', harvestedAt: ago(0), createdAt: ago(0) } as HarvestEvent];
    const r = ritual({ ...empty, observations: [obs(1)], harvests, lots }, NOW);
    expect(r.steps.map(s => s.done)).toEqual([true, true, true, false, false, false]);
    expect(r.next).toBe('feira');
  });

  it('grows the tree with closed rituals', () => {
    expect([0, 1, 4, 12].map(treeStage)).toEqual(['semente', 'broto', 'muda', 'arvore']);
  });
});

describe('animalLotStats', () => {
  const vacas: AnimalGroup = { id: 'v', name: 'Vacas', species: 'cattle', initialHeadcount: 6, headcount: 6, startedAt: ago(300), ...stamps };
  const leite = crop('leite', { species: 'cattle', animalYield: 'collect', defaultUnit: 'liter' });
  const milk = (days: number, q: number) => ({ id: `m${days}`, cropId: 'leite', animalGroupId: 'v', harvestedAt: ago(days, 6), quantity: q, unit: 'liter', lotId: 'x', ...stamps }) as HarvestEvent;

  it('flags a missing daily milking only when the lot usually gives one', () => {
    const data = { crops: [leite], animalAdjustments: [] };
    expect(animalLotStats(vacas, { ...data, harvests: [milk(1, 44), milk(2, 38)] }, NOW)).toMatchObject({ pending: true, yesterday: 44, today: 0 });
    expect(animalLotStats(vacas, { ...data, harvests: [milk(0, 42), milk(1, 44)] }, NOW).pending).toBe(false);
    expect(animalLotStats(vacas, { ...data, harvests: [] }, NOW).pending).toBe(false);
  });
});
