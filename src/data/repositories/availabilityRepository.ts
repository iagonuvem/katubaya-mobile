/**
 * Availability Repository
 * Manages availability lists and config
 */

import { db } from '../db/schema';
import type { 
  AvailabilityList, 
  AvailabilityConfig,
  InventorySnapshot 
} from '@/domain/contracts/types';
import { 
  createAvailabilityItemsFromSnapshot, 
  generateAvailabilityMessage 
} from '@/domain/rules/availability';
import { newId } from '@/lib/id';

const DEFAULT_CONFIG_ID = 'availability-config';

export const availabilityRepository = {
  /**
   * Get the current (most recent) availability list
   */
  async getCurrent(): Promise<AvailabilityList | undefined> {
    const lists = await db.availabilityLists
      .orderBy('createdAt')
      .reverse()
      .limit(1)
      .toArray();
    return lists[0];
  },

  /**
   * Get availability list by ID
   */
  async getById(id: string): Promise<AvailabilityList | undefined> {
    return db.availabilityLists.get(id);
  },

  /**
   * Generate new availability list from inventory snapshot
   */
  async generateFromSnapshot(
    snapshot: InventorySnapshot,
    config?: AvailabilityConfig
  ): Promise<AvailabilityList> {
    const now = new Date().toISOString();
    const items = createAvailabilityItemsFromSnapshot(snapshot);
    
    const list: AvailabilityList = {
      id: newId(),
      windowName: 'Esta semana',
      items,
      headerText: config?.defaultHeaderText,
      footerText: config?.defaultFooterText,
      contactInfo: config?.contactInfo,
      farmName: config?.farmName,
      isStale: false,
      inventorySnapshotAt: snapshot.generatedAt,
      createdAt: now,
      updatedAt: now
    };
    
    // Generate the message
    list.generatedMessage = generateAvailabilityMessage(list);
    
    await db.availabilityLists.add(list);
    return list;
  },

  /**
   * Update availability list
   */
  async update(
    id: string, 
    data: Partial<Omit<AvailabilityList, 'id' | 'createdAt'>>
  ): Promise<AvailabilityList | undefined> {
    const existing = await db.availabilityLists.get(id);
    if (!existing) return undefined;
    
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    // Regenerate message if items changed
    if (data.items) {
      updated.generatedMessage = generateAvailabilityMessage(updated);
    }
    
    await db.availabilityLists.update(id, updated);
    return updated;
  },

  /**
   * Mark current availability as stale
   */
  async markCurrentAsStale(): Promise<void> {
    const current = await this.getCurrent();
    if (current) {
      await db.availabilityLists.update(current.id, {
        isStale: true,
        updatedAt: new Date().toISOString()
      });
    }
  },

  /**
   * Get availability config
   */
  async getConfig(): Promise<AvailabilityConfig | undefined> {
    return db.availabilityConfig.get(DEFAULT_CONFIG_ID);
  },

  /**
   * Save availability config
   */
  async saveConfig(config: Omit<AvailabilityConfig, 'id' | 'updatedAt'>): Promise<AvailabilityConfig> {
    const fullConfig: AvailabilityConfig = {
      ...config,
      id: DEFAULT_CONFIG_ID,
      updatedAt: new Date().toISOString()
    };
    
    await db.availabilityConfig.put(fullConfig);
    return fullConfig;
  },

  /**
   * Get all availability lists (history)
   */
  async getHistory(limit: number = 10): Promise<AvailabilityList[]> {
    return db.availabilityLists
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();
  }
};
