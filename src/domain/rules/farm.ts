/**
 * Farm game rules: everything the map, the ritual and the notifications derive from the log.
 * Pure functions over a snapshot of the database; `now` is always passed in so tests are deterministic.
 * No strings here: callers translate the keys.
 */

import type {
  AnimalAdjustment,
  AnimalGroup,
  AppSettings,
  AvailabilityConfig,
  AvailabilityList,
  Crop,
  CropCategory,
  Cultivar,
  HarvestEvent,
  InventoryAdjustment,
  Lot,
  NotificationRead,
  Observation,
  Planting,
  RitualWeek,
  Species,
  UnitType,
  Zone,
} from '../contracts/types';

export interface FarmData {
  categories: CropCategory[];
  crops: Crop[];
  cultivars: Cultivar[];
  zones: Zone[];
  plantings: Planting[];
  observations: Observation[];
  harvests: HarvestEvent[];
  lots: Lot[];
  adjustments: InventoryAdjustment[];
  animalGroups: AnimalGroup[];
  animalAdjustments: AnimalAdjustment[];
  list?: AvailabilityList;
  config?: AvailabilityConfig;
  settings: AppSettings;
  ritualWeeks: RitualWeek[];
  notificationReads: NotificationRead[];
}

const DAY = 86_400_000;

// ============================================================================
// CALENDAR
// ============================================================================

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Whole calendar days from `a` to `b` (b − a), ignoring the time of day */
export function calendarDays(a: Date | string, b: Date | string): number {
  return Math.round((startOfDay(new Date(b)).getTime() - startOfDay(new Date(a)).getTime()) / DAY);
}

/** Monday 00:00 of the week containing `d` */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** ISO-8601 week number and its year */
export function isoWeek(d: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { year: t.getUTCFullYear(), week: Math.ceil(((t.getTime() - yearStart.getTime()) / DAY + 1) / 7) };
}

export function weekKey(d: Date): string {
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** From Monday of `now`'s week on. No upper bound: `now` may lag a minute behind an action just taken. */
const inWeek = (iso: string | undefined, now: Date) => !!iso && new Date(iso) >= startOfWeek(now);
const isToday = (iso: string, now: Date) => calendarDays(iso, now) === 0;

// ============================================================================
// LOOKUPS
// ============================================================================

export function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map(r => [r.id, r]));
}

/** Crops whose stock can be processed into something else (leite → queijo) */
export function derivedOf(cropId: string, crops: Crop[]): Crop[] {
  return crops.filter(c => c.derivedFromCropId === cropId);
}

// ============================================================================
// STOCK ("paiol")
// ============================================================================

export type LifeTone = 'canopy' | 'amber' | 'urucum';
export type LifeState = 'fresh' | 'soon' | 'today' | 'expired';

export interface LotLife {
  days: number; // calendar days until expiry; negative once expired
  state: LifeState;
  tone: LifeTone;
  fraction: number; // 0..1 of shelf life left, drawn as the "life bar"
}

/** Freshness of a lot: more than 3 days fresh, 1–3 expiring, 0 expires today, below 0 expired */
export function lotLife(lot: Pick<Lot, 'harvestedAt' | 'expiresAtEstimate'>, now: Date): LotLife {
  const days = calendarDays(now, lot.expiresAtEstimate);
  const shelf = Math.max(1, calendarDays(lot.harvestedAt, lot.expiresAtEstimate));
  const state: LifeState = days < 0 ? 'expired' : days === 0 ? 'today' : days <= 3 ? 'soon' : 'fresh';
  const tone: LifeTone = state === 'fresh' ? 'canopy' : state === 'soon' ? 'amber' : 'urucum';
  const fraction = Math.max(0, Math.min(1, days / shelf));
  return { days, state, tone, fraction: state === 'today' ? 0.08 : fraction };
}

export interface StockGroup {
  key: string;
  crop: Crop;
  cultivar?: Cultivar;
  lots: (Lot & { life: LotLife })[];
  total: number;
  unit: UnitType;
  value?: number;
  worst: LotLife;
}

