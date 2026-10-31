/**
 * Every write the farm game makes, in one place. Screens call these; the live snapshot
 * (`useFarm`) picks the change up by itself.
 */

import { db } from './db/schema';
import {
  animalRepository,
  availabilityRepository,
  cropRepository,
  harvestRepository,
  inventoryRepository,
  settingsRepository,
  type CreateAnimalGroupInput,
  type CreateHarvestInput,
  type AnimalAdjustInput,
} from './repositories';
import type { ExportType } from './services/exportService';
import { createAvailabilityItemsFromSnapshot, generateAvailabilityMessage } from '@/domain/rules/availability';
import type {
  AdjustmentReason,
  AvailabilityItem,
  AvailabilityList,
  Crop,
  Layer,
  Observation,
  PlantCountUnit,
  Planting,
  Zone,
} from '@/domain/contracts/types';

const stamp = () => {
  const now = new Date().toISOString();
  return { createdAt: now, updatedAt: now };
};

// ============================================================================
// Production and stock
// ============================================================================

export interface LogProductionInput extends CreateHarvestInput {
  /** The product had no shelf life yet: the farmer just told us */
  shelfDays?: number;
  /** Signals of the forest noted while harvesting become an observation of the plot */
  signals?: Omit<Observation, 'id' | 'zoneId' | 'observedAt' | 'createdAt' | 'updatedAt'>;
}

export async function logProduction({ shelfDays, signals, ...input }: LogProductionInput) {
  if (shelfDays) await cropRepository.update(input.cropId, { shelfLifeDaysDefault: shelfDays });
  const result = await harvestRepository.create(input);
  if (signals && input.zoneId && Object.keys(signals).length > 0) {
    await db.observations.add({
      id: crypto.randomUUID(), zoneId: input.zoneId, observedAt: result.harvest.harvestedAt, harvestEventId: result.harvest.id, ...signals, ...stamp(),
    });
  }
  return result;
}

export function adjustLot(lotId: string, quantityDelta: number, reason: AdjustmentReason, notes?: string) {
  return inventoryRepository.createAdjustment({ lotId, quantityDelta, reason, notes });
}

export function processStock(input: { cropId: string; unit: Crop['defaultUnit']; quantity: number }, output: CreateHarvestInput) {
  return harvestRepository.createFromProcessing(input, output);
}

// ============================================================================
// Plots, plantings, observations
// ============================================================================

export async function saveObservation(zoneId: string, fields: Partial<Observation>): Promise<void> {
  await db.observations.add({ id: crypto.randomUUID(), zoneId, observedAt: new Date().toISOString(), ...fields, ...stamp() });
}

export async function createZone(zone: Omit<Zone, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>): Promise<string> {
  const id = crypto.randomUUID();
  const last = await db.zones.orderBy('sortOrder').last();
  await db.zones.add({ ...zone, id, sortOrder: (last?.sortOrder ?? -1) + 1, ...stamp() });
  return id;
}

