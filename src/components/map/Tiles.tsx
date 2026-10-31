/**
 * The drawings inside each map tile: plots grow what is planted in them, pens hold their animals.
 * Positions follow the design canvas, scaled to each tile.
 */

import type { AnimalGroup, Crop, Planting, Zone } from '@/domain/contracts/types';
import type { PlotState } from '@/domain/rules/farm';
import { sprite } from '@/components/game/Shell';
import { plantSprite, type PlantSprite } from './SceneDefs';
import type { Box } from './layout';

const FENCE = { border: '#e6d3a8', post: '#a88a58' };

function Fence({ x, y, w, h, r = 6 }: Box & { r?: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={FENCE.border} strokeWidth="4" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={FENCE.post} strokeWidth="7" strokeDasharray="3 16" />
    </>
  );
}

const GROUND: Record<string, string> = {
  linha: '#7fae52', agrofloresta: '#74a64a', pomar: '#7fae52', canteiro: '#b07a43', pasto: '#a8d06e', abrigo: '#d9b77a', empty: '#b07a43',
};

interface PlotArtProps extends Box {
  zone: Zone;
  plantings: Planting[];
  crops: Map<string, Crop>;
  state: PlotState;
}

interface Placed { sprite: PlantSprite; x: number; y: number; sway?: boolean }

const use = (p: Placed, key: string | number) => (
  <use key={key} href={`#${p.sprite}`} x={p.x} y={p.y} className={p.sway ? 'map-sway' : undefined} />
);

/** Which planting fills each cell of the 6 × rows grid */
function cellMap(plantings: Planting[]): Map<number, Planting> {
  const m = new Map<number, Planting>();
  for (const p of plantings) for (const c of p.cells) m.set(c, p);
  return m;
}

export function PlotArt({ x, y, w, h, zone, plantings, crops, state }: PlotArtProps) {
  const type = zone.type ?? 'canteiro';
  const empty = plantings.length === 0;
  const rows = zone.gridRows ?? 3;
  const cells = cellMap(plantings);
  const spriteOf = (p: Planting) => plantSprite(crops.get(p.cropId)?.name ?? '', p.layer);
  const placed: Placed[] = [];
  let beds: JSX.Element | null = null;

  if (type === 'canteiro' || (empty && type !== 'pasto' && type !== 'abrigo')) {
    if (empty) {
      const lines = [];
      for (let ly = y + 20; ly <= y + h - 16; ly += 20) lines.push(<line key={ly} x1={x + 16} y1={ly} x2={x + w - 16} y2={ly} />);
      beds = <g stroke="#c99a62" strokeWidth="7" strokeLinecap="round">{lines}</g>;
    } else {
      const stride = (h - 16) / rows;
      const bedH = Math.max(14, stride - 12);
      const step = (w - 52) / 5;
      beds = <g fill="#8a5a2b">{Array.from({ length: rows }, (_, r) => <rect key={r} x={x + 10} y={y + 12 + r * stride} width={w - 20} height={bedH} rx="5" />)}</g>;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 6; c++) {
          const p = cells.get(r * 6 + c);
          if (p) placed.push({ sprite: spriteOf(p), x: x + 26 + c * step, y: y + 12 + r * stride + bedH / 2 });
        }
      }
    }
  } else if (type === 'linha' || type === 'pomar') {
    const n = Math.max(2, Math.min(8, Math.round((h - 20) / 28)));
    const perRow = Math.floor((w - 28) / 36) + 1;
    for (let v = 0; v < n; v++) {
      const r = v % rows;
      const rowCells = Array.from({ length: 6 }, (_, c) => cells.get(r * 6 + c));
      const any = rowCells.find(Boolean);
      if (!any) continue;
      const offset = any.layer === 'medio' || any.layer === 'rasteiro' ? 18 : 0;
      const vy = y + 34 + v * ((h - 44) / Math.max(1, n - 1)) - (v === n - 1 ? 16 : 0);
      for (let k = 0; k < perRow - (offset ? 1 : 0); k++) {
        const p = rowCells[Math.min(5, Math.round((k * 5) / Math.max(1, perRow - 1)))];
        if (p) placed.push({ sprite: spriteOf(p), x: x + 26 + offset + k * 36, y: vy, sway: v === 0 && p.layer === 'alto' });
      }
    }
  } else if (type === 'agrofloresta') {
    // Design positions inside a 156 × 206 tile, by stratum
    const POOLS: Record<string, [number, number][]> = {
      top: [[30, 38], [126, 46], [70, 146]],
      mid: [[80, 72], [28, 108], [130, 112], [102, 178], [50, 186]],
      low: [[70, 36], [92, 134], [20, 154], [136, 186], [118, 80], [40, 70]],
    };
    const pool = (l: string) => (l === 'emergente' ? 'top' : l === 'alto' || l === 'medio' ? 'mid' : 'low');
    const used: Record<string, number> = { top: 0, mid: 0, low: 0 };
    const sx = w / 156, sy = h / 206;
    for (const p of [...plantings].sort((a, b) => order(a.layer) - order(b.layer))) {
      const key = pool(p.layer);
      const n = Math.min(p.count ?? p.cells.length, POOLS[key].length - used[key]);
      for (let i = 0; i < n; i++) {
        const [px, py] = POOLS[key][used[key]++];
        placed.push({ sprite: spriteOf(p), x: x + px * sx, y: y + py * sy });
      }
    }
    placed.sort((a, b) => (a.sprite === 'arv' ? 1 : 0) - (b.sprite === 'arv' ? 1 : 0) || a.y - b.y);
  } else {
    // Pasture or shelter: tufts, and grass where forage was planted
    const step = (w - 40) / 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 6; c++) {
        const p = cells.get(r * 6 + c);
        if (p) placed.push({ sprite: spriteOf(p), x: x + 20 + c * step, y: y + 24 + r * ((h - 40) / Math.max(1, rows - 1)) });
      }
    }
  }

  const ground = empty && type !== 'pasto' && type !== 'abrigo' ? GROUND.empty : GROUND[type] ?? GROUND.linha;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" fill={state === 'pasto' ? GROUND.pasto : ground} />
      {(type === 'pasto' || type === 'abrigo') && [[0.18, 0.2], [0.7, 0.35], [0.3, 0.7], [0.85, 0.85]].map(([fx, fy], i) => (
        <use key={i} href="#tuft" x={x + fx * w} y={y + fy * h} />
      ))}
      {type === 'abrigo' && <image href={sprite('galinheiro')} x={x + w * 0.25} y={y + 6} width={w * 0.6} />}
      <Fence x={x} y={y} w={w} h={h} />
      {beds}
      {placed.map(use)}
    </g>
  );
}

