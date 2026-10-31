/**
 * Animal lot ("lote de animais") repository
 * Mirrors Lot + InventoryAdjustment: a headcount plus an adjustment log
 */

import { db } from '../db/schema';
import type { AnimalGroup, AnimalAdjustment, AnimalAdjustmentReason } from '@/domain/contracts/types';
import { harvestRepository, type CreateHarvestInput } from './harvestRepository';
import { newId } from '@/lib/id';

export type CreateAnimalGroupInput = Pick<AnimalGroup, 'name' | 'species' | 'zoneId' | 'notes'> & {
  headcount: number;
  startedAt?: string;
};

export interface AnimalAdjustInput {
  groupId: string;
  delta: number;
  reason: AnimalAdjustmentReason;
  notes?: string;
  /** Slaughter: the meat produced, registered as a harvest linked to this lot */
  output?: CreateHarvestInput;
}

export const animalRepository = {
  async getAll(): Promise<AnimalGroup[]> {
    return db.animalGroups.orderBy('name').toArray();
  },

  async getById(id: string): Promise<AnimalGroup | undefined> {
    return db.animalGroups.get(id);
  },

  async getAdjustments(groupId: string): Promise<AnimalAdjustment[]> {
    return db.animalAdjustments.where('groupId').equals(groupId).reverse().sortBy('adjustedAt');
  },

  async create(input: CreateAnimalGroupInput): Promise<AnimalGroup> {
    const now = new Date().toISOString();
    const group: AnimalGroup = {
      id: newId(),
      name: input.name,
      species: input.species,
      zoneId: input.zoneId,
      notes: input.notes,
      initialHeadcount: input.headcount,
      headcount: input.headcount,
      startedAt: input.startedAt ?? now,
      createdAt: now,
      updatedAt: now,
    };
    await db.animalGroups.add(group);
    return group;
  },

  async update(id: string, data: Partial<Pick<AnimalGroup, 'name' | 'species' | 'zoneId' | 'notes' | 'startedAt'>>): Promise<void> {
    await db.animalGroups.update(id, { ...data, updatedAt: new Date().toISOString() });
  },

  /** Removes the lot and its log. Harvests it produced stay in stock history. */
  async remove(id: string): Promise<void> {
    await db.transaction('rw', [db.animalGroups, db.animalAdjustments], async () => {
      await db.animalAdjustments.where('groupId').equals(id).delete();
      await db.animalGroups.delete(id);
    });
  },

  async adjust(input: AnimalAdjustInput): Promise<AnimalAdjustment> {
    return db.transaction(
      'rw',
      [db.animalGroups, db.animalAdjustments, db.harvestEvents, db.lots, db.crops, db.cultivars],
      async () => {
        const group = await db.animalGroups.get(input.groupId);
        if (!group) throw new Error(`Animal lot not found: ${input.groupId}`);
        const next = group.headcount + input.delta;
        if (next < 0) throw new Error('HEADCOUNT_BELOW_ZERO');

        let harvestEventId: string | undefined;
        if (input.output) {
          // Meat lots inherit the pasture unless the caller says otherwise
          const { harvest } = await harvestRepository.create({ zoneId: group.zoneId, ...input.output, animalGroupId: group.id });
          harvestEventId = harvest.id;
        }

        const now = new Date().toISOString();
        const adjustment: AnimalAdjustment = {
          id: newId(),
          groupId: group.id,
          delta: input.delta,
          reason: input.reason,
          notes: input.notes,
          harvestEventId,
          adjustedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        await db.animalAdjustments.add(adjustment);
        await db.animalGroups.update(group.id, { headcount: next, updatedAt: now });
        return adjustment;
      },
    );
  },
};