/** Lots with stock grouped by product and variety, oldest expiry first */
export function stockGroups(data: Pick<FarmData, 'lots' | 'crops' | 'cultivars'>, now: Date): StockGroup[] {
  const crops = indexById(data.crops);
  const cultivars = indexById(data.cultivars);
  const groups = new Map<string, StockGroup>();
  for (const lot of data.lots) {
    if (lot.quantityRemaining <= 0) continue;
    const crop = crops.get(lot.cropId);
    if (!crop) continue;
    const key = `${lot.cropId}:${lot.cultivarId ?? ''}:${lot.unit}`;
    const life = lotLife(lot, now);
    const g = groups.get(key) ?? { key, crop, cultivar: lot.cultivarId ? cultivars.get(lot.cultivarId) : undefined, lots: [], total: 0, unit: lot.unit, worst: life };
    g.lots.push({ ...lot, life });
    g.total = round1(g.total + lot.quantityRemaining);
    if (life.days < g.worst.days) g.worst = life;
    groups.set(key, g);
  }
  return [...groups.values()]
    .map(g => ({
      ...g,
      lots: g.lots.sort((a, b) => a.expiresAtEstimate.localeCompare(b.expiresAtEstimate)),
      value: g.crop.pricePerUnit ? g.total * g.crop.pricePerUnit : undefined,
    }))
    .sort((a, b) => a.worst.days - b.worst.days || a.crop.name.localeCompare(b.crop.name));
}

export interface StockSummary {
  value: number;
  boxes: number; // lots with stock ("caixas")
  products: number;
  attention: number; // lots expiring in ≤ 3 days or expired
  expiring: number; // lots expiring in ≤ 3 days, not yet expired
}