const order = (l: string) => ['emergente', 'alto', 'medio', 'baixo', 'rasteiro', 'pasto'].indexOf(l);

// ============================================================================
// Pens
// ============================================================================

interface PenArtProps extends Box { group: AnimalGroup }

const scale = (b: Box, dw: number, dh: number) => (px: number, py: number): [number, number] => [b.x + (px * b.w) / dw, b.y + (py * b.h) / dh];

export function PenArt(props: PenArtProps) {
  const { x, y, w, h, group } = props;
  const heads = group.headcount;
  const at = scale(props, 188, 178);
  switch (group.species) {
    case 'cattle': {
      const cows: [number, number][] = [[36, 46], [106, 56], [62, 100], [146, 106], [30, 152], [112, 154]];
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx="8" fill="#a8d06e" /><Fence x={x} y={y} w={w} h={h} r={8} />
          {[[26, 26], [106, 76], [16, 116], [166, 156]].map(([px, py], i) => <use key={i} href="#tuft" x={at(px, py)[0]} y={at(px, py)[1]} />)}
          <rect x={x + w - 52} y={y + 12} width="40" height="12" rx="3" fill="#7a5230" /><rect x={x + w - 49} y={y + 14} width="34" height="6" rx="2" fill="#7fc4d6" />
          {cows.slice(0, Math.min(heads, 6)).map(([px, py], i) => {
            const [cx, cy] = at(px, py);
            return <use key={i} className="map-graze" href="#cow" x={cx} y={cy} style={{ animationDelay: `${-0.6 * i}s` }} />;
          })}
        </g>
      );
    }
    case 'poultry': {
      const pAt = scale(props, 142, 178);
      const hens: [number, number][] = [[20, 96], [44, 126], [66, 100], [96, 146], [22, 156], [116, 112], [58, 160], [84, 92]];
      const n = Math.min(heads, 8);
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx="8" fill="#d9b77a" /><Fence x={x} y={y} w={w} h={h} r={8} />
          <image href={sprite('galinheiro')} x={x + w * 0.25} y={y + 6} width={Math.min(104, w * 0.73)} />
          {[0, 1].map(gi => (
            <g key={gi} className="map-roam" style={{ animationDelay: `${-3 * gi}s` }}>
              {hens.slice(0, n).filter((_, i) => i % 2 === gi).map(([px, py], i) => {
                const [hx, hy] = pAt(px, py);
                return <use key={i} className="map-peck" href={(i + gi) % 2 ? '#hen2' : '#hen'} x={hx} y={hy} style={{ animationDelay: `${-0.4 * i - 0.2 * gi}s` }} />;
              })}
            </g>
          ))}
        </g>
      );
    }
    case 'swine': {
      const pAt = scale(props, 188, 138);
      const pigs: [number, number][] = [[36, 36], [102, 50], [66, 106], [142, 100]];
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx="8" fill="#a07a4c" /><Fence x={x} y={y} w={w} h={h} r={8} />
          <ellipse cx={pAt(58, 78)[0]} cy={pAt(58, 78)[1]} rx={38 * (w / 188)} ry="14" fill="#7a5636" />
          <rect x={x + w - 62} y={y + 14} width="50" height="12" rx="3" fill="#7a5230" /><rect x={x + w - 59} y={y + 16} width="44" height="6" rx="2" fill="#d9c39a" />
          {pigs.slice(0, Math.min(heads, 4)).map(([px, py], i) => {
            const [qx, qy] = pAt(px, py);
            return <use key={i} className="map-wig" href="#pig" x={qx} y={qy} style={{ animationDelay: `${-0.6 * i}s` }} />;
          })}
        </g>
      );
    }
    case 'bees': {
      const pAt = scale(props, 188, 178);
      const hives: [number, number][] = [[40, 60], [90, 70], [140, 60], [64, 130], [118, 130]];
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx="8" fill="#9cc96a" /><Fence x={x} y={y} w={w} h={h} r={8} />
          {hives.slice(0, Math.max(1, Math.min(heads, 5))).map(([px, py], i) => <use key={i} href="#hive" x={pAt(px, py)[0]} y={pAt(px, py)[1]} />)}
          {heads > 0 && [[70, 40], [120, 100], [50, 110]].map(([px, py], i) => (
            <circle key={i} className="map-bee" cx={pAt(px, py)[0]} cy={pAt(px, py)[1]} r="2" fill="#1e2316" style={{ animationDelay: `${-i}s` }} />
          ))}
        </g>
      );
    }
    case 'fish': {
      const pAt = scale(props, 188, 178);
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx="8" fill="#9cc96a" /><Fence x={x} y={y} w={w} h={h} r={8} />
          <ellipse cx={x + w / 2} cy={y + h / 2 + 6} rx={w * 0.38} ry={h * 0.3} fill="#5fa8bf" stroke="#d2ad72" strokeWidth="4" />
          {heads > 0 && [[70, 90], [110, 104], [94, 76]].map(([px, py], i) => (
            <ellipse key={i} className="map-roam" cx={pAt(px, py)[0]} cy={pAt(px, py)[1]} rx="6" ry="2.5" fill="#e08a2c" style={{ animationDelay: `${-2 * i}s` }} />
          ))}
        </g>
      );
    }
    default: {
      const pAt = scale(props, 188, 178);
      const pos: [number, number][] = [[40, 60], [110, 70], [70, 120], [150, 130], [30, 150]];
      const href = group.species === 'goat' ? '#goat' : '#sheep';
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx="8" fill="#b8d77f" /><Fence x={x} y={y} w={w} h={h} r={8} />
          {pos.slice(0, Math.min(heads, 5)).map(([px, py], i) => (
            <use key={i} className="map-graze" href={href} x={pAt(px, py)[0]} y={pAt(px, py)[1]} style={{ animationDelay: `${-0.7 * i}s` }} />
          ))}
        </g>
      );
    }
  }
}

export function IndustriaArt({ x, y, w, h }: Box) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#9cc96a" />
      <image href={sprite('industria')} x={x + 4} y={y + 6} width={w - 4} />
    </g>
  );
}
