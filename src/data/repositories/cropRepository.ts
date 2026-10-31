/**
 * Crop Repository
 */

import { db } from '../db/schema';
import type { Crop } from '@/domain/contracts/types';
import { newId } from '@/lib/id';

export const cropRepository = {
  /**
   * Get all crops
   */
  async getAll(): Promise<Crop[]> {
    return db.crops.orderBy('name').toArray();
  },

  /**
   * Get crops by category
   */
  async getByCategory(categoryId: string): Promise<Crop[]> {
    return db.crops.where('categoryId').equals(categoryId).toArray();
  },

  /**
   * Get crop by ID
   */
  async getById(id: string): Promise<Crop | undefined> {
    return db.crops.get(id);
  },

  /**
   * Get favorite crops
   */
  async getFavorites(): Promise<Crop[]> {
    return db.crops.where('isFavorite').equals(1).toArray();
  },

  /**
   * Get recently used crops (last 6)
   */
  async getRecent(limit: number = 6): Promise<Crop[]> {
    return db.crops
      .where('lastUsedAt')
      .above('')
      .reverse()
      .limit(limit)
      .toArray();
  },

  /**
   * Search crops by name
   */
  async search(query: string): Promise<Crop[]> {
    const lowerQuery = query.toLowerCase();
    return db.crops
      .filter(crop => crop.name.toLowerCase().includes(lowerQuery))
      .toArray();
  },

  /**
   * Create a new crop
   */
  async create(data: Omit<Crop, 'id' | 'createdAt' | 'updatedAt'>): Promise<Crop> {
    const now = new Date().toISOString();
    const crop: Crop = {
      ...data,
      id: newId(),
      createdAt: now,
      updatedAt: now
    };
    
    await db.crops.add(crop);
    return crop;
  },

  /**
   * Update a crop
   */
  async update(id: string, data: Partial<Omit<Crop, 'id' | 'createdAt'>>): Promise<void> {
    await db.crops.update(id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const crop = await db.crops.get(id);
    if (!crop) return false;
    
    const newStatus = !crop.isFavorite;
    await db.crops.update(id, {
      isFavorite: newStatus,
      updatedAt: new Date().toISOString()
    });
    return newStatus;
  },

  /**
   * Mark crop as recently used
   */
  async markUsed(id: string): Promise<void> {
    await db.crops.update(id, {
      lastUsedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Delete a crop
   */
  async delete(id: string): Promise<void> {
    await db.crops.delete(id);
  }
};
