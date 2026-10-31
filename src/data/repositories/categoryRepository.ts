/**
 * Crop Category Repository
 */

import { db } from '../db/schema';
import type { CropCategory, CropCategoryType } from '@/domain/contracts/types';
import { newId } from '@/lib/id';

export const categoryRepository = {
  /**
   * Get all categories sorted by sortOrder
   */
  async getAll(): Promise<CropCategory[]> {
    return db.categories.orderBy('sortOrder').toArray();
  },

  /**
   * Get category by ID
   */
  async getById(id: string): Promise<CropCategory | undefined> {
    return db.categories.get(id);
  },

  /**
   * Create a new category
   */
  async create(data: Omit<CropCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<CropCategory> {
    const now = new Date().toISOString();
    const category: CropCategory = {
      ...data,
      id: newId(),
      createdAt: now,
      updatedAt: now
    };
    
    await db.categories.add(category);
    return category;
  },

  /**
   * Update a category
   */
  async update(id: string, data: Partial<Omit<CropCategory, 'id' | 'createdAt'>>): Promise<void> {
    await db.categories.update(id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Delete a category (only custom ones)
   */
  async delete(id: string): Promise<boolean> {
    const category = await db.categories.get(id);
    if (!category || category.type !== 'custom') {
      return false;
    }
    await db.categories.delete(id);
    return true;
  },

  /**
   * Get categories by type
   */
  async getByType(type: CropCategoryType): Promise<CropCategory[]> {
    return db.categories.where('type').equals(type).toArray();
  }
};
