/** Talhão: a close look at one plot, its layers, harvests and signs of the forest */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { activePlantings, daysToHarvest, indexById, lastObservation, plantCount, plotZones, weeklyHarvests, type FarmData } from '@/domain/rules/farm';
import type { Planting, Zone } from '@/domain/contracts/types';
import { deleteZone, updateZone } from '@/data/actions';
import { BottomNav, BottomSheet, ScreenHeader } from '@/components/game/Shell';
import { Icon } from '@/components/game/Icon';
import { Loading } from '@/components/game/bits';
import { cropDot } from '@/components/game/crop';
import { observationChips } from '@/components/game/observation';
import { showToast } from '@/components/game/toast';
import { SceneDefs, plantSprite } from '@/components/map/SceneDefs';
import { fmtDayMonth, fmtMonthYear, fmtNum, fmtUnit } from '@/lib/format';
import '@/components/map/map.css';

const LAYER_ORDER = ['emergente', 'alto', 'medio', 'baixo', 'rasteiro', 'pasto'];
const W = 358, H = 310;

export default function PlotPage() {
  const { id } = useParams();
  const data = useFarm();
  const now = useNow();
  if (!data) return <Loading />;
  const zone = data.zones.find(z => z.id === id);
  if (!zone) return <Gone />;
  return <Plot key={zone.id} data={data} zone={zone} now={now} />;
}

function Gone() {
  const { t } = useTranslation();
  return <main className="kb-screen kb-screen-flow"><ScreenHeader title={t('plot.missing')} back={{ to: '/', label: t('plot.back') }} /></main>;
}

/** Position of each grid cell inside the plot view; middle and ground rows sit between the tall ones */
function cellPos(cell: number, rows: number, offsetRow: boolean) {
  const r = Math.floor(cell / 6), c = cell % 6;
  const y = rows === 1 ? H / 2 : 64 + (r * (H - 112)) / (rows - 1);
  const x = offsetRow ? 60 + c * 52 : 39 + c * 56;
  return { x, y };
}

