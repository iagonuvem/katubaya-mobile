/**
 * IndexedDB Schema using Dexie
 * katubaya Local Database
 */

import Dexie, { type Table } from 'dexie';
import type {
  CropCategory,
  Crop,
  Cultivar,
  Zone,
  HarvestEvent,
  Lot,
  InventoryAdjustment,
  AvailabilityList,
  AvailabilityConfig,
  AppSettings,
  AnimalGroup,
  AnimalAdjustment,
  Planting,
  Observation,
  RitualWeek,
  NotificationRead
} from '@/domain/contracts/types';

export class FarmerCoreDB extends Dexie {
  // Tables
  categories!: Table<CropCategory, string>;
  crops!: Table<Crop, string>;
  cultivars!: Table<Cultivar, string>;
  zones!: Table<Zone, string>;
  harvestEvents!: Table<HarvestEvent, string>;
  lots!: Table<Lot, string>;
  inventoryAdjustments!: Table<InventoryAdjustment, string>;
  availabilityLists!: Table<AvailabilityList, string>;
  availabilityConfig!: Table<AvailabilityConfig, string>;
  appSettings!: Table<AppSettings, string>;
  animalGroups!: Table<AnimalGroup, string>;
  animalAdjustments!: Table<AnimalAdjustment, string>;
  plantings!: Table<Planting, string>;
  observations!: Table<Observation, string>;
  ritualWeeks!: Table<RitualWeek, string>;
  notificationReads!: Table<NotificationRead, string>;

  constructor() {
    super('FarmerCoreDB');

    this.version(1).stores({
      // Primary key is 'id', indexes follow
      categories: 'id, type, sortOrder',
      crops: 'id, categoryId, name, isFavorite, lastUsedAt',
      cultivars: 'id, cropId, name',
      zones: 'id, sortOrder',
      harvestEvents: 'id, cropId, cultivarId, zoneId, harvestedAt, lotId',
      lots: 'id, cropId, cultivarId, harvestEventId, expiresAtEstimate, quantityRemaining',
      inventoryAdjustments: 'id, lotId, cropId, adjustedAt, reason',
      availabilityLists: 'id, createdAt, isStale',
      availabilityConfig: 'id',
      appSettings: 'id'
    });

    // v2: livestock. Only changed/new tables need re-declaring.
    this.version(2).stores({
      harvestEvents: 'id, cropId, cultivarId, zoneId, harvestedAt, lotId, animalGroupId',
      inventoryAdjustments: 'id, lotId, cropId, adjustedAt, reason, harvestEventId',
      animalGroups: 'id, name, species, zoneId',
      animalAdjustments: 'id, groupId, adjustedAt, reason, harvestEventId'
    });

    // v3: the farm map. Zones become plots with plantings and weekly observations; the ritual keeps its history.
    this.version(3).stores({
      zones: 'id, sortOrder, type',
      plantings: 'id, zoneId, cropId, plantedAt',
      observations: 'id, zoneId, observedAt',
      ritualWeeks: 'id',
      notificationReads: 'id'
    });
  }
}

// Singleton instance
export const db = new FarmerCoreDB();
