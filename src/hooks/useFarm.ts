/**
 * The whole farm as one live snapshot. Local data is small, so every screen reads the same
 * snapshot and derives what it needs with the pure rules in `domain/rules/farm`.
 */

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db/schema';
import { DEFAULT_SETTINGS } from '@/data/db/seed';
import type { FarmData } from '@/domain/rules/farm';

async function loadFarm(): Promise<FarmData> {
  const [categories, crops, cultivars, zones, plantings, observations, harvests, lots, adjustments, animalGroups, animalAdjustments, lists, config, settings, ritualWeeks, notificationReads] =
    await Promise.all([
      db.categories.orderBy('sortOrder').toArray(),
      db.crops.toArray(),
      db.cultivars.toArray(),
      db.zones.orderBy('sortOrder').toArray(),
      db.plantings.toArray(),
      db.observations.toArray(),
      db.harvestEvents.toArray(),
      db.lots.toArray(),
      db.inventoryAdjustments.toArray(),
      db.animalGroups.toArray(),
      db.animalAdjustments.toArray(),
      db.availabilityLists.orderBy('createdAt').reverse().limit(1).toArray(),
      db.availabilityConfig.get('availability-config'),
      db.appSettings.get('app-settings'),
      db.ritualWeeks.toArray(),
      db.notificationReads.toArray(),
    ]);
  return {
    categories, crops: crops.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), cultivars, zones, plantings, observations, harvests, lots, adjustments,
    animalGroups, animalAdjustments, list: lists[0], config, settings: settings ?? DEFAULT_SETTINGS, ritualWeeks, notificationReads,
  };
}

/** Live farm snapshot; undefined while the first read is in flight */
export function useFarm(): FarmData | undefined {
  return useLiveQuery(loadFarm, []);
}

/** Current time, refreshed every minute so "today" rolls over on an open screen */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