function Plot({ data, zone, now }: { data: FarmData; zone: Zone; now: Date }) {
  const { t } = useTranslation();
  const [sel, setSel] = useState<number | null>(null);
  const [layer, setLayer] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const crops = indexById(data.crops);
  const rows = zone.gridRows ?? 3;
  const plantings = activePlantings(zone.id, data.plantings).sort((a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer));
  const byCell = new Map<number, Planting>();
  for (const p of plantings) for (const c of p.cells) byCell.set(c, p);
  const rowOffset = (r: number) => {
    const p = [0, 1, 2, 3, 4, 5].map(c => byCell.get(r * 6 + c)).find(Boolean);
    return !!p && (p.layer === 'medio' || p.layer === 'rasteiro');
  };
  const free = Array.from({ length: rows * 6 }, (_, i) => i).filter(i => !byCell.has(i));
  const index = plotZones(data).findIndex(z => z.id === zone.id);
  const meta = [index >= 0 ? t('map.plot.number', { n: index + 1 }) : t(`zoneTypes.${zone.type ?? 'canteiro'}`), zone.size, zone.description].filter(Boolean).join(' · ');

  const selP = sel !== null ? byCell.get(sel) : undefined;
  const selCrop = selP ? crops.get(selP.cropId) : undefined;
  const left = selP ? daysToHarvest(selP, selCrop, now) : undefined;
  const card = sel === null ? null : selP && selCrop ? {
    title: `${selCrop.name}${selP.cultivarId ? ` ${data.cultivars.find(c => c.id === selP.cultivarId)?.name ?? ''}` : ''} · ${t(`layers.${selP.layer}`)}`,
    meta: [t('plot.planted', { date: fmtMonthYear(selP.plantedAt) }), left === undefined ? (selCrop.isForage ? t('plot.forage') : '') : left > 0 ? t('plot.harvestIn', { count: left }) : t('plot.ready')].filter(Boolean).join(' · '),
    cta: selCrop.isForage ? t('plot.seeCard') : t('map.act.harvest'),
    to: selCrop.isForage ? `/produtos/${selCrop.id}` : `/colher?talhao=${zone.id}&produto=${selCrop.id}`,
    dot: cropDot(selCrop, data.categories),
  } : { title: t('plot.freeSlot'), meta: t('plot.freeSlotHint'), cta: t('map.act.plant'), to: `/talhao/${zone.id}/plantar`, dot: 'var(--line-strong)' };

  const harvestCrop = (() => {
    const totals = new Map<string, number>();
    for (const h of data.harvests) if (h.zoneId === zone.id) totals.set(h.cropId, (totals.get(h.cropId) ?? 0) + h.quantity);
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  })();
  const weeks = harvestCrop ? weeklyHarvests(zone.id, harvestCrop, data.harvests, now) : [];
  const maxW = Math.max(1, ...weeks.map(w => w.total));
  const hCrop = harvestCrop ? crops.get(harvestCrop) : undefined;
  const unit = data.harvests.find(h => h.zoneId === zone.id && h.cropId === harvestCrop)?.unit ?? hCrop?.defaultUnit ?? 'kg';
  const obs = lastObservation(zone.id, data.observations);
  const guild = [...new Set(plantings.flatMap(p => crops.get(p.cropId)?.guildTags ?? []))].map(g => g.toLowerCase());

  return (
    <>
      <main className="kb-screen kb-screen-nav">
        <ScreenHeader title={zone.name} sub={meta} size="md" back={{ to: '/', label: t('plot.back') }}
          right={<button type="button" className="kb-icon-btn" aria-label={t('plot.edit')} onClick={() => setEditing(true)}><Icon name="edit" size={20} /></button>} />

        <section aria-label={t('plot.view')} className="relative overflow-hidden rounded-[22px]" style={{ background: zone.type === 'pasto' ? '#a8d06e' : plantings.length ? '#7fae52' : '#b07a43', aspectRatio: `${W} / ${H}` }}>
          <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
            <SceneDefs />
            <rect x="6" y="6" width={W - 12} height={H - 12} rx="10" fill="none" stroke="#e6d3a8" strokeWidth="5" />
            <rect x="6" y="6" width={W - 12} height={H - 12} rx="10" fill="none" stroke="#a88a58" strokeWidth="9" strokeDasharray="4 22" />
            <g fill="#6f9f45"><circle cx="30" cy="160" r="2" /><circle cx="140" cy="100" r="2" /><circle cx="250" cy="280" r="2" /><circle cx="320" cy="160" r="2" /></g>
            {Array.from({ length: rows * 6 }, (_, i) => {
              const p = byCell.get(i);
              const { x, y } = cellPos(i, rows, rowOffset(Math.floor(i / 6)));
              if (!p) return <circle key={i} cx={x} cy={y} r="13" fill="none" stroke="#f3eedf" strokeWidth="2" strokeDasharray="4 4" />;
              const sp = plantSprite(crops.get(p.cropId)?.name ?? '', p.layer);
              const sc = sp === 'ban' ? 1.7 : sp === 'arv' ? 1.1 : 1.6;
              return <g key={i} transform={`translate(${x} ${y}) scale(${sc})`}><use href={`#${sp}`} className={p.layer === 'alto' ? 'map-sway' : undefined} /></g>;
            })}
          </svg>
          {Array.from({ length: rows * 6 }, (_, i) => {
            const p = byCell.get(i);
            const { x, y } = cellPos(i, rows, rowOffset(Math.floor(i / 6)));
            const on = sel === i;
            const lit = layer !== null && (p ? p.id === layer : layer === 'free');
            return (
              <button key={i} type="button" aria-pressed={on} aria-label={t('plot.slot', { name: p ? crops.get(p.cropId)?.name : t('plot.freeSlot'), n: i + 1 })}
                onClick={() => setSel(on ? null : i)}
                className="kb-hit absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent transition-shadow hover:shadow-[0_0_0_2px_rgba(255,255,255,.8)]"
                style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, boxShadow: on ? '0 0 0 3px #faf8f2, 0 0 0 6px var(--canopy)' : lit ? '0 0 0 3px rgba(250,248,242,.95)' : undefined }} />
            );
          })}
        </section>

        {card && (
          <div className="kb-rise flex items-center gap-3 rounded-[18px] border-[1.5px] border-canopy bg-surface-raised px-3.5 py-3" role="status">
            <span className="h-3 w-3 flex-none rounded-full" style={{ background: card.dot }} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{card.title}</span>
              <span className="text-[13px] leading-[18px] text-ink-muted">{card.meta}</span>
            </div>
            <Link to={card.to} className="kb-head-btn kb-head-btn-go flex-none">{card.cta}</Link>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Link to={`/colher?talhao=${zone.id}`} className="kb-tap kb-tap-go min-h-[72px] flex-col !gap-1 !text-sm"><Icon name="harvest" />{t('map.act.harvest')}</Link>
          <Link to={`/observar?talhao=${zone.id}`} className="kb-tap kb-tap-alt min-h-[72px] flex-col !gap-1 !text-sm"><Icon name="eye" />{t('map.act.observe')}</Link>
          <Link to={`/talhao/${zone.id}/plantar`} className="kb-tap kb-tap-alt min-h-[72px] flex-col !gap-1 !text-sm"><Icon name="plant" />{t('map.act.plant')}</Link>
        </div>

        <section aria-labelledby="cam-t" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between"><h2 id="cam-t" className="kb-h2">{t('plot.layers')}</h2><span className="kb-sub">{t('plot.layersHint')}</span></div>
          {plantings.map(p => {
            const c = crops.get(p.cropId);
            const on = layer === p.id;
            return (
              <button key={p.id} type="button" aria-pressed={on} onClick={() => { setLayer(on ? null : p.id); setSel(null); }}
                className={`flex min-h-[52px] w-full items-center gap-2.5 rounded-[14px] border-[1.5px] px-3 text-left text-[15px] text-ink ${on ? 'border-canopy bg-canopy-soft' : 'border-line bg-surface-raised'}`}>
                <span className="h-3 w-3 flex-none rounded-full" style={{ background: c ? cropDot(c, data.categories) : '#857c66' }} />
                <span className="w-[76px] text-[13px] text-ink-muted">{t(`layers.${p.layer}`)}</span>
                <span className="flex-1 font-medium">{c?.name}</span>
                <span className="kb-mono text-sm">{t(`plantUnits.${p.countUnit}`, { count: plantCount(p) })}</span>
              </button>
            );
          })}
          {free.length > 0 && (
            <button type="button" aria-pressed={layer === 'free'} onClick={() => { setLayer(layer === 'free' ? null : 'free'); setSel(null); }}
              className={`flex min-h-[52px] w-full items-center gap-2.5 rounded-[14px] border-[1.5px] px-3 text-left text-[15px] text-ink ${layer === 'free' ? 'border-canopy bg-canopy-soft' : 'border-line bg-surface-raised'}`}>
              <span className="h-3 w-3 flex-none rounded-full" style={{ background: '#857c66' }} />
              <span className="w-[76px] text-[13px] text-ink-muted">{t('plot.free')}</span>
              <span className="flex-1 font-medium">{t('plot.slots')}</span>
              <span className="kb-mono text-sm">{t('plot.slotCount', { count: free.length })}</span>
            </button>
          )}
        </section>

        <section aria-labelledby="hist-t" className="kb-card flex flex-col gap-2.5 p-4">
          <div className="flex items-baseline justify-between">
            <h2 id="hist-t" className="kb-h2">{t('plot.harvests')}</h2>
            {hCrop && <span className="kb-mono text-sm">{fmtNum(weeks.reduce((s, w) => s + w.total, 0))} {fmtUnit(unit, 2)} · {t('plot.weeks', { count: weeks.length })}</span>}
          </div>
          {hCrop ? (
            <>
              <div role="img" aria-label={t('plot.chartLabel', { name: hCrop.name, values: weeks.map(w => fmtNum(w.total)).join(', ') })} className="grid h-[120px] grid-cols-6 items-end gap-2.5">
                {weeks.map((w, i) => {
                  const last = i === weeks.length - 1;
                  return (
                    <div key={w.week} className="flex h-full flex-col items-center justify-end gap-1">
                      <span className={`kb-mono text-xs ${last ? 'font-medium' : ''}`}>{fmtNum(w.total)}</span>
                      {w.total > 0
                        ? <div className="w-full rounded-[6px_6px_2px_2px] transition-[height] duration-500" style={{ height: Math.max(4, (w.total / maxW) * 84), background: last ? 'var(--canopy)' : 'var(--canopy-soft-edge)' }} />
                        : <div className="h-0.5 w-full bg-line" />}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-6 gap-2.5 text-center text-xs text-ink-muted">
                {weeks.map((w, i) => <span key={w.week} className={i === weeks.length - 1 ? 'font-medium text-ink' : ''}>s{w.week}</span>)}
              </div>
            </>
          ) : <p className="kb-sub m-0">{t('plot.noHarvests')}</p>}
        </section>

        <section aria-labelledby="sin-t" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between"><h2 id="sin-t" className="kb-h2">{t('plot.signals')}</h2><Link to={`/observar?talhao=${zone.id}`} className="kb-inline text-[15px]">{t('plot.observeNow')}</Link></div>
          {obs ? (
            <div className="flex flex-wrap gap-1.5">
              {observationChips(obs, t).map(c => (
                <span key={c.label} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface-raised px-3 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.label} · {fmtDayMonth(obs.observedAt)}
                </span>
              ))}
            </div>
          ) : <p className="kb-sub m-0">{t('plot.noSignals')}</p>}
          {obs?.notes && <span className="kb-sub">“{obs.notes}”</span>}
          {guild.length > 0 && <span className="kb-sub">{t('plot.guild', { list: guild.join(', ') })}</span>}
        </section>
      </main>
      <BottomNav active="sitio" />
      {editing && <EditPlot zone={zone} onClose={() => setEditing(false)} />}
    </>
  );
}

function EditPlot({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState(zone.name);
  const [size, setSize] = useState(zone.size ?? '');
  const [desc, setDesc] = useState(zone.description ?? '');
  const [confirm, setConfirm] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    await updateZone(zone.id, { name: name.trim(), size: size.trim() || undefined, description: desc.trim() || undefined });
    showToast(t('plot.saved'));
    onClose();
  };
  const remove = async () => {
    await deleteZone(zone.id);
    showToast(t('plot.deleted', { name: zone.name }));
    navigate('/');
  };
  return (
    <BottomSheet variant="modal" labelledBy="edit-t" onClose={onClose}>
      <h2 id="edit-t" className="kb-h2">{t('plot.edit')}</h2>
      <label className="flex flex-col gap-1.5"><span className="kb-label">{t('newPlot.name')}</span><input className="kb-field" value={name} onChange={e => setName(e.target.value)} data-autofocus /></label>
      <label className="flex flex-col gap-1.5"><span className="kb-label">{t('plot.size')}</span><input className="kb-field" value={size} onChange={e => setSize(e.target.value)} placeholder="24 × 6 m" /></label>
      <label className="flex flex-col gap-1.5"><span className="kb-label">{t('plot.description')}</span><input className="kb-field" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('plot.descriptionPlaceholder')} /></label>
      {confirm ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-urucum-soft p-3.5">
          <span className="font-medium text-urucum">{t('plot.deleteTitle', { name: zone.name })}</span>
          <span className="text-sm">{t('plot.deleteText')}</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="kb-tap kb-tap-alt kb-tap-md" onClick={() => setConfirm(false)}>{t('common.cancel')}</button>
            <button type="button" className="kb-tap kb-tap-md" style={{ background: 'var(--urucum)', color: 'var(--on-urucum)' }} onClick={remove}>{t('common.delete')}</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" className="kb-tap kb-tap-danger kb-tap-md" onClick={() => setConfirm(true)}>{t('plot.delete')}</button>
          <button type="button" className="kb-tap kb-tap-go kb-tap-md" onClick={save}>{t('common.save')}</button>
        </div>
      )}
    </BottomSheet>
  );
}