export async function updateZone(id: string, data: Partial<Zone>): Promise<void> {
  await db.zones.update(id, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteZone(id: string): Promise<void> {
  await db.transaction('rw', [db.zones, db.plantings, db.observations], async () => {
    await db.plantings.where('zoneId').equals(id).delete();
    await db.observations.where('zoneId').equals(id).delete();
    await db.zones.delete(id);
  });
}

export const COUNT_UNIT: Record<Layer, PlantCountUnit> = {
  emergente: 'arvores', alto: 'pes', medio: 'mudas', baixo: 'pes', rasteiro: 'covas', pasto: 'touceiras',
};

/**
 * Plants `cells → cropId` in a plot. A cell that already held another planting leaves it;
 * a planting left with no cells ends today.
 */
export async function plant(zoneId: string, cells: Record<number, string>, plantedAt: string, animalGroupId?: string): Promise<void> {
  const crops = new Map((await db.crops.toArray()).map(c => [c.id, c]));
  await db.transaction('rw', [db.plantings], async () => {
    const taken = new Set(Object.keys(cells).map(Number));
    const active = await db.plantings.where('zoneId').equals(zoneId).filter(p => !p.endedAt).toArray();
    for (const p of active) {
      const left = p.cells.filter(c => !taken.has(c));
      if (left.length === p.cells.length) continue;
      if (left.length === 0 && !p.count) await db.plantings.update(p.id, { cells: [], endedAt: plantedAt, updatedAt: plantedAt });
      else await db.plantings.update(p.id, { cells: left, updatedAt: plantedAt });
    }
    const byCrop = new Map<string, number[]>();
    for (const [cell, cropId] of Object.entries(cells)) byCrop.set(cropId, [...(byCrop.get(cropId) ?? []), Number(cell)]);
    for (const [cropId, list] of byCrop) {
      const layer = crops.get(cropId)?.layer ?? 'baixo';
      const planting: Planting = {
        id: crypto.randomUUID(), zoneId, cropId, layer, cells: list.sort((a, b) => a - b), countUnit: COUNT_UNIT[layer], plantedAt,
        animalGroupId: layer === 'pasto' ? animalGroupId : undefined, ...stamp(),
      };
      await db.plantings.add(planting);
    }
  });
}

export async function endPlanting(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.plantings.update(id, { endedAt: now, updatedAt: now });
}

// ============================================================================
// Market list ("feira")
// ============================================================================

export async function generateList(windowId: 'this' | 'next', previous?: AvailabilityList): Promise<AvailabilityList> {
  const snapshot = await inventoryRepository.generateSnapshot();
  const config = await availabilityRepository.getConfig();
  const settings = await settingsRepository.get();
  const now = new Date().toISOString();
  // Keep the farmer's choices from the last list: items turned off stay off
  const off = new Set(previous?.items.filter(i => !i.isIncluded).map(i => `${i.cropId}:${i.cultivarId ?? ''}`));
  const items = createAvailabilityItemsFromSnapshot(snapshot).map(item => ({
    ...item, isIncluded: !off.has(`${item.cropId}:${item.cultivarId ?? ''}`),
  }));
  const list: AvailabilityList = {
    id: crypto.randomUUID(),
    windowId,
    items,
    headerText: config?.defaultHeaderText || undefined,
    footerText: config?.defaultFooterText || undefined,
    contactInfo: settings.contactInfo || config?.contactInfo || undefined,
    farmName: settings.farmName || config?.farmName || undefined,
    isStale: false,
    inventorySnapshotAt: snapshot.generatedAt,
    createdAt: now,
    updatedAt: now,
  };
  list.generatedMessage = generateAvailabilityMessage(list);
  await db.availabilityLists.add(list);
  return list;
}

export async function updateList(list: AvailabilityList, data: { items?: AvailabilityItem[]; windowId?: 'this' | 'next' }): Promise<void> {
  const next = { ...list, ...data, updatedAt: new Date().toISOString() };
  next.generatedMessage = generateAvailabilityMessage(next);
  await db.availabilityLists.put(next);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Copies the list to the clipboard and marks the "Mandar" step */
export async function sendList(list: AvailabilityList): Promise<boolean> {
  const ok = await copyText(list.generatedMessage ?? generateAvailabilityMessage(list));
  if (ok) await db.availabilityLists.update(list.id, { sentAt: new Date().toISOString() });
  return ok;
}

export async function saveStall(data: { farmName: string; contactInfo: string; header: string; footer: string }): Promise<void> {
  const config = await availabilityRepository.getConfig();
  await settingsRepository.update({ farmName: data.farmName.trim(), contactInfo: data.contactInfo.trim() });
  await availabilityRepository.saveConfig({
    farmName: data.farmName.trim(),
    contactInfo: data.contactInfo.trim(),
    defaultHeaderText: data.header.trim(),
    defaultFooterText: data.footer.trim(),
    defaultWindowDays: config?.defaultWindowDays ?? 7,
  });
}

// ============================================================================
// Backup ("baú"), settings, notifications, ritual
// ============================================================================

export async function exportPack(type: ExportType) {
  // ZIP and CSV libraries load only when the farmer opens the chest
  const { exportZip, downloadBlob } = await import('./services/exportService');
  const settings = await settingsRepository.get();
  const result = await exportZip(type, settings.farmName);
  downloadBlob(result.blob, result.filename);
  await settingsRepository.update({ lastExportAt: new Date().toISOString() });
  return result;
}

export async function markNoticesRead(ids: string[]): Promise<void> {
  const readAt = new Date().toISOString();
  await db.notificationReads.bulkPut(ids.map(id => ({ id, readAt })));
}

/** Idempotent: a week counts once */
export async function recordRitualWeek(key: string): Promise<void> {
  if (!(await db.ritualWeeks.get(key))) await db.ritualWeeks.put({ id: key, completedAt: new Date().toISOString() });
}

// ============================================================================
// Catalog ("coleção") and animals
// ============================================================================

export const createCrop = (data: Omit<Crop, 'id' | 'createdAt' | 'updatedAt'>) => cropRepository.create(data);
export const updateCrop = (id: string, data: Partial<Crop>) => cropRepository.update(id, data);
export const toggleFavorite = (id: string) => cropRepository.toggleFavorite(id);

export async function deleteCrop(id: string): Promise<void> {
  await db.transaction('rw', [db.crops, db.cultivars], async () => {
    await db.cultivars.where('cropId').equals(id).delete();
    await db.crops.delete(id);
  });
}

export async function addCultivar(cropId: string, name: string, shelfLifeDaysOverride?: number): Promise<void> {
  await db.cultivars.add({ id: crypto.randomUUID(), cropId, name: name.trim(), shelfLifeDaysOverride, ...stamp() });
}

export async function deleteCultivar(id: string): Promise<void> {
  await db.cultivars.delete(id);
}

export const createAnimalGroup = (input: CreateAnimalGroupInput) => animalRepository.create(input);
export const updateAnimalGroup = animalRepository.update.bind(animalRepository);
export const removeAnimalGroup = animalRepository.remove.bind(animalRepository);
export const adjustAnimals = (input: AnimalAdjustInput) => animalRepository.adjust(input);