export function stockSummary(groups: StockGroup[]): StockSummary {
  const lots = groups.flatMap(g => g.lots);
  return {
    value: groups.reduce((s, g) => s + (g.value ?? 0), 0),
    boxes: lots.length,
    products: new Set(groups.map(g => g.crop.id)).size,
    attention: lots.filter(l => l.life.state !== 'fresh').length,
    expiring: lots.filter(l => l.life.state === 'soon' || l.life.state === 'today').length,
  };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

// ============================================================================
// PLOTS ("talhões")
// ============================================================================

export type PlotState = 'pronto' | 'observar' | 'seco' | 'preparando' | 'crescendo' | 'pasto' | 'vazio';

export const PLOT_TONE: Record<PlotState, 'amber' | 'river' | 'canopy' | 'muted'> = {
  pronto: 'amber', observar: 'river', seco: 'river', preparando: 'muted', crescendo: 'canopy', pasto: 'canopy', vazio: 'muted',
};

export function activePlantings(zoneId: string, plantings: Planting[]): Planting[] {
  return plantings.filter(p => p.zoneId === zoneId && !p.endedAt);
}

/** Zones occupied by animal lots that still have heads are drawn as pens, not plots */
export function penZoneIds(groups: AnimalGroup[]): Set<string> {
  return new Set(groups.filter(g => g.headcount > 0 && g.zoneId).map(g => g.zoneId!));
}

/** Plots shown on the map and counted as "talhões" */
export function plotZones(data: Pick<FarmData, 'zones' | 'animalGroups'>): Zone[] {
  const pens = penZoneIds(data.animalGroups);
  return data.zones.filter(z => !pens.has(z.id)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function lastObservation(zoneId: string, observations: Observation[]): Observation | undefined {
  return observations.filter(o => o.zoneId === zoneId).sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
}

export interface PlotStatus {
  state: PlotState;
  readyCropId?: string;
  daysSinceObservation?: number;
  lastObservation?: Observation;
  plantings: Planting[];
  lastHarvest?: HarvestEvent;
  emptySince?: string;
}

/** Days a planting needs before its first harvest, by its product's cycle */
export function daysToHarvest(p: Planting, crop: Crop | undefined, now: Date): number | undefined {
  if (!crop?.cycleDays) return undefined;
  return crop.cycleDays - calendarDays(p.plantedAt, now);
}

/**
 * Priority: an empty plot is preparing (observed in the last 14 days) or empty; pasture stays pasture;
 * then a plot not observed for 14 days asks for a look, a dry soil asks for water, a mature or
 * producing planting is ready to harvest, and anything else is growing.
 */
export function plotStatus(zone: Zone, data: Pick<FarmData, 'plantings' | 'observations' | 'harvests' | 'crops'>, now: Date): PlotStatus {
  const plantings = activePlantings(zone.id, data.plantings);
  const lastObs = lastObservation(zone.id, data.observations);
  const daysSinceObservation = lastObs ? calendarDays(lastObs.observedAt, now) : undefined;
  const zoneHarvests = data.harvests.filter(h => h.zoneId === zone.id).sort((a, b) => b.harvestedAt.localeCompare(a.harvestedAt));
  const base = { daysSinceObservation, lastObservation: lastObs, plantings, lastHarvest: zoneHarvests[0] };

  if (plantings.length === 0) {
    const ended = data.plantings.filter(p => p.zoneId === zone.id && p.endedAt).map(p => p.endedAt!).sort().pop();
    const emptySince = ended ?? zone.createdAt;
    const working = daysSinceObservation !== undefined && daysSinceObservation <= 14;
    return { ...base, state: working ? 'preparando' : 'vazio', emptySince };
  }
  if (zone.type === 'pasto' || plantings.every(p => p.layer === 'pasto')) return { ...base, state: 'pasto' };
  if (daysSinceObservation === undefined || daysSinceObservation >= 14) return { ...base, state: 'observar' };
  if (lastObs?.soil === 0) return { ...base, state: 'seco' };

  const crops = indexById(data.crops);
  const ready = plantings.find(p => {
    const crop = crops.get(p.cropId);
    if (!crop || crop.isForage) return false;
    const left = daysToHarvest(p, crop, now);
    const producing = zoneHarvests.some(h => h.cropId === p.cropId && calendarDays(h.harvestedAt, now) <= 14);
    return (left !== undefined && left <= 0) || producing;
  });
  if (ready) return { ...base, state: 'pronto', readyCropId: ready.cropId };
  return { ...base, state: 'crescendo' };
}

/** Plant count of a planting: explicit count, else the grid cells it fills */
export const plantCount = (p: Planting) => p.count ?? p.cells.length;

/** Harvest totals of a product in a plot, per ISO week, oldest first */
export function weeklyHarvests(zoneId: string, cropId: string, harvests: HarvestEvent[], now: Date, weeks = 6) {
  const start = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const from = new Date(start);
    from.setDate(from.getDate() - (weeks - 1 - i) * 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    const total = harvests
      .filter(h => h.zoneId === zoneId && h.cropId === cropId && new Date(h.harvestedAt) >= from && new Date(h.harvestedAt) < to)
      .reduce((s, h) => s + h.quantity, 0);
    return { week: isoWeek(from).week, total: round1(total) };
  });
}

// ============================================================================
// MARKET LIST ("feira")
// ============================================================================

export type FeiraState = 'none' | 'desatualizada' | 'pronta' | 'enviada';

export interface FeiraStatus {
  state: FeiraState;
  changes: number; // productions and stock adjustments after the list was generated
  harvestsAfter: number;
}

export function feiraStatus(data: Pick<FarmData, 'list' | 'harvests' | 'adjustments'>, now: Date): FeiraStatus {
  const list = data.list;
  if (!list) return { state: 'none', changes: 0, harvestsAfter: 0 };
  const since = list.inventorySnapshotAt;
  const harvestsAfter = data.harvests.filter(h => h.createdAt > since).length;
  const changes = harvestsAfter + data.adjustments.filter(a => a.createdAt > since).length;
  if (changes > 0) return { state: 'desatualizada', changes, harvestsAfter };
  const sent = !!list.sentAt && list.sentAt >= since && inWeek(list.sentAt, now);
  return { state: sent ? 'enviada' : 'pronta', changes: 0, harvestsAfter: 0 };
}

// ============================================================================
// WEEKLY RITUAL
// ============================================================================

export type RitualStep = 'observar' | 'colher' | 'paiol' | 'feira' | 'mandar' | 'guardar';
export const RITUAL_STEPS: RitualStep[] = ['observar', 'colher', 'paiol', 'feira', 'mandar', 'guardar'];

export interface Ritual {
  steps: { key: RitualStep; done: boolean }[];
  done: number;
  next?: RitualStep;
  complete: boolean;
}

/** Each step lights up by itself when its action happens during the current week */
export function ritual(data: FarmData, now: Date): Ritual {
  const feira = feiraStatus(data, now);
  const colher = data.harvests.some(h => inWeek(h.harvestedAt, now));
  const expiredStock = data.lots.some(l => l.quantityRemaining > 0 && lotLife(l, now).state === 'expired');
  const done: Record<RitualStep, boolean> = {
    observar: data.observations.some(o => inWeek(o.observedAt, now)),
    colher,
    paiol: data.adjustments.some(a => a.reason !== 'processing' && inWeek(a.adjustedAt, now)) || (colher && !expiredStock),
    feira: !!data.list && inWeek(data.list.createdAt, now) && feira.state !== 'desatualizada',
    mandar: !!data.list?.sentAt && inWeek(data.list.sentAt, now),
    guardar: inWeek(data.settings.lastExportAt, now),
  };
  const steps = RITUAL_STEPS.map(key => ({ key, done: done[key] }));
  const count = steps.filter(s => s.done).length;
  return { steps, done: count, next: steps.find(s => !s.done)?.key, complete: count === steps.length };
}

export type TreeStage = 'semente' | 'broto' | 'muda' | 'arvore';

/** One branch per closed ritual. A skipped week freezes the tree; nothing withers. */
export function treeStage(closedRituals: number): TreeStage {
  if (closedRituals >= 12) return 'arvore';
  if (closedRituals >= 4) return 'muda';
  if (closedRituals >= 1) return 'broto';
  return 'semente';
}

// ============================================================================
// ANIMAL LOTS
// ============================================================================

export interface AnimalLotStats {
  dailyCrop?: Crop;
  today: number;
  yesterday: number;
  week: number;
  month: number;
  pending: boolean; // a daily product the lot usually gives has not been logged today
  slaughters: number; // this year
  slaughterQty: number;
  lastAdjustment?: AnimalAdjustment;
  closed: boolean;
}

/** Product a species gives every day (leite, ovos), when the catalog has one */
export function dailyCropFor(species: Species, crops: Crop[]): Crop | undefined {
  return crops.find(c => c.species === species && c.animalYield === 'collect');
}

export function animalLotStats(group: AnimalGroup, data: Pick<FarmData, 'harvests' | 'crops' | 'animalAdjustments'>, now: Date): AnimalLotStats {
  const own = data.harvests.filter(h => h.animalGroupId === group.id);
  const daily = dailyCropFor(group.species, data.crops);
  const dailyHarvests = daily ? own.filter(h => h.cropId === daily.id) : [];
  const sum = (rows: HarvestEvent[]) => round1(rows.reduce((s, h) => s + h.quantity, 0));
  const recentDays = new Set(dailyHarvests.filter(h => calendarDays(h.harvestedAt, now) <= 7).map(h => calendarDays(h.harvestedAt, now)));
  const today = sum(dailyHarvests.filter(h => isToday(h.harvestedAt, now)));
  const adjustments = data.animalAdjustments.filter(a => a.groupId === group.id).sort((a, b) => b.adjustedAt.localeCompare(a.adjustedAt));
  const yearSlaughters = adjustments.filter(a => a.reason === 'slaughter' && new Date(a.adjustedAt).getFullYear() === now.getFullYear());
  const slaughterIds = new Set(yearSlaughters.map(a => a.harvestEventId));
  return {
    dailyCrop: daily,
    today,
    yesterday: sum(dailyHarvests.filter(h => calendarDays(h.harvestedAt, now) === 1)),
    week: sum(dailyHarvests.filter(h => inWeek(h.harvestedAt, now))),
    month: sum(dailyHarvests.filter(h => new Date(h.harvestedAt).getMonth() === now.getMonth() && new Date(h.harvestedAt).getFullYear() === now.getFullYear())),
    pending: group.headcount > 0 && !!daily && recentDays.size >= 2 && today === 0,
    slaughters: yearSlaughters.reduce((s, a) => s - a.delta, 0),
    slaughterQty: sum(own.filter(h => slaughterIds.has(h.id))),
    lastAdjustment: adjustments[0],
    closed: group.headcount === 0,
  };
}

/** Daily totals of the lot's daily product for the last `days` days, today last */
export function dailySeries(group: AnimalGroup, cropId: string, harvests: HarvestEvent[], now: Date, days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const offset = days - 1 - i;
    const total = harvests
      .filter(h => h.animalGroupId === group.id && h.cropId === cropId && calendarDays(h.harvestedAt, now) === offset)
      .reduce((s, h) => s + h.quantity, 0);
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    return { date, total: round1(total), offset };
  });
}

