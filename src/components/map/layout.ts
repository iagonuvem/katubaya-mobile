/**
 * Where everything sits on the farm map (map px, 390 wide). The top band (storehouse, ritual
 * board, market stall) is fixed; plots stack in two masonry columns; animal pens and the
 * processing house follow in rows of two; the free land closes the map.
 */

import type { AnimalGroup, Zone, ZoneType } from '@/domain/contracts/types';

export const MAP_W = 390;
export const NAV_CLEARANCE = 96;

export interface Box { x: number; y: number; w: number; h: number }
export type Tile =
  | ({ kind: 'plot'; zone: Zone } & Box)
  | ({ kind: 'pen'; group: AnimalGroup } & Box)
  | ({ kind: 'industria' } & Box);

export interface MapLayout {
  plots: Extract<Tile, { kind: 'plot' }>[];
  pens: Extract<Tile, { kind: 'pen' }>[];
  industria: Extract<Tile, { kind: 'industria' }>;
  terreno: Box;
  roads: Box[];
  height: number;
}

const DEFAULT_H: Record<ZoneType, number> = { canteiro: 100, linha: 172, agrofloresta: 206, pomar: 160, pasto: 150, abrigo: 120 };
const COLS = [{ x: 14, w: 158 }, { x: 220, w: 156 }];
const PEN_COLS = [{ x: 14, w: 188 }, { x: 234, w: 142 }];
const PLOTS_TOP = 284;
const GAP = 14;

/** Map height of a plot tile: stored at creation, else by type */
export function plotHeight(zone: Zone): number {
  return zone.mapHeight ?? DEFAULT_H[zone.type ?? 'canteiro'];
}

/** Tile height for a new plot from its marked area (m²) */
export function heightForArea(areaM2: number): number {
  return Math.round(Math.max(90, Math.min(210, 80 + areaM2 * 0.6)));
}

export function layoutMap(plots: Zone[], pens: AnimalGroup[]): MapLayout {
  const colY = [PLOTS_TOP, PLOTS_TOP];
  const plotTiles = plots.map(zone => {
    const c = colY[1] < colY[0] ? 1 : 0;
    const h = plotHeight(zone);
    const tile = { kind: 'plot' as const, zone, x: COLS[c].x, y: colY[c], w: COLS[c].w, h };
    colY[c] += h + GAP;
    return tile;
  });
  const plotsBottom = plotTiles.length ? Math.max(...plotTiles.map(t => t.y + t.h)) : PLOTS_TOP - 20;
  const roads: Box[] = [
    { x: 0, y: 240, w: MAP_W, h: 30 },
    { x: 180, y: 240, w: 28, h: plotsBottom + 8 + 18 - 240 },
    { x: 0, y: plotsBottom + 8, w: MAP_W, h: 18 },
  ];

  // Pens and the processing house, two per row, rows alternating tall and short
  const sectionTop = plotsBottom + 40;
  const items: ({ kind: 'pen'; group: AnimalGroup } | { kind: 'industria' })[] = [...pens.map(group => ({ kind: 'pen' as const, group })), { kind: 'industria' }];
  let y = sectionTop;
  const placed: Tile[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const h = (i / 2) % 2 === 0 ? 178 : 138;
    items.slice(i, i + 2).forEach((item, c) => placed.push({ ...item, x: PEN_COLS[c].x, y, w: PEN_COLS[c].w, h } as Tile));
    const last = i + 2 >= items.length;
    roads.push({ x: 0, y: y + h + (last ? 4 : 8), w: MAP_W, h: last ? 12 : 16 });
    y += h + 30;
  }
  const lastRoad = roads[roads.length - 1];
  roads.push({ x: 208, y: sectionTop - 16, w: 18, h: lastRoad.y + lastRoad.h - (sectionTop - 16) });
  const terreno = { x: 14, y: lastRoad.y + 18, w: 362, h: 72 };

  return {
    plots: plotTiles,
    pens: placed.filter((t): t is Extract<Tile, { kind: 'pen' }> => t.kind === 'pen'),
    industria: placed.find((t): t is Extract<Tile, { kind: 'industria' }> => t.kind === 'industria')!,
    terreno,
    roads,
    height: terreno.y + terreno.h + NAV_CLEARANCE,
  };
}
