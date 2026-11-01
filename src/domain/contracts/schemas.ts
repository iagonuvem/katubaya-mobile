/**
 * Zod Runtime Validators
 * Must match types.ts exactly
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const CropCategoryTypeSchema = z.enum([
  'fruits',
  'vegetables',
  'grains',
  'herbs',
  'nuts',
  'roots',
  'animal',
  'forage',
  'custom'
]);

export const UnitTypeSchema = z.enum([
  'kg',
  'g',
  'unit',
  'bunch',
  'liter',
  'ml',
  'box',
  'bag',
  'dozen'
]);

export const AdjustmentReasonSchema = z.enum([
  'sold',
  'consumed',
  'damage',
  'loss',
  'gift',
  'correction',
  'processing'
]);

export const LayerSchema = z.enum(['emergente', 'alto', 'medio', 'baixo', 'rasteiro', 'pasto']);

export const ExpirationStatusSchema = z.enum(['fresh', 'expiring_soon', 'expired']);

// ============================================================================
// BASE ENTITY
// ============================================================================

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// ============================================================================
// CROP/CULTURE REGISTRY
// ============================================================================

export const CropCategorySchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  type: CropCategoryTypeSchema,
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().min(0)
});

export const CropSchema = BaseEntitySchema.extend({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  defaultUnit: UnitTypeSchema,
  shelfLifeDaysDefault: z.number().int().min(0).max(365), // 0 = not set yet
  pricePerUnit: z.number().min(0).optional(),
  guildTags: z.array(z.string()).optional(),
  notes: z.string().max(500).optional(),
  isFavorite: z.boolean(),
  lastUsedAt: z.string().datetime().optional(),
  layer: LayerSchema.optional(),
  cycleDays: z.number().int().min(1).optional(),
  isForage: z.boolean().optional(),
  species: z.enum(['cattle', 'poultry', 'swine', 'goat', 'sheep', 'bees', 'fish', 'other']).optional(),
  animalYield: z.enum(['collect', 'slaughter']).optional(),
  derivedFromCropId: z.string().optional()
});

export const CultivarSchema = BaseEntitySchema.extend({
  cropId: z.string().uuid(),
  name: z.string().min(1).max(100),
  shelfLifeDaysOverride: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(500).optional()
});

// ============================================================================
// ZONES
// ============================================================================

export const ZoneTypeSchema = z.enum(['canteiro', 'linha', 'agrofloresta', 'pomar', 'pasto', 'abrigo']);
const Level3 = z.union([z.literal(0), z.literal(1), z.literal(2)]);

export const ZoneSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0),
  type: ZoneTypeSchema.optional(),
  size: z.string().max(50).optional(),
  areaM2: z.number().min(0).optional(),
  gridRows: z.number().int().min(1).max(8).optional(),
  mapHeight: z.number().min(40).max(400).optional(),
  sun: z.enum(['full', 'partial', 'shade']).optional(),
  water: z.enum(['irrigated', 'rain']).optional()
});

export const PlantingSchema = BaseEntitySchema.extend({
  zoneId: z.string(),
  cropId: z.string(),
  cultivarId: z.string().optional(),
  layer: LayerSchema,
  cells: z.array(z.number().int().min(0)),
  count: z.number().int().min(0).optional(),
  countUnit: z.enum(['pes', 'covas', 'mudas', 'arvores', 'touceiras']),
  plantedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  animalGroupId: z.string().optional()
});

export const ObservationSchema = BaseEntitySchema.extend({
  zoneId: z.string(),
  observedAt: z.string().datetime(),
  phase: z.enum(['vegetative', 'flowering', 'fruiting', 'dormant']).optional(),
  pollinators: Level3.optional(),
  pest: Level3.optional(),
  disease: Level3.optional(),
  soil: Level3.optional(),
  notes: z.string().max(1000).optional(),
  photo: z.string().optional(),
  harvestEventId: z.string().optional()
});

// ============================================================================
// HARVEST & LOTS
// ============================================================================

export const HarvestEventSchema = BaseEntitySchema.extend({
  cropId: z.string().uuid(),
  cultivarId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  quantity: z.number().positive(),
  unit: UnitTypeSchema,
  harvestedAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
  lotId: z.string().uuid(),
  animalGroupId: z.string().uuid().optional()
});

export const LotSchema = BaseEntitySchema.extend({
  cropId: z.string().uuid(),
  cultivarId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  harvestEventId: z.string().uuid(),
  initialQuantity: z.number().positive(),
  quantityRemaining: z.number().min(0),
  unit: UnitTypeSchema,
  harvestedAt: z.string().datetime(),
  expiresAtEstimate: z.string().datetime(),
  notes: z.string().max(500).optional()
});

// ============================================================================
// INVENTORY
// ============================================================================

export const InventoryAdjustmentSchema = BaseEntitySchema.extend({
  lotId: z.string().uuid(),
  cropId: z.string().uuid(),
  quantityDelta: z.number(),
  unit: UnitTypeSchema,
  reason: AdjustmentReasonSchema,
  notes: z.string().max(500).optional(),
  adjustedAt: z.string().datetime(),
  harvestEventId: z.string().uuid().optional()
});

export const SpeciesSchema = z.enum(['cattle', 'poultry', 'swine', 'goat', 'sheep', 'bees', 'fish', 'other']);
export const AnimalAdjustmentReasonSchema = z.enum(['birth', 'purchase', 'death', 'sale', 'slaughter', 'correction']);

export const AnimalGroupSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  species: SpeciesSchema,
  initialHeadcount: z.number().int().min(0),
  headcount: z.number().int().min(0),
  zoneId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  notes: z.string().max(500).optional()
});

export const AnimalAdjustmentSchema = BaseEntitySchema.extend({
  groupId: z.string().uuid(),
  delta: z.number().int(),
  reason: AnimalAdjustmentReasonSchema,
  notes: z.string().max(500).optional(),
  harvestEventId: z.string().uuid().optional(),
  adjustedAt: z.string().datetime()
});

export const LotSummarySchema = z.object({
  lotId: z.string().uuid(),
  quantityRemaining: z.number().min(0),
  expiresAtEstimate: z.string().datetime(),
  expirationStatus: ExpirationStatusSchema,
  daysUntilExpiry: z.number().int()
});

export const InventorySnapshotItemSchema = z.object({
  cropId: z.string().uuid(),
  cropName: z.string(),
  cultivarId: z.string().uuid().optional(),
  cultivarName: z.string().optional(),
  totalQuantity: z.number().min(0),
  unit: UnitTypeSchema,
  pricePerUnit: z.number().min(0).optional(),
  totalValue: z.number().min(0).optional(),
  lots: z.array(LotSummarySchema),
  expirationStatus: ExpirationStatusSchema,
  earliestExpiry: z.string().datetime().optional()
});

export const InventorySnapshotSchema = z.object({
  generatedAt: z.string().datetime(),
  items: z.array(InventorySnapshotItemSchema)
});

// ============================================================================
// AVAILABILITY
// ============================================================================

export const AvailabilityWindowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
});

export const AvailabilityItemSchema = z.object({
  id: z.string().uuid(),
  cropId: z.string().uuid(),
  cropName: z.string(),
  cultivarId: z.string().uuid().optional(),
  cultivarName: z.string().optional(),
  quantity: z.number().min(0),
  unit: UnitTypeSchema,
  pricePerUnit: z.number().min(0).optional(),
  windowId: z.string().uuid().optional(),
  isIncluded: z.boolean(),
  sortOrder: z.number().int().min(0)
});

export const AvailabilityListSchema = BaseEntitySchema.extend({
  windowId: z.string().uuid().optional(),
  windowName: z.string().optional(),
  items: z.array(AvailabilityItemSchema),
  headerText: z.string().max(500).optional(),
  footerText: z.string().max(500).optional(),
  contactInfo: z.string().max(200).optional(),
  farmName: z.string().max(100).optional(),
  generatedMessage: z.string().optional(),
  isStale: z.boolean(),
  inventorySnapshotAt: z.string().datetime()
});

export const AvailabilityConfigSchema = z.object({
  id: z.string().uuid(),
  farmName: z.string().max(100),
  contactInfo: z.string().max(200),
  defaultHeaderText: z.string().max(500),
  defaultFooterText: z.string().max(500),
  defaultWindowDays: z.number().int().min(1).max(30),
  updatedAt: z.string().datetime()
});

// ============================================================================
// EXPORT PACK
// ============================================================================

export const ExportManifestSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  appVersion: z.string(),
  exportedAt: z.string().datetime(),
  packId: z.string().uuid(),
  packType: z.enum(['availability', 'full_history']),
  deviceId: z.string().optional(),
  farmName: z.string().optional()
});

export const AvailabilityPackSchema = z.object({
  manifest: ExportManifestSchema,
  availabilityList: AvailabilityListSchema,
  inventorySnapshot: InventorySnapshotSchema,
  crops: z.array(CropSchema),
  cultivars: z.array(CultivarSchema),
  categories: z.array(CropCategorySchema)
});

// ============================================================================
// APP SETTINGS
// ============================================================================

export const AppSettingsSchema = z.object({
  id: z.string(),
  locale: z.string(),
  theme: z.enum(['light', 'dark', 'system']),
  farmName: z.string().max(100),
  contactInfo: z.string().max(200),
  lastExportAt: z.string().datetime().optional(),
  onboardingCompleted: z.boolean(),
  mutedNotifications: z.array(z.string()).optional(),
  deviceId: z.string().uuid().optional(),
  syncServerUrl: z.string().optional(),
  lastSyncAt: z.string().datetime().optional()
});
