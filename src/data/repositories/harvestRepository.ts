/**
 * Harvest Event Repository
 */

import { db } from '../db/schema';
import type { HarvestEvent, Crop, Cultivar, UnitType } from '@/domain/contracts/types';
import { lotRepository } from './lotRepository';
import { cropRepository } from './cropRepository';
import { inventoryRepository } from './inventoryRepository';
import { planFifoConsumption } from '@/domain/rules/processing';
import { newId } from '@/lib/id';

export interface CreateHarvestInput {
  cropId: string;
  cultivarId?: string;
  zoneId?: string;
  quantity: number;
  unit: HarvestEvent['unit'];
  harvestedAt?: string;
  notes?: string;
  animalGroupId?: string;
}

export const harvestRepository = {
  /**
   * Get all harvest events
   */
  async getAll(): Promise<HarvestEvent[]> {
    return db.harvestEvents.orderBy('harvestedAt').reverse().toArray();
  },

  /**
   * Get recent harvest events
   */
  async getRecent(limit: number = 10): Promise<HarvestEvent[]> {
    return db.harvestEvents
      .orderBy('harvestedAt')
      .reverse()
      .limit(limit)
      .toArray();
  },

  /**
   * Get harvest event by ID
   */
  async getById(id: string): Promise<HarvestEvent | undefined> {
    return db.harvestEvents.get(id);
  },

  /**
   * Create a harvest event and its associated lot
   */
  async create(input: CreateHarvestInput): Promise<{ harvest: HarvestEvent; lotId: string }> {
    const now = new Date().toISOString();
    const lotId = newId();
    
    const harvest: HarvestEvent = {
      id: newId(),
      cropId: input.cropId,
      cultivarId: input.cultivarId,
      zoneId: input.zoneId,
      quantity: input.quantity,
      unit: input.unit,
      harvestedAt: input.harvestedAt || now,
      notes: input.notes,
      lotId,
      animalGroupId: input.animalGroupId,
      createdAt: now,
      updatedAt: now
    };
    
    // Get crop and cultivar for lot creation
    const crop = await cropRepository.getById(input.cropId);
    if (!crop) {
      throw new Error(`Crop not found: ${input.cropId}`);
    }
    
    let cultivar: Cultivar | undefined;
    if (input.cultivarId) {
      cultivar = await db.cultivars.get(input.cultivarId);
    }
    
    // Transaction: create harvest event and lot together
    await db.transaction('rw', [db.harvestEvents, db.lots, db.crops], async () => {
      await db.harvestEvents.add(harvest);
      await lotRepository.createFromHarvest(harvest, crop, cultivar);
      await cropRepository.markUsed(input.cropId);
    });
    
    return { harvest, lotId };
  },

  /**
   * Turn stock of one product into another (leite → queijo).
   * Consumes `input.quantity` of `input.cropId` oldest-expiry-first and registers the output as a harvest;
   * each consumed lot gets a 'processing' adjustment pointing at the output harvest.
   */
  async createFromProcessing(
    input: { cropId: string; unit: UnitType; quantity: number },
    output: CreateHarvestInput
  ): Promise<{ harvest: HarvestEvent; lotId: string }> {
    return db.transaction('rw', [db.harvestEvents, db.lots, db.crops, db.cultivars, db.inventoryAdjustments], async () => {
      // Only lots in the same unit: 10 L and 2 kg of the same product must never be summed
      const lots = (await lotRepository.getByCrop(input.cropId)).filter(lot => lot.unit === input.unit);
      const plan = planFifoConsumption(lots, input.quantity);
      const result = await this.create(output);
      for (const slice of plan) {
        await inventoryRepository.createAdjustment({
          lotId: slice.lotId,
          quantityDelta: -slice.quantity,
          reason: 'processing',
          notes: output.notes,
          harvestEventId: result.harvest.id,
        });
      }
      return result;
    });
  },

  /**
   * Get harvests by crop
   */
  async getByCrop(cropId: string): Promise<HarvestEvent[]> {
    return db.harvestEvents
      .where('cropId')
      .equals(cropId)
      .reverse()
      .toArray();
  },

  /**
   * Get harvests for a date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<HarvestEvent[]> {
    return db.harvestEvents
      .where('harvestedAt')
      .between(startDate.toISOString(), endDate.toISOString())
      .toArray();
  }
};
