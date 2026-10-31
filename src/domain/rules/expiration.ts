/**
 * Expiration calculation rules
 */

import type { ExpirationStatus, Crop, Cultivar } from '../contracts/types';

/**
 * Calculate expiration date estimate based on harvest date and shelf life
 */
export function calculateExpirationDate(
  harvestedAt: Date,
  crop: Crop,
  cultivar?: Cultivar
): Date {
  const shelfLifeDays = cultivar?.shelfLifeDaysOverride ?? crop.shelfLifeDaysDefault;
  const expirationDate = new Date(harvestedAt);
  expirationDate.setDate(expirationDate.getDate() + shelfLifeDays);
  return expirationDate;
}

/**
 * Calculate days until expiration from now
 */
export function getDaysUntilExpiry(expiresAt: Date | string): number {
  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine expiration status based on days remaining
 * 
 * Thresholds:
 * - Fresh: > 3 days remaining
 * - Expiring Soon: 1-3 days remaining
 * - Expired: 0 or fewer days remaining
 */
export function getExpirationStatus(
  expiresAt: Date | string,
  thresholds: { expiringSoon: number; expired: number } = { expiringSoon: 3, expired: 0 }
): ExpirationStatus {
  const daysRemaining = getDaysUntilExpiry(expiresAt);
  
  if (daysRemaining <= thresholds.expired) {
    return 'expired';
  }
  
  if (daysRemaining <= thresholds.expiringSoon) {
    return 'expiring_soon';
  }
  
  return 'fresh';
}
