/**
 * Sítio: the playable farm map. Every plot, pen and building is a button that opens a sheet;
 * the people on the map act out what the farm needs right now.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import {
  PLOT_TONE,
  animalLotStats,
  calendarDays,
  derivedOf,
  feiraStatus,
  indexById,
  isoWeek,
  lotLife,
  mapAnimalGroups,
  notifications,
  plantCount,
  plotStatus,
  plotZones,
  processableStock,
  ritual,
  stockGroups,
  stockSummary,
  treeStage,
  unreadCount,
  weekKey,
  type FarmData,
  type PlotState,
  type PlotStatus,
  type Ritual,
} from '@/domain/rules/farm';
import { itemDisplayName } from '@/domain/rules/availability';
import type { AnimalGroup, Zone } from '@/domain/contracts/types';
import { generateList, recordRitualWeek, sendList } from '@/data/actions';
import { BottomNav, BottomSheet, GameToast, SheetHead, sprite } from '@/components/game/Shell';
import { Icon, type IconName } from '@/components/game/Icon';
import { showToast } from '@/components/game/toast';
import { cropDot, categoryDot } from '@/components/game/crop';
import { SceneDefs } from '@/components/map/SceneDefs';
import { IndustriaArt, PenArt, PlotArt } from '@/components/map/Tiles';
import { layoutMap, MAP_W, type Box } from '@/components/map/layout';
import { TreeStageArt } from '@/components/game/TreeStage';
import { fmtDayMonth, fmtDdMm, fmtMoney, fmtMonthYear, fmtQty, fmtTime, fmtUnit, fmtWeekday } from '@/lib/format';
import '@/components/map/map.css';

const LAYER_ORDER = ['emergente', 'alto', 'medio', 'baixo', 'rasteiro', 'pasto'];

type Selection = { kind: 'plot' | 'pen'; id: string } | { kind: 'paiol' | 'feira' | 'mural' | 'novo' | 'industria' } | null;

const TONES = {
  amber: ['var(--amber-soft)', 'var(--amber)', '#d79a2b'],
  river: ['var(--river-soft)', 'var(--river)', 'var(--river)'],
  canopy: ['var(--canopy-soft)', 'var(--canopy)', 'var(--canopy)'],
  muted: ['var(--surface-sunken)', 'var(--ink-muted)', 'var(--line-strong)'],
} as const;
type Tone = keyof typeof TONES;
const DOT_ON_MAP: Record<Tone, string> = { amber: '#d79a2b', river: '#1d5d70', canopy: '#2d5a28', muted: '#857c66' };

function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const [bg, fg, dot] = TONES[tone];
  return (
    <div className="kb-status-pill" style={{ background: bg, color: fg }}>
      <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
      {children}
    </div>
  );
}

function useStageScale(ref: React.RefObject<HTMLElement>) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / MAP_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}

export default function MapPage() {
  const data = useFarm();
  const now = useNow();
  if (!data) return <div className="min-h-dvh" style={{ background: '#8fbf5a' }} aria-busy="true" />;
  return <FarmMap data={data} now={now} />;
}

function FarmMap({ data, now }: { data: FarmData; now: Date }) {
  const { t } = useTranslation();
  const [sel, setSel] = useState<Selection>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const scale = useStageScale(wrap);

  const crops = useMemo(() => indexById(data.crops), [data.crops]);
  const zonesById = useMemo(() => indexById(data.zones), [data.zones]);
  const plots = plotZones(data);
  const pens = mapAnimalGroups(data.animalGroups, data.animalAdjustments, now);
  const layout = layoutMap(plots, pens);
  const statuses = new Map(plots.map(z => {
    const st = plotStatus(z, data, now);
    return [z.id, { ...st, plantings: [...st.plantings].sort((a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer)) }];
  }));
  const groups = stockGroups(data, now);
  const summary = stockSummary(groups);
  const feira = feiraStatus(data, now);
  const rit = ritual(data, now);
  const notices = notifications(data, now);
  const unread = unreadCount(notices, data.notificationReads);
  const processable = processableStock(groups, data.crops);
  const penStats = new Map(pens.map(g => [g.id, animalLotStats(g, data, now)]));
  const heads = data.animalGroups.reduce((s, g) => s + g.headcount, 0);
  const anyReady = [...statuses.values()].some(s => s.state === 'pronto');

  useEffect(() => {
    if (rit.complete) recordRitualWeek(weekKey(now));
  }, [rit.complete, now]);

  const pick = (s: Exclude<Selection, null>) => setSel(cur => (JSON.stringify(cur) === JSON.stringify(s) ? null : s));
  const isSel = (s: Exclude<Selection, null>) => JSON.stringify(sel) === JSON.stringify(s);
  const close = () => setSel(null);

  const send = async () => {
    setSel(null);
    const list = data.list ?? (await generateList('this'));
    const ok = await sendList(list);
    showToast(ok ? t('map.copied') : t('map.copyFailed'));
  };

  const hitStyle = (b: Box, s: Exclude<Selection, null>): CSSProperties => ({ left: b.x, top: b.y, width: b.w, height: b.h });
  const hitClass = (s: Exclude<Selection, null>) => `map-hit ${isSel(s) ? 'map-hit-on' : sel ? 'map-hit-dim' : ''}`;

  const paiolPin = summary.expiring > 0
    ? { dot: 'var(--urucum)', style: { color: '#a3321c' }, text: t('map.pin.expiring', { count: summary.expiring }) }
    : { dot: '#2d5a28', style: { color: '#5a5d4c' }, text: t('map.pin.boxes', { count: summary.boxes }) };
  const feiraPin = {
    none: { ask: true, dot: '', color: '#7a5200', text: t('map.pin.feiraNone') },
    desatualizada: { ask: true, dot: '', color: '#7a5200', text: t('map.pin.feiraStale') },
    pronta: { ask: false, dot: '#2d5a28', color: '#2d5a28', text: t('map.pin.feiraReady') },
    enviada: { ask: false, dot: '#2d5a28', color: '#5a5d4c', text: t('map.pin.feiraSent') },
  }[feira.state];

  const stage = (
    <div className="map-stage" style={{ height: layout.height, transform: `scale(${scale})` }}>
      <svg aria-hidden="true" width={MAP_W} height={layout.height} viewBox={`0 0 ${MAP_W} ${layout.height}`} className="absolute left-0 top-0">
        <SceneDefs />
        {[[30, 250], [120, 470], [200, 300], [380, 470], [60, 625], [330, 628], [214, 500], [150, 740]].map(([x, y], i) => <use key={i} href="#tuft" x={x} y={y} />)}
        <use href="#tree" x="-6" y="96" /><use href="#tree" x="388" y="108" /><use href="#tree" x="396" y="420" /><use href="#tree" x="-10" y="470" />
        {layout.roads.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="#d2ad72" />)}
        <g fill="#c09a5e"><circle cx="40" cy="255" r="2" /><circle cx="140" cy="250" r="1.6" /><circle cx="260" cy="262" r="2" /><circle cx="194" cy="350" r="1.6" /></g>

        {layout.plots.map(tile => (
          <PlotArt key={tile.zone.id} {...tile} plantings={statuses.get(tile.zone.id)!.plantings} crops={crops} state={statuses.get(tile.zone.id)!.state} />
        ))}
        {layout.pens.map(tile => <PenArt key={tile.group.id} {...tile} />)}
        <IndustriaArt {...layout.industria} />
        <rect x={layout.terreno.x} y={layout.terreno.y} width={layout.terreno.w} height={layout.terreno.h} rx="10" fill="#9cc96a" stroke="#f3eedf" strokeWidth="2.5" strokeDasharray="8 7" />

        {/* Market stall */}
        <ellipse cx="306" cy="228" rx="70" ry="9" fill="rgba(30,35,22,.2)" />
        <rect x="252" y="130" width="6" height="52" fill="#7a5230" /><rect x="354" y="130" width="6" height="52" fill="#7a5230" />
        <rect x="250" y="180" width="112" height="44" rx="3" fill="#a8743f" /><rect x="246" y="174" width="120" height="10" rx="3" fill="#c8935a" />
        <g>{[0, 1, 2, 3, 4, 5, 6, 7].map(i => <rect key={i} x={242 + i * 16} y="116" width="16" height="22" fill={i % 2 ? '#f3e5c0' : '#a3321c'} />)}</g>
        <g>{[0, 1, 2, 3, 4, 5, 6, 7].map(i => <circle key={i} cx={250 + i * 16} cy="138" r="8" fill={i % 2 ? '#f3e5c0' : '#a3321c'} />)}</g>
        {/* Ritual board */}
        <ellipse cx="206" cy="236" rx="22" ry="4" fill="rgba(30,35,22,.2)" />
        <rect x="190" y="208" width="4" height="28" fill="#6b4421" /><rect x="218" y="208" width="4" height="28" fill="#6b4421" />
        <rect x="182" y="186" width="48" height="30" rx="3" fill="#8a5a2b" stroke="#6b4421" strokeWidth="2" />
        <rect x="188" y="191" width="12" height="14" fill="#faf8f2" /><rect x="203" y="193" width="10" height="12" fill="#f3e5c0" /><rect x="216" y="190" width="9" height="11" fill="#faf8f2" />
      </svg>

      <img src={sprite('paiol')} alt="" className="pointer-events-none absolute" style={{ left: 6, top: 96, width: 170 }} />
      <img src={sprite('caixa-banana')} alt="" className="pointer-events-none absolute" style={{ left: 262, top: 144, width: 40 }} />
      <img src={sprite('caixa-mandioca')} alt="" className="pointer-events-none absolute" style={{ left: 302, top: 148, width: 36 }} />
      {feira.state === 'enviada' && <img className="map-idle pointer-events-none absolute" src={sprite('cliente')} alt="" style={{ left: 336, top: 168, width: 40 }} />}
      <div className="pointer-events-none absolute" style={{ left: layout.terreno.x + layout.terreno.w - 58, top: layout.terreno.y - 46, width: 52 }}>
        <TreeStageArt stage={treeStage(data.ritualWeeks.length)} width={52} />
      </div>

      <Crew layout={layout} statuses={statuses} pens={layout.pens} penStats={penStats} industriaBusy={processable.length > 0} />
      {anyReady && (
        <>
          <div className="map-wk map-walkA" aria-hidden="true" style={{ left: 176, top: 296, width: 36 }}><div className="map-flipA"><img className="map-step" src={sprite('agricultora')} alt="" /></div></div>
          <span className="map-gain" aria-hidden="true" style={{ left: 84, top: 214 }}>{t('map.gain')}</span>
        </>
      )}
      {feira.state === 'desatualizada' || feira.state === 'none'
        ? <div className="map-wk map-walkB" aria-hidden="true" style={{ left: 212, top: 228, width: 48 }}><div className="map-flipB"><img className="map-step" src={sprite('carregador')} alt="" /></div></div>
        : <div className="map-wk" aria-hidden="true" style={{ left: 286, top: 226, width: 48 }}><img className="map-idle" src={sprite('carregador')} alt="" /></div>}

      {/* Pins */}
      <span className="map-pin" style={{ left: 92, top: 108 }}>
        <span className="map-dot" style={{ background: paiolPin.dot }} /><span className="font-medium">{t('map.paiol')}</span><span style={paiolPin.style}>{paiolPin.text}</span>
      </span>
      <span className="map-pin" style={{ left: 306, top: 112 }}>
        <span className={`map-dot ${feiraPin.ask ? 'map-ask' : ''}`} style={feiraPin.dot ? { background: feiraPin.dot } : undefined} />
        <span className="font-medium">{t('map.feira')}</span><span style={{ color: feiraPin.color }}>{feiraPin.text}</span>
      </span>
      <span className="map-pin" style={{ left: 206, top: 182 }}><span className="font-medium">{t('map.ritual')}</span><span className="kb-mono">{rit.done}/6</span></span>
      {layout.plots.map(tile => {
        const st = statuses.get(tile.zone.id)!;
        const tone = PLOT_TONE[st.state];
        return (
          <span key={tile.zone.id} className="map-pin" style={{ left: tile.x + tile.w / 2, top: tile.y + 8 }}>
            <span className={`map-dot ${st.state === 'pronto' ? 'map-ask' : ''}`}
              style={st.state === 'vazio' ? { border: '2px dashed #857c66', boxSizing: 'border-box' } : st.state === 'pronto' ? undefined : { background: DOT_ON_MAP[tone] }} />
            {t(`map.state.${st.state}`)}
          </span>
        );
      })}
      {layout.pens.map(tile => {
        const s = penStats.get(tile.group.id)!;
        const first = tile.group.name.split(' ')[0];
        const label = s.closed ? t('map.pin.penClosed', { name: first })
          : s.pending ? t(s.dailyCrop?.defaultUnit === 'liter' ? 'map.pin.penMilk' : 'map.pin.penCollect', { name: first })
          : t('map.pin.penHeads', { name: first, count: tile.group.headcount });
        return (
          <span key={tile.group.id} className="map-pin" style={{ left: tile.x + tile.w / 2, top: tile.y + 8 }}>
            <span className={`map-dot ${s.pending ? 'map-ask' : ''}`} style={s.closed ? { border: '2px dashed #857c66', boxSizing: 'border-box' } : s.pending ? undefined : { background: '#2d5a28' }} />
            {label}
          </span>
        );
      })}
      <span className="map-pin" style={{ left: layout.industria.x + layout.industria.w / 2, top: layout.industria.y + 8 }}>
        <span className={`map-dot ${processable.length ? 'map-ask' : ''}`} style={processable.length ? undefined : { background: '#857c66' }} />
        {processable.length ? t('map.pin.industriaBusy') : t('map.industria')}
      </span>
      <span className="pointer-events-none absolute z-[3] flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-[15px] font-medium"
        style={{ left: MAP_W / 2, top: layout.terreno.y + 36, transform: 'translate(-50%,-50%)', background: 'rgba(250,248,242,.92)', color: '#1e2316' }}>
        <Icon name="plus" size={18} strokeWidth={2} />{t('map.terreno')}
      </span>

      {/* Hit areas */}
      <button type="button" className={hitClass({ kind: 'paiol' })} style={hitStyle({ x: 6, y: 100, w: 170, h: 136 }, { kind: 'paiol' })} onClick={() => pick({ kind: 'paiol' })}
        aria-label={t('map.aria.paiol', { text: paiolPin.text })} aria-expanded={isSel({ kind: 'paiol' })} />
      <button type="button" className={hitClass({ kind: 'feira' })} style={hitStyle({ x: 240, y: 110, w: 136, h: 122 }, { kind: 'feira' })} onClick={() => pick({ kind: 'feira' })}
        aria-label={t('map.aria.feira', { text: feiraPin.text })} aria-expanded={isSel({ kind: 'feira' })} />
      <button type="button" className={hitClass({ kind: 'mural' })} style={hitStyle({ x: 178, y: 176, w: 56, h: 64 }, { kind: 'mural' })} onClick={() => pick({ kind: 'mural' })}
        aria-label={t('map.aria.mural', { done: rit.done })} aria-expanded={isSel({ kind: 'mural' })} />
      {layout.plots.map(tile => {
        const s = { kind: 'plot' as const, id: tile.zone.id };
        return <button key={tile.zone.id} type="button" className={hitClass(s)} style={hitStyle(tile, s)} onClick={() => pick(s)}
          aria-label={t('map.aria.plot', { name: tile.zone.name, state: t(`map.state.${statuses.get(tile.zone.id)!.state}`) })} aria-expanded={isSel(s)} />;
      })}
      {layout.pens.map(tile => {
        const s = { kind: 'pen' as const, id: tile.group.id };
        return <button key={tile.group.id} type="button" className={hitClass(s)} style={hitStyle(tile, s)} onClick={() => pick(s)}
          aria-label={t('map.aria.pen', { name: tile.group.name })} aria-expanded={isSel(s)} />;
      })}
      <button type="button" className={hitClass({ kind: 'industria' })} style={hitStyle(layout.industria, { kind: 'industria' })} onClick={() => pick({ kind: 'industria' })}
        aria-label={t('map.aria.industria')} aria-expanded={isSel({ kind: 'industria' })} />
      <button type="button" className={hitClass({ kind: 'novo' })} style={hitStyle(layout.terreno, { kind: 'novo' })} onClick={() => pick({ kind: 'novo' })}
        aria-label={t('map.aria.novo')} aria-expanded={isSel({ kind: 'novo' })} />
    </div>
  );

  const ctx = { data, now, crops, zonesById, close, statuses, summary, groups, feira, rit, processable, penStats };
  return (
    <div className="min-h-dvh" style={{ background: '#8fbf5a' }}>
      {/* The floating HUD covers the top of the scene; start the scene below it so the top pins stay readable */}
      <div aria-hidden="true" style={{ height: 'calc(36px + var(--safe-area-top))' }} />
      <div ref={wrap} className="relative mx-auto w-full max-w-[480px] overflow-hidden" style={{ height: layout.height * scale }}>
        {stage}
      </div>

      <Hud farmName={data.settings.farmName} now={now} unread={unread} boxes={summary.boxes} value={summary.value} plots={plots.length} heads={heads} />

      {!sel && <span className="map-hint" style={{ bottom: 'calc(102px + var(--safe-area-bottom))' }}>{t('map.hint')}</span>}

      {sel?.kind === 'plot' && zonesById.get(sel.id) && <PlotSheet zone={zonesById.get(sel.id)!} index={plots.findIndex(z => z.id === sel.id)} {...ctx} />}
      {sel?.kind === 'pen' && <PenSheet group={data.animalGroups.find(g => g.id === sel.id)!} {...ctx} />}
      {sel?.kind === 'paiol' && <PaiolSheet {...ctx} />}
      {sel?.kind === 'feira' && <FeiraSheet {...ctx} />}
      {sel?.kind === 'mural' && <MuralSheet {...ctx} />}
      {sel?.kind === 'novo' && <NovoSheet {...ctx} />}
      {sel?.kind === 'industria' && <IndustriaSheet {...ctx} />}

      <GameToast bottom={104} />
      <BottomNav active="sitio" onSend={send} />
    </div>
  );
}

