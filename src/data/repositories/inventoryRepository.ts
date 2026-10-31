/**
 * Inventory Repository
 * Manages inventory adjustments and snapshot generation
 */

import { db } from '../db/schema';
import type { 
  InventoryAdjustment, 
  InventorySnapshot, 
  InventorySnapshotItem,
  LotSummary,
  AdjustmentReason 
} from '@/domain/contracts/types';
import { lotRepository } from './lotRepository';
import { cropRepository } from './cropRepository';
import { getExpirationStatus, getDaysUntilExpiry } from '@/domain/rules/expiration';
import { newId } from '@/lib/id';

export interface CreateAdjustmentInput {
  lotId: string;
  quantityDelta: number;
  reason: AdjustmentReason;
  notes?: string;
  harvestEventId?: string;
}

export const inventoryRepository = {
  /**
   * Create an inventory adjustment
   */
  async createAdjustment(input: CreateAdjustmentInput): Promise<InventoryAdjustment> {
    const lot = await lotRepository.getById(input.lotId);
    if (!lot) {
      throw new Error(`Lot not found: ${input.lotId}`);
    }
    
    const now = new Date().toISOString();
    const adjustment: InventoryAdjustment = {
      id: newId(),
      lotId: input.lotId,
      cropId: lot.cropId,
      quantityDelta: input.quantityDelta,
      unit: lot.unit,
      reason: input.reason,
      notes: input.notes,
      harvestEventId: input.harvestEventId,
      adjustedAt: now,
      createdAt: now,
      updatedAt: now
    };
    
    await db.transaction('rw', [db.inventoryAdjustments, db.lots], async () => {
      await db.inventoryAdjustments.add(adjustment);
      await lotRepository.adjustQuantity(input.lotId, input.quantityDelta);
    });
    
    return adjustment;
  },

  /**
   * Get all adjustments for a lot
   */
  async getAdjustmentsByLot(lotId: string): Promise<InventoryAdjustment[]> {
    return db.inventoryAdjustments
      .where('lotId')
      .equals(lotId)
      .toArray();
  },

  /**
   * Get recent adjustments
   */
  async getRecentAdjustments(limit: number = 20): Promise<InventoryAdjustment[]> {
    return db.inventoryAdjustments
      .orderBy('adjustedAt')
      .reverse()
      .limit(limit)
      .toArray();
  },

  /**
   * Generate current inventory snapshot
   * Groups lots by crop/cultivar with aggregated quantities
   */
  async generateSnapshot(): Promise<InventorySnapshot> {
    const activeLots = await lotRepository.getActive();
    const crops = await cropRepository.getAll();
    const cultivars = await db.cultivars.toArray();
    
    // Create lookup maps
    const cropMap = new Map(crops.map(c => [c.id, c]));
    const cultivarMap = new Map(cultivars.map(c => [c.id, c]));
    
    // Group lots by crop+cultivar
    const groupedLots = new Map<string, typeof activeLots>();
    
    for (const lot of activeLots) {
      const key = `${lot.cropId}:${lot.cultivarId || 'none'}`;
      if (!groupedLots.has(key)) {
        groupedLots.set(key, []);
      }
      groupedLots.get(key)!.push(lot);
    }
    
    // Build snapshot items
    const items: InventorySnapshotItem[] = [];
    
    for (const [key, lots] of groupedLots) {
      const [cropId, cultivarId] = key.split(':');
      const crop = cropMap.get(cropId);
      const cultivar = cultivarId !== 'none' ? cultivarMap.get(cultivarId) : undefined;
      
      if (!crop) continue;
      
      // Sort lots by expiry (FIFO)
      const sortedLots = lots.sort(
        (a, b) => new Date(a.expiresAtEstimate).getTime() - new Date(b.expiresAtEstimate).getTime()
      );
      
      // Calculate totals and summaries
      const totalQuantity = sortedLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
      const earliestExpiry = sortedLots[0]?.expiresAtEstimate;
      
      const lotSummaries: LotSummary[] = sortedLots.map(lot => ({
        lotId: lot.id,
        quantityRemaining: lot.quantityRemaining,
        expiresAtEstimate: lot.expiresAtEstimate,
        expirationStatus: getExpirationStatus(lot.expiresAtEstimate),
        daysUntilExpiry: getDaysUntilExpiry(lot.expiresAtEstimate)
      }));
      
      // Overall status is the worst status among lots
      const overallStatus = lotSummaries.some(l => l.expirationStatus === 'expired')
        ? 'expired'
        : lotSummaries.some(l => l.expirationStatus === 'expiring_soon')
          ? 'expiring_soon'
          : 'fresh';
      
      const pricePerUnit = crop.pricePerUnit;
      const totalValue = pricePerUnit ? totalQuantity * pricePerUnit : undefined;
      
      items.push({
        cropId,
        cropName: crop.name,
        cultivarId: cultivar?.id,
        cultivarName: cultivar?.name,
        totalQuantity,
        unit: crop.defaultUnit,
        pricePerUnit,
        totalValue,
        lots: lotSummaries,
        expirationStatus: overallStatus,
        earliestExpiry
      });
    }
    
    // Sort by crop name
    items.sort((a, b) => a.cropName.localeCompare(b.cropName));
    
    return {
      generatedAt: new Date().toISOString(),
      items
    };
  }
};
