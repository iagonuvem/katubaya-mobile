/**
 * Plantar: pick a card from your collection and tap the holes of the plot. The Pasto tab forms
 * a pasture with a forage, for the whole plot or part of it.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm } from '@/hooks/useFarm';
import { activePlantings, indexById, type FarmData } from '@/domain/rules/farm';
import type { Crop, Zone } from '@/domain/contracts/types';
import { plant } from '@/data/actions';
import { ScreenHeader } from '@/components/game/Shell';
import { Loading, WhenRow } from '@/components/game/bits';
import { ART_INK, cropArt, cropDot } from '@/components/game/crop';
import { showToast } from '@/components/game/toast';

export default function PlantPage() {
  const { id } = useParams();
  const data = useFarm();
  if (!data) return <Loading />;
  const zone = data.zones.find(z => z.id === id);
  if (!zone) return <Loading />;
  return <Plant key={zone.id} data={data} zone={zone} />;
}

const GRASS = <svg aria-hidden="true" width="34" height="30" viewBox="0 0 34 30"><path d="M5 28l2-12M10 28l-1-16M15 28l3-18M20 28l-2-14M25 28l3-15M29 28l-1-10" stroke="#3f7d2c" strokeWidth="2.4" strokeLinecap="round" fill="none" /></svg>;

function Plant({ data, zone }: { data: FarmData; zone: Zone }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const crops = indexById(data.crops);
  const rows = zone.gridRows ?? 3;
  const total = rows * 6;
  const forage = (c: Crop) => !!c.isForage;
  const [tab, setTab] = useState<'roca' | 'pasto'>(zone.type === 'pasto' ? 'pasto' : 'roca');
  const roca = data.crops.filter(c => !c.species && !forage(c)).sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  const pasto = data.crops.filter(forage);
  const hand = tab === 'pasto' ? pasto : roca;
  const [card, setCard] = useState<string | undefined>(hand[0]?.id);
  const [grid, setGrid] = useState<Record<number, string>>({});
  const [lot, setLot] = useState<string>('none');
  const [when, setWhen] = useState(new Date());
  const [done, setDone] = useState(false);

  const existing = new Map<number, string>();
  for (const p of activePlantings(zone.id, data.plantings)) for (const c of p.cells) existing.set(c, p.cropId);
  const shown = (i: number) => grid[i] ?? (done ? undefined : existing.get(i));
  const grazers = data.animalGroups.filter(g => g.headcount > 0 && ['cattle', 'goat', 'sheep', 'other'].includes(g.species));

  const counts = new Map<string, number>();
  Object.values(grid).forEach(c => counts.set(c, (counts.get(c) ?? 0) + 1));
  const n = Object.keys(grid).length;
  const allPasto = n === total && Object.values(grid).every(c => crops.get(c)?.isForage);
  const lotName = grazers.find(g => g.id === lot)?.name;
  const parts = [...counts.entries()].map(([c, k]) => `${crops.get(c)?.name} × ${k}`);
  const summary = !n ? t('plant.noneChosen') : allPasto ? t('plant.pastureSummary', { name: crops.get(Object.values(grid)[0])?.name }) + (lotName ? ` · ${t('plant.forLot', { name: lotName })}` : '') : parts.join(' · ');

  const tap = (i: number) => {
    if (done || !card) return;
    setGrid(g => {
      const next = { ...g };
      if (next[i] === card) delete next[i]; else next[i] = card;
      return next;
    });
  };
  const switchTab = (v: 'roca' | 'pasto') => {
    setTab(v);
    setCard((v === 'pasto' ? pasto : roca)[0]?.id);
  };
  const confirm = async () => {
    if (!n) return;
    try {
      await plant(zone.id, grid, when.toISOString(), lot === 'none' ? undefined : lot);
      setDone(true);
    } catch {
      showToast(t('common.error'));
    }
  };

  const cell = (i: number, interactive: boolean) => {
    const c = crops.get(shown(i) ?? '');
    const isNew = grid[i] !== undefined;
    const grass = !!c?.isForage;
    const inner = c && (grass ? <span className="kb-sprout">{GRASS}</span> : (
      <span className="kb-sprout flex h-[30px] w-[30px] items-center justify-center rounded-full text-sm font-medium"
        style={{ background: cropDot(c, data.categories), color: '#fff', opacity: isNew ? 1 : 0.75, boxShadow: '0 3px 0 rgba(30,35,22,.25)' }}>{c.name.charAt(0)}</span>
    ));
    const style = { aspectRatio: '1', background: grass ? '#a9d17a' : '#b07a43', boxShadow: grass ? 'inset 0 -4px 0 #7fae52' : 'inset 0 -4px 0 #8a5a2b' };
    return interactive
      ? <button key={i} type="button" onClick={() => tap(i)} aria-label={t('plant.cell', { n: i + 1, name: c ? c.name : t('plant.empty') })} className="kb-hit relative flex items-center justify-center rounded-[10px] border-0 p-0 transition-[filter] hover:brightness-105" style={style}>{inner}</button>
      : <span key={i} className="relative flex items-center justify-center rounded-[10px]" style={style}>{inner}</span>;
  };
  const board = (interactive: boolean) => (
    <section aria-label={t('plant.board')} className="rounded-[20px] border-4 p-3" style={{ background: '#8fbf5a', borderColor: '#e6d3a8' }}>
      <div className="grid grid-cols-6 gap-2">{Array.from({ length: total }, (_, i) => cell(i, interactive))}</div>
    </section>
  );

  const header = <ScreenHeader title={t('plant.title')} size="md" back={{ to: `/talhao/${zone.id}`, label: t('common.close'), icon: 'close' }}
    sub={[zone.name, zone.size, t('plant.holes', { count: total })].filter(Boolean).join(' · ')} />;

  if (done) {
    return (
      <main className="kb-screen kb-screen-flow">
        {header}
        {board(false)}
        <div className="flex flex-col gap-1" role="status">
          <span className="text-[26px] font-medium leading-8">{allPasto ? t('plant.donePasture', { name: zone.name }) : t('plant.done', { name: zone.name })}</span>
          <span className="text-ink-muted">{summary}. {allPasto ? (lotName ? t('plant.doneTextPastureLot', { name: lotName }) : t('plant.doneTextPasture')) : t('plant.doneText')}</span>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2.5">
          <button type="button" className="kb-tap kb-tap-alt" onClick={() => { setDone(false); setGrid({}); }}>{t('plant.more')}</button>
          <button type="button" className="kb-tap kb-tap-go" onClick={() => navigate('/')}>{t('plant.seeMap')}</button>
        </div>
      </main>
    );
  }

  return (
    <main className="kb-screen kb-screen-flow !gap-3.5">
      {header}
      <div role="tablist" aria-label={t('plant.what')} className="kb-segs">
        {(['roca', 'pasto'] as const).map(v => (
          <button key={v} type="button" role="tab" aria-selected={tab === v} className={`kb-seg ${tab === v ? 'kb-seg-on' : ''}`} onClick={() => switchTab(v)}>{t(`plant.tab.${v}`)}</button>
        ))}
      </div>
      <p className="m-0 text-[15px] leading-[22px] text-ink-muted">{tab === 'pasto' ? t('plant.hintPasture') : t('plant.hint')}</p>
      {board(true)}

      <div className="flex items-baseline justify-between">
        <span className="font-medium">{tab === 'pasto' ? t('plant.handPasture') : t('plant.hand')}</span>
        <Link to="/produtos" className="kb-inline text-[15px]">{t('plant.seeAll')}</Link>
      </div>
      <div role="radiogroup" aria-label={t('plant.product')} className="-mx-4 flex gap-2.5 overflow-x-auto px-4 py-2.5">
        {hand.map(c => {
          const on = card === c.id;
          return (
            <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setCard(c.id)}
              className="flex w-24 flex-none flex-col gap-1 rounded-2xl border-[1.5px] bg-surface-raised px-1.5 pb-2.5 pt-1.5 text-left text-ink transition-transform duration-150"
              style={on ? { transform: 'translateY(-8px)', borderColor: 'var(--canopy)', boxShadow: '0 4px 0 var(--canopy-soft-edge), 0 10px 18px rgba(30,35,22,.18)' } : { borderColor: 'var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
              <span className="flex h-[52px] items-center justify-center rounded-[10px] text-2xl font-medium" style={{ background: cropArt(c, data.categories), color: ART_INK }}>{c.name.charAt(0)}</span>
              <span className="truncate text-[15px] font-medium leading-5">{c.name}</span>
              <span className="text-xs leading-4 text-ink-muted">{c.layer ? t(`layers.${c.layer}`) : ''}</span>
            </button>
          );
        })}
        {hand.length === 0 && <Link to="/produtos/nova" className="kb-chip kb-chip-dashed">{t('plant.addCard')}</Link>}
      </div>

      {tab === 'pasto' && (
        <>
          <button type="button" className="kb-tap kb-tap-alt kb-tap-md" onClick={() => card && setGrid(Object.fromEntries(Array.from({ length: total }, (_, i) => [i, card])))}>{t('plant.fillAll')}</button>
          <div className="flex flex-col gap-2">
            <span className="kb-label">{t('plant.grazers')} <span className="font-normal text-ink-muted">{t('common.optional')}</span></span>
            <div role="radiogroup" aria-label={t('plant.grazersLabel')} className="flex flex-wrap gap-2">
              {[...grazers.map(g => ({ id: g.id, name: g.name })), { id: 'none', name: t('plant.noLot') }].map(g => (
                <button key={g.id} type="button" role="radio" aria-checked={lot === g.id} className={`kb-chip ${lot === g.id ? 'kb-chip-on' : ''}`} onClick={() => setLot(g.id)}>{g.name}</button>
              ))}
            </div>
          </div>
        </>
      )}

      <WhenRow label={t('plant.plantedOn')} value={when} onChange={setWhen} t={t} dateOnly />

      <div className="mt-auto flex flex-col gap-2">
        <span className="kb-sub min-h-5 text-center">{summary}</span>
        <button type="button" className={`kb-tap ${n ? 'kb-tap-go' : 'kb-tap-off'}`} aria-disabled={!n} onClick={confirm}>
          {!n ? t('plant.go') : allPasto ? t('plant.goPasture') : t('plant.goN', { count: n })}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{summary}</span>
    </main>
  );
}
