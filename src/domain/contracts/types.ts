/**
 * katubaya Domain Contracts
 * Source of truth for all data types
 * Schema Version: 1.2.0
 */

// ============================================================================
// ENUMS
// ============================================================================

export type CropCategoryType = 
  | 'fruits'
  | 'vegetables'
  | 'grains'
  | 'herbs'
  | 'nuts'
  | 'roots'
  | 'animal'
  | 'forage'
  | 'custom';

export type UnitType = 
  | 'kg'
  | 'g'
  | 'unit'
  | 'bunch'
  | 'liter'
  | 'ml'
  | 'box'
  | 'bag'
  | 'dozen';

export type AdjustmentReason = 
  | 'sold'
  | 'consumed'
  | 'damage'
  | 'loss'
  | 'gift'
  | 'correction'
  | 'processing';

export type ExpirationStatus = 'fresh' | 'expiring_soon' | 'expired';

export type Species = 'cattle' | 'poultry' | 'swine' | 'goat' | 'sheep' | 'bees' | 'fish' | 'other';

/** Stratum a plant occupies in the agroforest; 'pasto' for forage */
export type Layer = 'emergente' | 'alto' | 'medio' | 'baixo' | 'rasteiro' | 'pasto';

/** Animal products: collected daily (leite, ovos, mel) or obtained by slaughter (carne) */
export type AnimalYield = 'collect' | 'slaughter';

/** Kind of plot ("talhão") drawn on the farm map */
export type ZoneType = 'canteiro' | 'linha' | 'agrofloresta' | 'pomar' | 'pasto' | 'abrigo';
export type SunExposure = 'full' | 'partial' | 'shade';
export type WaterSource = 'irrigated' | 'rain';

/** Word used to count plants in a plot: "12 pés", "3 covas" */
export type PlantCountUnit = 'pes' | 'covas' | 'mudas' | 'arvores' | 'touceiras';

export type ObservationLevel3 = 0 | 1 | 2; // low / medium / high, meaning per field

export type AnimalAdjustmentReason =
  | 'birth'
  | 'purchase'
  | 'death'
  | 'sale'
  | 'slaughter'
  | 'correction';

// ============================================================================
// BASE ENTITY
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ============================================================================
// CROP/CULTURE REGISTRY
// ============================================================================

export interface CropCategory extends BaseEntity {
  name: string;
  type: CropCategoryType;
  icon?: string;
  color?: string;
  sortOrder: number;
}

export interface Crop extends BaseEntity {
  categoryId: string;
  name: string;
  defaultUnit: UnitType;
  shelfLifeDaysDefault: number; // 0 = not set yet ("falta validade")
  pricePerUnit?: number; // Price per unit in local currency
  guildTags?: string[];
  notes?: string;
  isFavorite: boolean;
  lastUsedAt?: string;
  layer?: Layer; // default stratum when planted
  cycleDays?: number; // days from planting to first harvest
  isForage?: boolean; // offered when forming a pasture
  species?: Species; // animal products: which animals produce it
  animalYield?: AnimalYield;
  derivedFromCropId?: string; // processed products: what it is made from (queijo ← leite)
}

export interface Cultivar extends BaseEntity {
  cropId: string;
  name: string;
  shelfLifeDaysOverride?: number;
  notes?: string;
}

// ============================================================================
// ZONES (Optional)
// ============================================================================

/** A named area of the site. Plots ("talhões") are zones with a type; pastures and shelters host animal lots. */
export interface Zone extends BaseEntity {
  name: string;
  description?: string; // "agrofloresta em linha"
  sortOrder: number;
  type?: ZoneType;
  size?: string; // "24 × 6 m"
  areaM2?: number;
  gridRows?: number; // planting grid is 6 columns × gridRows
  mapHeight?: number; // tile height on the farm map, in map px
  sun?: SunExposure;
  water?: WaterSource;
}

/** Plants occupying cells of a plot's grid (or counted without cells) */
export interface Planting extends BaseEntity {
  zoneId: string;
  cropId: string;
  cultivarId?: string;
  layer: Layer;
  cells: number[]; // indices in the 6 × gridRows grid
  count?: number; // plants not drawn on the grid (e.g. 20 pés de mandioca)
  countUnit: PlantCountUnit;
  plantedAt: string;
  endedAt?: string;
  animalGroupId?: string; // pasture formed for this lot
}

/** A weekly look at a plot: phase, pollinators, pests, disease, soil */
export interface Observation extends BaseEntity {
  zoneId: string;
  observedAt: string;
  phase?: 'vegetative' | 'flowering' | 'fruiting' | 'dormant';
  pollinators?: ObservationLevel3; // few / some / many
  pest?: ObservationLevel3; // low / medium / high
  disease?: ObservationLevel3; // none / suspect / yes
  soil?: ObservationLevel3; // dry / ok / soaked
  notes?: string;
  photo?: string; // small JPEG data URL, taken on the phone
  harvestEventId?: string; // signals noted while logging a harvest
}