// ============================================================================
// HUD
// ============================================================================

function Hud({ farmName, now, unread, boxes, value, plots, heads }: { farmName: string; now: Date; unread: number; boxes: number; value: number; plots: number; heads: number }) {
  const { t } = useTranslation();
  return (
    <header className="fixed left-1/2 z-20 flex w-[calc(100%-16px)] max-w-[464px] -translate-x-1/2 flex-col gap-2 rounded-[18px] py-2.5 pl-3 pr-2.5"
      style={{ top: 'calc(8px + var(--safe-area-top))', background: 'var(--hud)', boxShadow: '0 3px 0 rgba(30,35,22,.15)' }}>
      <div className="flex items-center gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="m-0 truncate text-[17px] font-medium leading-[22px]">{farmName || t('map.unnamed')}</h1>
          <span className="text-[13px] leading-[18px] text-ink-muted">{t('map.week', { week: isoWeek(now).week })}</span>
        </div>
        <Link to="/avisos" aria-label={t('map.aria.notices', { count: unread })} className="kb-icon-btn relative !bg-surface">
          <Icon name="bell" size={22} />
          {unread > 0 && (
            <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-[5px] text-xs font-medium leading-4"
              style={{ background: 'var(--urucum)', color: 'var(--on-urucum)', borderColor: 'var(--surface-raised)' }}>{unread}</span>
          )}
        </Link>
        <Link to="/ajustes" aria-label={t('map.aria.settings')} className="kb-icon-btn !bg-surface"><Icon name="gear" size={22} /></Link>
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        <span className="map-res"><Icon name="box" size={16} strokeWidth={2} style={{ color: 'var(--canopy)' }} /><b>{boxes}</b><span className="sr-only">{t('map.res.boxes')}</span></span>
        <span className="map-res"><b>{fmtMoney(value, true)}</b><span className="sr-only">{t('map.res.value')}</span></span>
        <span className="map-res"><Icon name="grid" size={16} strokeWidth={2} style={{ color: 'var(--canopy)' }} /><b>{plots}</b>{t('map.res.plots', { count: plots })}</span>
        <span className="map-res"><Icon name="paw" size={16} strokeWidth={2} style={{ color: 'var(--canopy)' }} /><b>{heads}</b>{t('map.res.heads', { count: heads })}</span>
      </div>
    </header>
  );
}