/** Lots of animals drawn on the map: with heads, or closed in the last 7 days */
export function mapAnimalGroups(groups: AnimalGroup[], adjustments: AnimalAdjustment[], now: Date): AnimalGroup[] {
  return [...groups].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).filter(g => {
    if (g.headcount > 0) return true;
    const last = adjustments.filter(a => a.groupId === g.id).map(a => a.adjustedAt).sort().pop();
    return !!last && calendarDays(last, now) <= 7;
  });
}

// ============================================================================
// PROCESSING ("indústria")
// ============================================================================

export interface ProcessableStock {
  crop: Crop;
  total: number;
  unit: UnitType;
  oldestDays: number;
}

/** Stock that can become another product, most urgent first */
export function processableStock(groups: StockGroup[], crops: Crop[]): ProcessableStock[] {
  const byCrop = new Map<string, ProcessableStock>();
  for (const g of groups) {
    if (derivedOf(g.crop.id, crops).length === 0) continue;
    const cur = byCrop.get(g.crop.id);
    byCrop.set(g.crop.id, {
      crop: g.crop,
      unit: g.unit,
      total: round1((cur?.total ?? 0) + g.total),
      oldestDays: Math.min(cur?.oldestDays ?? Infinity, g.worst.days),
    });
  }
  return [...byCrop.values()].sort((a, b) => a.oldestDays - b.oldestDays);
}

