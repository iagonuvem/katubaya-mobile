/**
 * Export Service
 * Generates ZIP files with JSON and CSV exports
 */

import JSZip from 'jszip';
import Papa from 'papaparse';
import { db } from '@/data/db/schema';
import { inventoryRepository } from '@/data/repositories/inventoryRepository';
import { availabilityRepository } from '@/data/repositories/availabilityRepository';
import type { AvailabilityList, AvailabilityPack, ExportManifest } from '@/domain/contracts/types';
import { APP_VERSION, SCHEMA_VERSION } from '@/domain/contracts';
import { newId } from '@/lib/id';

export type ExportType = 'availability' | 'full';

export interface ExportResult {
  blob: Blob;
  filename: string;
  stats: {
    crops: number;
    cultivars: number;
    categories: number;
    harvests: number;
    lots: number;
    adjustments: number;
  };
}

/** Nested arrays/objects become JSON strings so each row stays one CSV line */
function toCSV(rows: object[]): string {
  const flat = rows.map(row =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, v !== null && typeof v === 'object' ? JSON.stringify(v) : v])
    )
  );
  return Papa.unparse(flat, { header: true, quotes: true });
}

/**
 * 'availability': current snapshot + catalog as one pack.
 * 'full': every table, one JSON per table.
 */
export async function exportZip(type: ExportType, farmName?: string): Promise<ExportResult> {
  const full = type === 'full';
  const now = new Date().toISOString();

  const [categories, crops, cultivars, zones, harvests, lots, adjustments, animalGroups, animalAdjustments, inventorySnapshot, current, plantings, observations] =
    await Promise.all([
      db.categories.toArray(),
      db.crops.toArray(),
      db.cultivars.toArray(),
      full ? db.zones.toArray() : [],
      full ? db.harvestEvents.toArray() : [],
      full ? db.lots.toArray() : [],
      full ? db.inventoryAdjustments.toArray() : [],
      full ? db.animalGroups.toArray() : [],
      full ? db.animalAdjustments.toArray() : [],
      inventoryRepository.generateSnapshot(),
      availabilityRepository.getCurrent(),
      full ? db.plantings.toArray() : [],
      full ? db.observations.toArray() : []
    ]);

  const availabilityList: AvailabilityList = current ?? {
    id: newId(),
    items: [],
    isStale: true,
    inventorySnapshotAt: now,
    createdAt: now,
    updatedAt: now
  };

  const manifest: ExportManifest = {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: now,
    packId: newId(),
    packType: full ? 'full_history' : 'availability',
    farmName
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  if (full) {
    const data = {
      categories, crops, cultivars, zones, harvests, lots, adjustments,
      'animal-groups': animalGroups,
      'animal-adjustments': animalAdjustments,
      plantings,
      observations,
      'inventory-snapshot': inventorySnapshot,
      'availability-list': availabilityList
    };
    for (const [name, value] of Object.entries(data)) {
      zip.file(`data/${name}.json`, JSON.stringify(value, null, 2));
    }
  } else {
    const pack: AvailabilityPack = { manifest, availabilityList, inventorySnapshot, crops, cultivars, categories };
    zip.file('availability-pack.json', JSON.stringify(pack, null, 2));
  }

  const csv: Record<string, object[]> = full
    ? { categories, crops, cultivars, zones, harvests, lots, adjustments, 'animal-groups': animalGroups, 'animal-adjustments': animalAdjustments, plantings, observations, inventory: inventorySnapshot.items }
    : { categories, crops, cultivars, inventory: inventorySnapshot.items, availability: availabilityList.items };
  for (const [name, rows] of Object.entries(csv)) {
    if (rows.length > 0) zip.file(`csv/${name}.csv`, toCSV(rows));
  }

  return {
    blob: await zip.generateAsync({ type: 'blob' }),
    filename: `katubaya-${full ? 'full-export' : 'availability'}-${now.slice(0, 10)}.zip`,
    stats: {
      crops: crops.length,
      cultivars: cultivars.length,
      categories: categories.length,
      harvests: harvests.length,
      lots: full ? lots.length : inventorySnapshot.items.reduce((sum, item) => sum + item.lots.length, 0),
      adjustments: adjustments.length
    }
  };
}

/**
 * Trigger browser download of a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