// ============================================================================
// People acting out the farm's state
// ============================================================================

const ACT: Partial<Record<PlotState, { img: 'agricultora' | 'operadora'; cls: string; w: number; wrap?: string; pop?: boolean; dust?: boolean; drops?: boolean; at: (b: Box) => [number, number] }>> = {
  pronto: { img: 'agricultora', cls: 'map-harvest', w: 36, pop: true, at: b => [b.x + b.w * 0.44, b.y + 38] },
  observar: { img: 'operadora', cls: 'map-step map-slow', w: 32, wrap: 'map-scout', at: b => [b.x + b.w * 0.1, b.y + b.h * 0.66] },
  seco: { img: 'operadora', cls: 'map-step map-slow', w: 32, drops: true, at: b => [b.x + b.w * 0.67, b.y + 30] },
  preparando: { img: 'agricultora', cls: 'map-hoe', w: 34, dust: true, at: b => [b.x + b.w * 0.4, b.y + 16] },
};

function Crew({ layout, statuses, pens, penStats, industriaBusy }: {
  layout: ReturnType<typeof layoutMap>; statuses: Map<string, PlotStatus>; pens: ReturnType<typeof layoutMap>['pens'];
  penStats: Map<string, ReturnType<typeof animalLotStats>>; industriaBusy: boolean;
}) {
  const people: { key: string; left: number; top: number; w: number; img: string; cls: string; wrap?: string; pop?: string; dust?: boolean; drops?: boolean }[] = [];
  for (const tile of layout.plots) {
    const a = ACT[statuses.get(tile.zone.id)!.state];
    if (!a) continue;
    const [left, top] = a.at(tile);
    people.push({ key: tile.zone.id, left, top, w: a.w, img: sprite(a.img), cls: a.cls, wrap: a.wrap, pop: a.pop ? '+1' : undefined, dust: a.dust, drops: a.drops });
  }
  for (const tile of pens) {
    const s = penStats.get(tile.group.id)!;
    if (!s.pending || !s.dailyCrop) continue;
    const milk = s.dailyCrop.defaultUnit === 'liter';
    people.push({
      key: tile.group.id, left: tile.x + (milk ? 136 : 28), top: tile.y + (milk ? 46 : 86), w: milk ? 34 : 32, img: sprite('agricultora'), cls: 'map-harvest',
      pop: `+1 ${fmtUnit(s.dailyCrop.defaultUnit)}`,
    });
  }
  const ind = layout.industria;
  if (industriaBusy) people.push({ key: 'industria', left: ind.x + 4, top: ind.y + 100, w: 28, img: sprite('operadora'), cls: 'map-step map-slow' });
  return (
    <>
      {people.map(p => (
        <div key={p.key} className={`map-wk ${p.wrap ?? ''}`} aria-hidden="true" style={{ left: p.left, top: p.top, width: p.w }}>
          <img className={p.cls} src={p.img} alt="" />
          {p.pop && <span className="map-pop" style={{ left: 8, top: -8 }}>{p.pop}</span>}
          {p.dust && <><span className="map-dust" style={{ left: 18, top: 48 }} /><span className="map-dust map-d2" style={{ left: 28, top: 46 }} /></>}
          {p.drops && <><span className="map-drop" style={{ left: -16, top: 24 }} /><span className="map-drop" style={{ left: -10, top: 20, animationDelay: '.35s' }} /><span className="map-drop" style={{ left: -22, top: 28, animationDelay: '.7s' }} /></>}
        </div>
      ))}
      {industriaBusy && (
        <>
          <span className="map-dust map-steam" aria-hidden="true" style={{ left: ind.x + 37, top: ind.y }} />
          <span className="map-dust map-steam map-d2" aria-hidden="true" style={{ left: ind.x + 43, top: ind.y - 4 }} />
        </>
      )}
    </>
  );
}