// ============================================================================
// NOTIFICATIONS (generated on the phone, no network)
// ============================================================================

export type NoticeCategory = 'paiol' | 'talhao' | 'animal' | 'feira' | 'bau';
export type NoticeTone = 'urucum' | 'amber' | 'river' | 'canopy' | 'muted';
export type NoticeIcon = 'paiol' | 'talhao' | 'colher' | 'olho' | 'feira' | 'bau' | 'milk' | 'egg' | 'heads';

export interface Notice {
  id: string;
  group: 'now' | 'week';
  category: NoticeCategory;
  tone: NoticeTone;
  icon: NoticeIcon;
  kind: { key: string; params?: Record<string, unknown> } | { text: string };
  at: string; // reference time shown as "when"
  title: { key: string; params?: Record<string, unknown> };
  body: { key: string; params?: Record<string, unknown> };
  cta: string; // i18n key
  href: string;
  main?: boolean; // primary action style while unread
}

export function notifications(data: FarmData, now: Date): Notice[] {
  const out: Notice[] = [];
  const nowIso = now.toISOString();
  const crops = indexById(data.crops);
  const muted = new Set(data.settings.mutedNotifications ?? []);
  const groups = stockGroups(data, now);

  // Stock: expiring and expired lots
  for (const g of groups) {
    for (const lot of g.lots) {
      const name = g.crop.name;
      const params = { name, qty: lot.quantityRemaining, unit: lot.unit, count: lot.quantityRemaining, days: lot.life.days };
      if (lot.life.state === 'today' || lot.life.state === 'expired') {
        out.push({
          id: `lot-out:${lot.id}`, group: 'now', category: 'paiol', tone: 'urucum', icon: 'paiol', kind: { key: 'notices.kind.paiol' }, at: nowIso,
          title: { key: lot.life.state === 'today' ? 'notices.lotToday.title' : 'notices.lotExpired.title', params: { name, count: -lot.life.days } },
          body: { key: 'notices.lotToday.body', params },
          cta: 'notices.cta.adjust', href: `/paiol/ajustar?lote=${lot.id}`, main: true,
        });
      } else if (lot.life.state === 'soon' && lot === g.lots.find(l => l.life.state === 'soon')) {
        // one reminder per product: its lot closest to expiry
        const canProcess = derivedOf(g.crop.id, data.crops).length > 0;
        out.push({
          id: `lot-soon:${lot.id}:${lot.life.days}`, group: 'now', category: canProcess ? 'animal' : 'paiol', tone: 'amber', icon: canProcess ? 'milk' : 'paiol',
          kind: { key: 'notices.kind.paiol' }, at: nowIso,
          title: { key: 'notices.lotSoon.title', params: { name, count: lot.life.days } },
          body: { key: canProcess ? 'notices.lotSoon.bodyProcess' : 'notices.lotSoon.body', params: { ...params, date: lot.harvestedAt } },
          cta: canProcess ? 'notices.cta.process' : 'notices.cta.openStock', href: canProcess ? `/processar?entrada=${g.crop.id}` : '/paiol',
        });
      }
    }
  }

  // Plots
  for (const zone of plotZones(data)) {
    const st = plotStatus(zone, data, now);
    const kind = { text: zone.name };
    if (st.state === 'pronto' && st.readyCropId) {
      const last = st.lastHarvest ? calendarDays(st.lastHarvest.harvestedAt, now) : undefined;
      out.push({
        id: `plot-ready:${zone.id}:${weekKey(now)}`, group: 'now', category: 'talhao', tone: 'amber', icon: 'colher', kind, at: nowIso,
        title: { key: 'notices.plotReady.title', params: { name: crops.get(st.readyCropId)?.name ?? '' } },
        body: { key: last === undefined ? 'notices.plotReady.bodyFirst' : 'notices.plotReady.body', params: { count: last } },
        cta: 'notices.cta.harvest', href: `/colher?talhao=${zone.id}`, main: true,
      });
    }
    if (st.state === 'observar') {
      out.push({
        id: `plot-observe:${zone.id}:${weekKey(now)}`, group: 'week', category: 'talhao', tone: 'river', icon: 'olho', kind, at: st.lastObservation?.observedAt ?? nowIso,
        title: { key: st.daysSinceObservation === undefined ? 'notices.plotObserve.titleNever' : 'notices.plotObserve.title', params: { count: st.daysSinceObservation } },
        body: { key: 'notices.plotObserve.body' },
        cta: 'notices.cta.observe', href: `/observar?talhao=${zone.id}`,
      });
    }
    if (st.state === 'seco') {
      out.push({
        id: `plot-dry:${zone.id}:${st.lastObservation?.id}`, group: 'now', category: 'talhao', tone: 'river', icon: 'olho', kind, at: st.lastObservation!.observedAt,
        title: { key: 'notices.plotDry.title' }, body: { key: 'notices.plotDry.body' },
        cta: 'notices.cta.seePlot', href: `/talhao/${zone.id}`,
      });
    }
    if ((st.state === 'vazio' || st.state === 'preparando') && st.emptySince) {
      const weeks = Math.floor(calendarDays(st.emptySince, now) / 7);
      if (weeks >= 3) {
        out.push({
          id: `plot-empty:${zone.id}:${weeks}`, group: 'week', category: 'talhao', tone: 'muted', icon: 'talhao', kind, at: st.emptySince,
          title: { key: 'notices.plotEmpty.title', params: { count: weeks } }, body: { key: 'notices.plotEmpty.body' },
          cta: 'notices.cta.plant', href: `/talhao/${zone.id}/plantar`,
        });
      }
    }
    for (const p of st.plantings) {
      const crop = crops.get(p.cropId);
      const left = daysToHarvest(p, crop, now);
      if (crop && left !== undefined && left > 0 && left <= 14) {
        out.push({
          id: `plot-soon:${p.id}`, group: 'week', category: 'talhao', tone: 'canopy', icon: 'talhao', kind, at: p.plantedAt,
          title: { key: 'notices.plantSoon.title', params: { name: crop.name } },
          body: { key: 'notices.plantSoon.body', params: { weeks: Math.floor(calendarDays(p.plantedAt, now) / 7), count: left } },
          cta: 'notices.cta.seePlot', href: `/talhao/${zone.id}`,
        });
      }
    }
  }

  // Market list
  const feira = feiraStatus(data, now);
  if (feira.state === 'desatualizada') {
    out.push({
      id: `feira-stale:${data.list!.id}:${feira.changes}`, group: 'now', category: 'feira', tone: 'amber', icon: 'feira', kind: { key: 'notices.kind.feira' }, at: data.list!.createdAt,
      title: { key: 'notices.feiraStale.title' }, body: { key: 'notices.feiraStale.body', params: { count: feira.changes } },
      cta: 'notices.cta.updateFeira', href: '/feira',
    });
  } else if (feira.state === 'none' && groups.length > 0) {
    out.push({
      id: `feira-none:${weekKey(now)}`, group: 'now', category: 'feira', tone: 'amber', icon: 'feira', kind: { key: 'notices.kind.feira' }, at: nowIso,
      title: { key: 'notices.feiraNone.title' }, body: { key: 'notices.feiraNone.body' },
      cta: 'notices.cta.updateFeira', href: '/feira',
    });
  }

  // Animals: daily production not logged
  for (const g of data.animalGroups) {
    const s = animalLotStats(g, data, now);
    if (!s.pending || !s.dailyCrop) continue;
    const milk = s.dailyCrop.defaultUnit === 'liter';
    const avg = round1(s.week / Math.max(1, (now.getDay() + 6) % 7 || 1));
    out.push({
      id: `animal-daily:${g.id}:${weekKey(now)}:${now.getDay()}`, group: 'now', category: 'animal', tone: 'amber', icon: milk ? 'milk' : 'egg', kind: { text: g.name }, at: nowIso,
      title: { key: milk ? 'notices.milking.title' : 'notices.collect.title', params: { name: s.dailyCrop.name } },
      body: { key: s.yesterday ? 'notices.milking.body' : 'notices.collect.body', params: { qty: s.yesterday || avg, unit: s.dailyCrop.defaultUnit } },
      cta: milk ? 'notices.cta.milk' : 'notices.cta.collect', href: `/colher?lote=${g.id}`, main: milk,
    });
  }

  // Backup
  const lastExport = data.settings.lastExportAt;
  const sinceExport = lastExport ? calendarDays(lastExport, now) : undefined;
  if (sinceExport === undefined || sinceExport >= 6) {
    out.push({
      id: `bau:${weekKey(now)}`, group: 'week', category: 'bau', tone: 'muted', icon: 'bau', kind: { key: 'notices.kind.bau' }, at: lastExport ?? nowIso,
      title: { key: sinceExport === undefined ? 'notices.bau.titleNever' : 'notices.bau.title', params: { count: sinceExport } }, body: { key: 'notices.bau.body' },
      cta: 'notices.cta.backup', href: '/ajustes',
    });
  }

  const order: NoticeTone[] = ['urucum', 'amber', 'river', 'canopy', 'muted'];
  return out
    .filter(n => !muted.has(n.category))
    .sort((a, b) => (a.group === b.group ? 0 : a.group === 'now' ? -1 : 1) || order.indexOf(a.tone) - order.indexOf(b.tone));
}