/** A week whose six ritual steps were all done */
export interface RitualWeek {
  id: string; // ISO week key, "2026-W44"
  completedAt: string;
}

export interface NotificationRead {
  id: string; // deterministic notification id
  readAt: string;
}

// ============================================================================
// HARVEST & LOTS
// ============================================================================

export interface HarvestEvent extends BaseEntity {
  cropId: string;
  cultivarId?: string;
  zoneId?: string;
  quantity: number;
  unit: UnitType;
  harvestedAt: string; // ISO 8601
  notes?: string;
  lotId: string; // Reference to created lot
  animalGroupId?: string; // Milking, egg collection, slaughter: which animal lot produced it
}

export interface Lot extends BaseEntity {
  cropId: string;
  cultivarId?: string;
  zoneId?: string;
  harvestEventId: string;
  initialQuantity: number;
  quantityRemaining: number;
  unit: UnitType;
  harvestedAt: string;
  expiresAtEstimate: string; // ISO 8601
  notes?: string;
}

// ============================================================================
// INVENTORY
// ============================================================================

export interface InventoryAdjustment extends BaseEntity {
  lotId: string;
  cropId: string;
  quantityDelta: number; // negative for reductions
  unit: UnitType;
  reason: AdjustmentReason;
  notes?: string;
  adjustedAt: string;
  harvestEventId?: string; // reason 'processing': the production this lot was turned into
}

// ============================================================================
// ANIMALS ("lote de animais": a group managed together)
// ============================================================================

export interface AnimalGroup extends BaseEntity {
  name: string;
  species: Species;
  initialHeadcount: number;
  headcount: number; // current heads; 0 = closed lot
  zoneId?: string;
  startedAt: string;
  notes?: string;
}

export interface AnimalAdjustment extends BaseEntity {
  groupId: string;
  delta: number; // negative for exits
  reason: AnimalAdjustmentReason;
  notes?: string;
  harvestEventId?: string; // slaughter: the meat harvest it produced
  adjustedAt: string;
}

export interface InventorySnapshot {
  generatedAt: string;
  items: InventorySnapshotItem[];
}

export interface InventorySnapshotItem {
  cropId: string;
  cropName: string;
  cultivarId?: string;
  cultivarName?: string;
  totalQuantity: number;
  unit: UnitType;
  pricePerUnit?: number;
  totalValue?: number;
  lots: LotSummary[];
  expirationStatus: ExpirationStatus;
  earliestExpiry?: string;
}

export interface LotSummary {
  lotId: string;
  quantityRemaining: number;
  expiresAtEstimate: string;
  expirationStatus: ExpirationStatus;
  daysUntilExpiry: number;
}

// ============================================================================
// AVAILABILITY
// ============================================================================

export interface AvailabilityWindow {
  id: string;
  name: string; // e.g., "Esta semana", "Próxima semana"
  startDate: string;
  endDate: string;
}

export interface AvailabilityItem {
  id: string;
  cropId: string;
  cropName: string;
  cultivarId?: string;
  cultivarName?: string;
  quantity: number;
  unit: UnitType;
  pricePerUnit?: number;
  windowId?: string;
  isIncluded: boolean; // Can be toggled off
  sortOrder: number;
}

export interface AvailabilityList extends BaseEntity {
  windowId?: string;
  windowName?: string;
  items: AvailabilityItem[];
  headerText?: string;
  footerText?: string;
  contactInfo?: string;
  farmName?: string;
  generatedMessage?: string;
  isStale: boolean;
  inventorySnapshotAt: string;
  sentAt?: string; // last copy to WhatsApp
}

export interface AvailabilityConfig {
  id: string;
  farmName: string;
  contactInfo: string;
  defaultHeaderText: string;
  defaultFooterText: string;
  defaultWindowDays: number;
  updatedAt: string;
}

// ============================================================================
// EXPORT PACK
// ============================================================================

export interface ExportManifest {
  schemaVersion: string;
  appVersion: string;
  exportedAt: string;
  packId: string;
  packType: 'availability' | 'full_history';
  deviceId?: string;
  farmName?: string;
}

/** What Sync sends: the same manifest as the chest, plus every local table as stored */
export interface SyncPack {
  manifest: ExportManifest;
  tables: Record<string, unknown[]>;
}

export interface AvailabilityPack {
  manifest: ExportManifest;
  availabilityList: AvailabilityList;
  inventorySnapshot: InventorySnapshot;
  crops: Crop[];
  cultivars: Cultivar[];
  categories: CropCategory[];
}

// ============================================================================
// APP STATE
// ============================================================================

export interface AppSettings {
  id: string;
  locale: string;
  theme: 'light' | 'dark' | 'system';
  farmName: string;
  contactInfo: string;
  lastExportAt?: string;
  onboardingCompleted: boolean;
  /** Notification categories the farmer turned off */
  mutedNotifications?: string[];
  /** Generated on the first sync; names this phone's folder on the farmer's server */
  deviceId?: string;
  /** Empty on the PWA (same origin). Required on a native build */
  syncServerUrl?: string;
  lastSyncAt?: string;
}