// ============================================================================
// Sheets
// ============================================================================

interface SheetCtx {
  data: FarmData;
  now: Date;
  crops: Map<string, import('@/domain/contracts/types').Crop>;
  zonesById: Map<string, Zone>;
  close: () => void;
  statuses: Map<string, PlotStatus>;
  summary: ReturnType<typeof stockSummary>;
  groups: ReturnType<typeof stockGroups>;
  feira: ReturnType<typeof feiraStatus>;
  rit: Ritual;
  processable: ReturnType<typeof processableStock>;
  penStats: Map<string, ReturnType<typeof animalLotStats>>;
}

function ActionGrid({ actions }: { actions: { label: string; to: string; icon: IconName; primary: boolean }[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(a => (
        <Link key={a.label} to={a.to}
          className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-sm font-medium leading-[18px] no-underline transition-transform active:translate-y-0.5 ${a.primary ? 'kb-tap-go' : 'kb-tap-alt'}`}>
          <Icon name={a.icon} />{a.label}
        </Link>
      ))}
    </div>
  );
}

/** "Colheu hoje, 12 kg" · "Colheu ontem, 9 kg de mandioca" */
function useWhen() {
  const { t } = useTranslation();
  return (iso: string, now: Date) => {
    const d = calendarDays(iso, now);
    return d === 0 ? t('map.when.today') : d === 1 ? t('map.when.yesterday') : d < 7 ? fmtWeekday(iso) : fmtDayMonth(iso);
  };
}

function PlotSheet({ zone, index, data, now, crops, close, statuses }: SheetCtx & { zone: Zone; index: number }) {
  const { t } = useTranslation();
  const when = useWhen();
  const st = statuses.get(zone.id)!;
  const tone = PLOT_TONE[st.state] as Tone;
  const status = st.state === 'pronto' ? t('map.plot.ready', { name: crops.get(st.readyCropId!)?.name })
    : st.state === 'observar' ? (st.daysSinceObservation === undefined ? t('map.plot.neverObserved') : t('map.plot.observe', { count: st.daysSinceObservation }))
    : st.state === 'pasto' ? t('map.plot.pasture', { name: crops.get(st.plantings[0]?.cropId)?.name ?? '' })
    : t(`map.plot.${st.state}`);
  const primary = { pronto: 'colher', observar: 'observar', seco: 'observar', preparando: 'plantar', vazio: 'plantar', crescendo: 'abrir', pasto: 'abrir' }[st.state];
  const mainCrop = st.plantings[0]?.cropId;
  const h = st.lastHarvest;
  const harvestText = h
    ? t(h.cropId === mainCrop ? 'map.plot.harvested' : 'map.plot.harvestedOf', { when: when(h.harvestedAt, now), qty: fmtQty(h.quantity, h.unit), name: crops.get(h.cropId)?.name.toLowerCase() })
    : '';
  const obsText = st.daysSinceObservation !== undefined ? t('map.plot.observed', { count: st.daysSinceObservation }) : '';
  const lastEnded = data.plantings.filter(p => p.zoneId === zone.id && p.endedAt).sort((a, b) => b.endedAt!.localeCompare(a.endedAt!))[0];
  const last = st.plantings.length === 0 && lastEnded
    ? t('map.plot.lastPlanting', { name: crops.get(lastEnded.cropId)?.name.toLowerCase(), month: fmtMonthYear(lastEnded.endedAt!) })
    : [harvestText, obsText].filter(Boolean).join(' · ');
  const meta = [t('map.plot.number', { n: index + 1 }), zone.size, zone.description].filter(Boolean).join(' · ');
  return (
    <BottomSheet onClose={close} labelledBy="sheet-t">
      <SheetHead id="sheet-t" title={zone.name} sub={meta} onClose={close} />
      <StatusPill tone={tone}>{status}</StatusPill>
      {st.plantings.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {st.plantings.map(p => {
            const crop = crops.get(p.cropId);
            const cv = data.cultivars.find(c => c.id === p.cultivarId);
            return (
              <div key={p.id} className="flex items-center gap-2.5 rounded-[14px] bg-surface px-3 py-2.5">
                <span className="kb-dot" style={{ background: crop ? cropDot(crop, data.categories) : '#857c66' }} />
                <span className="flex-1 font-medium">{crop?.name}{cv ? ` ${cv.name}` : ''}</span>
                <span className="text-[13px] text-ink-muted">{t(`layers.${p.layer}`)}</span>
                <span className="kb-mono min-w-16 text-right text-sm">{t(`plantUnits.${p.countUnit}`, { count: plantCount(p) })}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="m-0 rounded-[14px] border-[1.5px] border-dashed border-line-strong p-3.5 text-ink-muted">{t('map.plot.empty')}</p>
      )}
      {last && <span className="kb-sub">{last}</span>}
      <ActionGrid actions={[
        { label: t('map.act.harvest'), to: `/colher?talhao=${zone.id}`, icon: 'harvest', primary: primary === 'colher' },
        { label: t('map.act.observe'), to: `/observar?talhao=${zone.id}`, icon: 'eye', primary: primary === 'observar' },
        { label: t('map.act.plant'), to: `/talhao/${zone.id}/plantar`, icon: 'plant', primary: primary === 'plantar' },
        { label: t('map.act.open'), to: `/talhao/${zone.id}`, icon: 'open', primary: primary === 'abrir' },
      ]} />
    </BottomSheet>
  );
}

function PaiolSheet({ close, summary, groups }: SheetCtx) {
  const { t } = useTranslation();
  const urgent = groups.flatMap(g => g.lots.map(l => ({ g, l }))).filter(x => x.l.life.state !== 'fresh').sort((a, b) => a.l.life.days - b.l.life.days).slice(0, 3);
  return (
    <BottomSheet onClose={close} labelledBy="paiol-t">
      <SheetHead id="paiol-t" title={t('map.paiol')} onClose={close}
        sub={<>{t('map.paiolSub', { boxes: summary.boxes, products: summary.products, count: summary.boxes })} · <span className="kb-mono text-ink">{fmtMoney(summary.value)}</span></>} />
      <span className="font-medium">{t('map.expiringSoon')}</span>
      {urgent.length ? (
        <div className="grid grid-cols-3 gap-2">
          {urgent.map(({ g, l }) => {
            const tone = l.life.tone;
            return (
              <Link key={l.id} to={`/paiol/ajustar?lote=${l.id}`} className="flex flex-col gap-1 rounded-2xl p-3 text-ink no-underline" style={{ background: `var(--${tone === 'urucum' ? 'urucum' : 'amber'}-soft)` }}>
                <span className="truncate font-medium">{g.crop.name}</span>
                <span className="kb-mono text-[13px]">{fmtQty(l.quantityRemaining, l.unit)}</span>
                <span className="text-[13px] font-medium" style={{ color: `var(--${tone})` }}>{lifeShort(t, l.life)}</span>
              </Link>
            );
          })}
        </div>
      ) : <p className="kb-sub m-0">{t('map.allFresh')}</p>}
      <div className="grid grid-cols-2 gap-2.5">
        <Link to="/paiol/ajustar" className="kb-tap kb-tap-alt kb-tap-md">{t('map.adjust')}</Link>
        <Link to="/paiol" className="kb-tap kb-tap-go kb-tap-md">{t('map.openPaiol')}</Link>
      </div>
    </BottomSheet>
  );
}

function lifeShort(t: (k: string, o?: Record<string, unknown>) => string, life: ReturnType<typeof lotLife>) {
  if (life.state === 'today') return t('life.today');
  if (life.state === 'expired') return t('life.expired', { count: -life.days });
  return life.days === 1 ? t('map.tomorrow') : t('map.inDays', { count: life.days });
}

function FeiraSheet({ data, now, close, feira, groups }: SheetCtx) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const list = data.list;
  const stale = feira.state === 'desatualizada';
  const tone: Tone = feira.state === 'pronta' || feira.state === 'enviada' ? 'canopy' : 'amber';

  // Each product in the list or in stock, with what changed since the list
  type Row = { key: string; name: string; qty?: string; price: string; note: string; noteTone?: 'amber' | 'urucum'; dot: string; out: boolean };
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const item of [...(list?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const key = `${item.cropId}:${item.cultivarId ?? ''}`;
    seen.add(key);
    const g = groups.find(x => `${x.crop.id}:${x.cultivar?.id ?? ''}` === key);
    const crop = data.crops.find(c => c.id === item.cropId);
    const life = g?.worst;
    const included = item.isIncluded && item.quantity > 0;
    let note = life ? (life.state === 'fresh' ? t('map.feiraRow.fresh') : lifeShort(t, life)) : t('map.feiraRow.sold');
    let noteTone: Row['noteTone'] = life && life.state !== 'fresh' ? (life.tone === 'urucum' ? 'urucum' : 'amber') : undefined;
    if (!included) note = `${note} · ${t('map.feiraRow.outOfList')}`;
    else if (stale && g && g.total > item.quantity) { note = t('map.feiraRow.more', { qty: fmtQty(g.total - item.quantity, g.unit) }); noteTone = 'amber'; }
    rows.push({
      key, name: itemDisplayName(item), qty: included ? fmtQty(item.quantity, item.unit) : undefined,
      price: item.pricePerUnit ? `${fmtMoney(item.pricePerUnit)}/${fmtUnit(item.unit)}` : t('common.noPrice'),
      note, noteTone, dot: crop ? categoryDot(crop, data.categories) : '#857c66', out: !included,
    });
  }
  for (const g of groups) {
    const key = `${g.crop.id}:${g.cultivar?.id ?? ''}`;
    if (seen.has(key)) continue;
    rows.push({
      key, name: g.cultivar ? `${g.crop.name} ${g.cultivar.name}` : g.crop.name, qty: undefined,
      price: g.crop.pricePerUnit ? `${fmtMoney(g.crop.pricePerUnit)}/${fmtUnit(g.unit)}` : t('common.noPrice'),
      note: list ? t('map.feiraRow.after') : t('map.feiraRow.inStock', { qty: fmtQty(g.total, g.unit) }), noteTone: 'amber', dot: categoryDot(g.crop, data.categories), out: true,
    });
  }
  const inList = rows.filter(r => !r.out).length;
  const update = async () => {
    if (!stale && list) return;
    await generateList((list?.windowId as 'this' | 'next') ?? 'this', list);
    showToast(t('map.listUpdated'));
  };
  const sub = !list ? t('map.feiraSub.none')
    : stale ? t('map.feiraSub.stale', { when: `${fmtWeekday(list.createdAt)}, ${fmtDdMm(list.createdAt)}, ${fmtTime(list.createdAt)}`, count: feira.changes })
    : t('map.feiraSub.fresh', { when: calendarDays(list.createdAt, now) === 0 ? fmtTime(list.createdAt) : fmtDayMonth(list.createdAt) });
  const status = { none: t('map.feiraStatus.none'), desatualizada: t('map.feiraStatus.stale'), pronta: t('map.feiraStatus.ready'), enviada: t('map.feiraStatus.sent') }[feira.state];
  return (
    <BottomSheet onClose={close} labelledBy="feira-t">
      <SheetHead id="feira-t" title={t('map.feiraTitle')} sub={sub} onClose={close} />
      <StatusPill tone={tone}>{status}</StatusPill>
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{t('map.atStall')}</span>
        <span className="kb-sub">{t('map.stallCount', { inList, total: rows.length })}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {(all ? rows : rows.slice(0, 3)).map(r => (
          <li key={r.key} className="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5"
            style={r.out ? { background: 'transparent', border: '1px dashed var(--line-strong)' } : { background: 'var(--surface)' }}>
            <span className="kb-dot" style={{ background: r.dot }} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{r.name}</span>
              <span className="text-xs leading-4" style={r.noteTone ? { color: `var(--${r.noteTone})`, fontWeight: 500 } : { color: 'var(--ink-muted)' }}>{r.note}</span>
            </span>
            <span className="flex flex-col items-end">
              <span className="kb-mono text-sm font-medium">{r.qty ?? t('map.out')}</span>
              <span className="text-xs leading-4 text-ink-muted">{r.price}</span>
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 3 && (
        <button type="button" onClick={() => setAll(a => !a)} aria-expanded={all}
          className="min-h-11 rounded-xl border-[1.5px] border-dashed border-line-strong bg-transparent text-[15px] font-medium text-ink">
          {all ? t('map.showLess') : t('map.showAll', { count: rows.length })}
        </button>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className="kb-tap kb-tap-alt kb-tap-md" onClick={update} aria-disabled={!stale && !!list}>
          {stale || !list ? t('map.updateList') : t('map.listOk')}
        </button>
        <Link to="/feira" className="kb-tap kb-tap-go kb-tap-md">{t('map.editSend')}</Link>
      </div>
    </BottomSheet>
  );
}

const RITUAL_HREF = { observar: '/observar', colher: '/colher', paiol: '/paiol', feira: '/feira', mandar: '/feira', guardar: '/ajustes' };

function MuralSheet({ data, close, rit }: SheetCtx) {
  const { t } = useTranslation();
  const stage = treeStage(data.ritualWeeks.length);
  return (
    <BottomSheet onClose={close} labelledBy="ritual-t">
      <SheetHead id="ritual-t" title={t('map.ritualTitle')} sub={t('map.ritualSub', { done: rit.done })} onClose={close} />
      <ol className="m-0 grid list-none grid-cols-6 p-0">
        {rit.steps.map((s, i) => {
          const next = rit.next === s.key;
          const label = t(`ritual.${s.key}`);
          return (
            <li key={s.key} className="flex flex-col items-center gap-1.5">
              <Link to={RITUAL_HREF[s.key]} aria-label={t(s.done ? 'map.stepDone' : next ? 'map.stepNext' : 'map.stepTodo', { label })}
                className={`kb-inline flex h-9 w-9 items-center justify-center rounded-full text-sm no-underline ${next ? 'kb-ask font-medium' : ''}`}
                style={s.done ? { background: 'var(--canopy)', color: 'var(--on-canopy)' }
                  : next ? { background: 'var(--amber-soft)', border: '2px solid var(--amber-bright)', color: 'var(--amber)' }
                  : { border: '2px dashed var(--line-strong)', color: 'var(--ink-muted)' }}>
                {s.done ? <Icon name="check" size={18} strokeWidth={2.2} /> : i + 1}
              </Link>
              <span className={`text-xs leading-4 ${s.done ? '' : next ? 'font-medium' : 'text-ink-muted'}`}>{label}</span>
            </li>
          );
        })}
      </ol>
      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={rit.done} aria-label={t('map.ritualTitle')}>
        <div className="h-full rounded-full bg-canopy transition-[width] duration-500" style={{ width: `${(rit.done / 6) * 100}%` }} />
      </div>
      <p className="kb-sub m-0">{t('map.ritualTree')}</p>
      <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface px-3 py-2">
        <span className="text-sm">{t('map.treeNow', { stage: t(`rules.tree.${stage}`), count: data.ritualWeeks.length })}</span>
        <Link to="/regras" className="text-sm font-medium">{t('map.rulesLink')}</Link>
      </div>
    </BottomSheet>
  );
}

function NovoSheet({ close }: SheetCtx) {
  const { t } = useTranslation();
  return (
    <BottomSheet onClose={close} labelledBy="novo-t">
      <SheetHead id="novo-t" title={t('map.novoTitle')} sub={t('map.novoSub')} onClose={close} />
      <p className="m-0">{t('map.novoText')}</p>
      <Link to="/talhao/novo" className="kb-tap kb-tap-go kb-tap-md">{t('map.novoGo')}</Link>
    </BottomSheet>
  );
}

function PenSheet({ group, data, now, close, penStats, zonesById, crops }: SheetCtx & { group: AnimalGroup }) {
  const { t } = useTranslation();
  const s = penStats.get(group.id) ?? animalLotStats(group, data, now);
  const zone = group.zoneId ? zonesById.get(group.zoneId)?.name : undefined;
  const milk = s.dailyCrop?.defaultUnit === 'liter';
  const daily = !!s.dailyCrop;
  const tone: Tone = s.closed ? 'muted' : s.pending ? 'amber' : 'canopy';
  const status = s.closed ? t('map.pen.closed')
    : s.pending ? t(milk ? 'map.pen.milkPending' : 'map.pen.collectPending')
    : daily && s.today > 0 ? t(milk ? 'map.pen.milkDone' : 'map.pen.collectDone')
    : t('map.pen.active', { since: fmtMonthYear(group.startedAt) });
  const canProcess = data.crops.some(c => c.species === group.species && derivedOf(c.id, data.crops).length > 0);
  const lastAdj = s.lastAdjustment;
  const adjText = lastAdj ? t('map.pen.lastAdj', { delta: `${lastAdj.delta > 0 ? '+' : '−'}${Math.abs(lastAdj.delta)}`, reason: t(`animalReasons.${lastAdj.reason}`), date: fmtDayMonth(lastAdj.adjustedAt) }) : '';
  const slaughterHarvest = lastAdj?.reason === 'slaughter' ? data.harvests.find(h => h.id === lastAdj.harvestEventId) : undefined;
  const last = daily
    ? [s.yesterday ? t('map.pen.yesterday', { qty: fmtQty(s.yesterday, s.dailyCrop!.defaultUnit) }) : '', adjText].filter(Boolean).join(' · ')
    : slaughterHarvest
      ? t('map.pen.lastSlaughter', { delta: Math.abs(lastAdj!.delta), date: fmtDayMonth(lastAdj!.adjustedAt), qty: fmtQty(slaughterHarvest.quantity, slaughterHarvest.unit), name: crops.get(slaughterHarvest.cropId)?.name })
      : adjText;
  const u = s.dailyCrop?.defaultUnit;
  const stats = daily
    ? [[fmtQty(s.today, u!), t('map.pen.today', { name: s.dailyCrop!.name })], [fmtQty(s.week, u!), t('map.pen.week', { name: s.dailyCrop!.name })]]
    : [[String(group.headcount), t('map.pen.heads')], [s.slaughterQty ? fmtQty(s.slaughterQty, 'kg') : '0', t('map.pen.slaughters', { count: s.slaughters, year: now.getFullYear() })]];
  const third = canProcess
    ? { label: t('map.act.process'), to: '/processar', icon: 'process' as const, key: 'process' }
    : { label: t('map.act.slaughter'), to: `/animais/${group.id}/ajustar?motivo=slaughter`, icon: 'slaughter' as const, key: 'slaughter' };
  const actions = daily
    ? [
      { label: t(milk ? 'map.act.milk' : 'map.act.collect'), to: `/colher?lote=${group.id}`, icon: (milk ? 'milk' : 'egg') as IconName, primary: !s.closed },
      { label: t('map.act.heads'), to: `/animais/${group.id}/ajustar`, icon: 'heads' as IconName, primary: s.closed },
      { ...third, primary: false },
      { label: t('map.act.open'), to: `/animais/${group.id}`, icon: 'open' as IconName, primary: false },
    ]
    : [
      { label: t('map.act.slaughter'), to: `/animais/${group.id}/ajustar?motivo=slaughter`, icon: 'slaughter' as IconName, primary: !s.closed },
      { label: t('map.act.heads'), to: `/animais/${group.id}/ajustar`, icon: 'heads' as IconName, primary: s.closed },
      { label: t('map.act.process'), to: '/processar', icon: 'process' as IconName, primary: false },
      { label: t('map.act.open'), to: `/animais/${group.id}`, icon: 'open' as IconName, primary: false },
    ];
  return (
    <BottomSheet onClose={close} labelledBy="ani-t">
      <SheetHead id="ani-t" title={group.name} onClose={close}
        sub={[t(`species.${group.species}`), t('common.heads', { count: group.headcount }), zone].filter(Boolean).join(' · ')} />
      <StatusPill tone={tone}>{status}</StatusPill>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(([v, l]) => (
          <div key={l} className="flex flex-col rounded-[14px] bg-surface px-3 py-2.5">
            <span className="kb-mono text-[22px] font-medium leading-7">{v}</span><span className="kb-sub">{l}</span>
          </div>
        ))}
      </div>
      {last && <span className="kb-sub">{last}</span>}
      <ActionGrid actions={actions} />
    </BottomSheet>
  );
}

function IndustriaSheet({ close, processable }: SheetCtx) {
  const { t } = useTranslation();
  const p = processable[0];
  return (
    <BottomSheet onClose={close} labelledBy="qj-t">
      <SheetHead id="qj-t" title={t('map.industria')} sub={t('map.industriaSub')} onClose={close} />
      <StatusPill tone={p ? 'amber' : 'muted'}>
        {p ? t('map.industriaMsg', { qty: fmtQty(p.total, p.unit), name: p.crop.name.toLowerCase(), count: Math.max(0, p.oldestDays) }) : t('map.industriaIdle')}
      </StatusPill>
      <p className="kb-sub m-0">{t('map.fifo')}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <Link to="/paiol" className="kb-tap kb-tap-alt kb-tap-md">{t('map.seeStock')}</Link>
        <Link to={p ? `/processar?entrada=${p.crop.id}` : '/processar'} className="kb-tap kb-tap-go kb-tap-md">{t('map.act.process')}</Link>
      </div>
    </BottomSheet>
  );
}