export function unreadCount(list: Notice[], reads: NotificationRead[]): number {
  const read = new Set(reads.map(r => r.id));
  return list.filter(n => !read.has(n.id)).length;
}

// ============================================================================
// ACHIEVEMENTS ("sementes guardadas"): personal, never public
// ============================================================================

export interface Achievement {
  key: 'firstHarvest' | 'feirasSent' | 'collection' | 'firstBackup' | 'guild' | 'zeroLoss';
  earned: boolean;
  value?: number;
}

export function achievements(data: FarmData, sentLists: number, now: Date): Achievement[] {
  const tags = new Set(data.crops.flatMap(c => c.guildTags ?? []));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const losses = data.adjustments.some(a => (a.reason === 'loss' || a.reason === 'damage') && a.adjustedAt >= monthStart);
  return [
    { key: 'firstHarvest', earned: data.harvests.length > 0 },
    { key: 'feirasSent', earned: sentLists >= 4, value: sentLists },
    { key: 'collection', earned: data.crops.length >= 10, value: data.crops.length },
    { key: 'firstBackup', earned: !!data.settings.lastExportAt },
    { key: 'guild', earned: tags.size >= 5, value: tags.size },
    { key: 'zeroLoss', earned: now.getDate() >= 28 && !losses && data.harvests.some(h => h.harvestedAt >= monthStart) },
  ];
}
