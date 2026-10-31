/** Lote de animais: production by day and the head-count history of one lot */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { animalLotStats, calendarDays, dailySeries, indexById, type FarmData } from '@/domain/rules/farm';
import type { AnimalGroup } from '@/domain/contracts/types';
import { removeAnimalGroup } from '@/data/actions';
import { BottomNav, BottomSheet, ScreenHeader } from '@/components/game/Shell';
import { Icon } from '@/components/game/Icon';
import { Loading } from '@/components/game/bits';
import { showToast } from '@/components/game/toast';
import { SPECIES_SPRITE } from '@/components/game/species';
import { SceneDefs } from '@/components/map/SceneDefs';
import { fmtDate, fmtDdMm, fmtNum, fmtQty, fmtTime, fmtUnit, fmtWeekday } from '@/lib/format';
import '@/components/map/map.css';

export default function AnimalLotPage() {
  const { id } = useParams();
  const data = useFarm();
  const now = useNow();
  if (!data) return <Loading />;
  const group = data.animalGroups.find(g => g.id === id);
  if (!group) return <main className="kb-screen kb-screen-flow"><MissingHeader /></main>;
  return <Lot key={group.id} data={data} group={group} now={now} />;
}

function MissingHeader() {
  const { t } = useTranslation();
  return <ScreenHeader title={t('animalLot.missing')} back={{ to: '/animais', label: t('animalLot.back') }} />;
}

const POS: [number, number][] = [[50, 46], [130, 40], [214, 52], [86, 96], [176, 98], [270, 92]];

function Lot({ data, group, now }: { data: FarmData; group: AnimalGroup; now: Date }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'prod' | 'hist'>('prod');
  const [confirm, setConfirm] = useState(false);
  const s = animalLotStats(group, data, now);
  const crops = indexById(data.crops);
  const zone = data.zones.find(z => z.id === group.zoneId)?.name;
  const daily = s.dailyCrop;
  const u = daily?.defaultUnit;
  const series = daily ? dailySeries(group, daily.id, data.harvests, now) : [];
  const maxS = Math.max(1, ...series.map(x => x.total));
  const productions = data.harvests.filter(h => h.animalGroupId === group.id).sort((a, b) => b.harvestedAt.localeCompare(a.harvestedAt)).slice(0, 5);
  const history = data.animalAdjustments.filter(a => a.groupId === group.id).sort((a, b) => b.adjustedAt.localeCompare(a.adjustedAt));
  const sprite = SPECIES_SPRITE[group.species];
  const milk = u === 'liter';

  const when = (iso: string) => {
    const d = calendarDays(iso, now);
    return `${d === 0 ? t('common.today') : d === 1 ? t('common.yesterday') : fmtWeekday(iso)}, ${fmtTime(iso)}`;
  };
  const remove = async () => {
    await removeAnimalGroup(group.id);
    showToast(t('animalLot.deleted', { name: group.name }));
    navigate('/animais');
  };
  const formula = [
    t('animalLot.formulaStart', { count: group.initialHeadcount }),
    ...[...history].reverse().map(a => `${a.delta > 0 ? '+' : '−'} ${Math.abs(a.delta)}`),
  ].join(' ');

  return (
    <>
      <main className="kb-screen kb-screen-nav !gap-3.5">
        <ScreenHeader eyebrow={t('animalLot.eyebrow')} title={group.name} size="md" back={{ to: '/animais', label: t('animalLot.back') }}
          right={<Link to={`/animais/${group.id}/editar`} aria-label={t('animalLot.edit')} className="kb-icon-btn"><Icon name="edit" size={20} /></Link>} />

        <section className="kb-card flex flex-col gap-2.5 rounded-[22px] px-2.5 pb-3 pt-2.5">
          <div className="relative h-[130px] overflow-hidden rounded-2xl" style={{ background: group.species === 'swine' ? '#a07a4c' : group.species === 'poultry' ? '#d9b77a' : '#a8d06e' }}>
            <svg aria-hidden="true" viewBox="0 0 338 130" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
              <SceneDefs />
              <rect x="4" y="4" width="330" height="122" rx="12" fill="none" stroke="#e6d3a8" strokeWidth="4" />
              {POS.slice(0, Math.min(group.headcount, 6)).map(([x, y], i) => (
                <use key={i} className={group.species === 'poultry' ? 'map-peck' : group.species === 'swine' ? 'map-wig' : 'map-graze'} href={`#${sprite}`} x={x} y={y}
                  style={{ animationDelay: `${-0.5 * i}s` }} />
              ))}
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="kb-stat"><span>{t('animalLot.heads')}</span><b className="!text-lg">{group.headcount}</b></div>
            <div className="kb-stat"><span>{t('animalLot.species')}</span><b className="!font-sans !text-base">{t(`species.${group.species}`)}</b></div>
            <div className="kb-stat"><span>{t('animalLot.start')}</span><b className="!text-[15px]">{fmtDate(group.startedAt)}</b></div>
          </div>
          <span className="px-1 text-sm text-ink-muted">{[t('animalLot.zone', { name: zone ?? t('common.noZone') }), group.notes].filter(Boolean).join(' · ')}</span>
        </section>

        <div role="tablist" aria-label={t('animalLot.sections')} className="kb-segs">
          {(['prod', 'hist'] as const).map(v => (
            <button key={v} type="button" role="tab" aria-selected={tab === v} className={`kb-seg ${tab === v ? 'kb-seg-on' : ''}`} onClick={() => setTab(v)}>{t(`animalLot.tab.${v}`)}</button>
          ))}
        </div>

        {tab === 'prod' && (
          <div key="prod" className="kb-rise flex flex-col gap-3" role="tabpanel">
            {daily ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[['today', s.today], ['week', s.week], ['month', s.month]].map(([k, v]) => (
                    <div key={k as string} className="kb-stat border border-line !bg-surface-raised"><span>{t(`animalLot.${k}`)}</span>
                      <b style={k === 'today' && s.pending ? { color: 'var(--amber)' } : undefined}>{fmtQty(v as number, u!)}</b></div>
                  ))}
                </div>
                <section className="kb-card flex flex-col gap-2 rounded-[18px] p-3.5">
                  <span className="font-medium">{t('animalLot.perDay', { name: daily.name })}</span>
                  <div role="img" aria-label={t('animalLot.chartLabel', { name: daily.name, values: series.map(x => fmtNum(x.total)).join(', '), unit: fmtUnit(u!, 2) })} className="grid h-24 grid-cols-7 items-end gap-2">
                    {series.map(x => {
                      const today = x.offset === 0;
                      const empty = today && x.total === 0;
                      return (
                        <div key={x.offset} className="flex h-full flex-col items-center justify-end gap-1">
                          <span className="kb-mono text-[11px]" style={empty ? { color: 'var(--amber)' } : undefined}>{empty ? '—' : fmtNum(x.total)}</span>
                          <div className="box-border w-full rounded-[5px_5px_2px_2px] transition-[height] duration-500"
                            style={empty ? { height: 24, border: '1.5px dashed var(--amber-bright)' }
                              : { height: Math.max(3, (x.total / maxS) * 66), background: x.offset === 1 ? 'var(--river)' : 'var(--river-soft)', border: x.offset === 1 ? undefined : '1px solid var(--river)' }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs text-ink-muted">
                    {series.map(x => <span key={x.offset} style={x.offset === 0 ? { color: s.pending ? 'var(--amber)' : 'var(--ink)', fontWeight: 500 } : undefined}>{x.offset === 0 ? t('common.today').toLowerCase() : fmtWeekday(x.date)}</span>)}
                  </div>
                </section>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="kb-stat border border-line !bg-surface-raised"><span>{t('animalLot.slaughters', { year: now.getFullYear() })}</span><b>{s.slaughters}</b></div>
                <div className="kb-stat border border-line !bg-surface-raised"><span>{t('animalLot.meat')}</span><b>{fmtQty(s.slaughterQty, 'kg')}</b></div>
              </div>
            )}
            <span className="font-medium">{t('animalLot.recent')}</span>
            {productions.map(h => {
              const lot = data.lots.find(l => l.id === h.lotId);
              const processed = lot ? data.adjustments.filter(a => a.lotId === lot.id && a.reason === 'processing') : [];
              const out = processed[0] && data.harvests.find(x => x.id === processed[0].harvestEventId);
              const note = out ? t('animalLot.became', { qty: fmtQty(-processed.reduce((acc, a) => acc + a.quantityDelta, 0), h.unit), name: crops.get(out.cropId)?.name })
                : lot ? t('animalLot.expires', { date: fmtDdMm(lot.expiresAtEstimate) }) : '';
              return (
                <Link key={h.id} to={`/paiol/lote/${h.lotId}`} className="kb-card flex items-center gap-3 rounded-2xl px-3.5 py-3 text-ink no-underline">
                  <span className="kb-mono min-w-[52px] flex-none rounded-full bg-river-soft px-2 py-0.5 text-center text-[13px] font-medium text-river">{fmtQty(h.quantity, h.unit)}</span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium">{crops.get(h.cropId)?.name}</span>
                    <span className="text-[13px] text-ink-muted">{when(h.harvestedAt)} · {note}</span>
                  </span>
                </Link>
              );
            })}
            {productions.length === 0 && <p className="kb-sub m-0">{t('animalLot.noProduction')}</p>}
          </div>
        )}

        {tab === 'hist' && (
          <div key="hist" className="kb-rise flex flex-col gap-2" role="tabpanel">
            {history.map(a => (
              <div key={a.id} className="kb-card flex items-center gap-3 rounded-2xl px-3.5 py-3">
                <span className="kb-mono min-w-[52px] flex-none rounded-full px-2 py-0.5 text-center text-[13px] font-medium"
                  style={a.delta > 0 ? { background: 'var(--canopy-soft)', color: 'var(--canopy)' } : { background: 'var(--urucum-soft)', color: 'var(--urucum)' }}>
                  {a.delta > 0 ? '+' : '−'}{Math.abs(a.delta)}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="font-medium">{t(`animalReasons.${a.reason}`)}</span>
                  <span className="text-[13px] text-ink-muted">{fmtDdMm(a.adjustedAt)}{a.notes ? ` · ${a.notes}` : ''}</span>
                </span>
                {a.harvestEventId && <Link to={`/paiol/lote/${data.harvests.find(h => h.id === a.harvestEventId)?.lotId}`} className="kb-inline text-sm">{t('animalLot.seeMeat')}</Link>}
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-2xl border border-line px-3.5 py-3">
              <span className="kb-mono min-w-[52px] flex-none rounded-full bg-surface-sunken px-2 py-0.5 text-center text-[13px] font-medium">{group.initialHeadcount}</span>
              <span className="flex flex-1 flex-col"><span className="font-medium">{t('animalLot.initial')}</span><span className="text-[13px] text-ink-muted">{fmtDate(group.startedAt)} · {t('animalLot.startOfLot')}</span></span>
            </div>
            <span className="kb-hint">{t('animalLot.formula', { formula, count: group.headcount })}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Link to={`/animais/${group.id}/ajustar`} className="kb-tap kb-tap-alt min-h-[52px] !text-base">{t('map.act.heads')}</Link>
          {daily
            ? <Link to={`/colher?lote=${group.id}`} className="kb-tap kb-tap-go min-h-[52px] !text-base">{milk ? t('animalLot.milk') : t('animalLot.collect', { name: daily.name })}</Link>
            : <Link to={`/animais/${group.id}/ajustar?motivo=slaughter`} className="kb-tap kb-tap-go min-h-[52px] !text-base">{t('map.act.slaughter')}</Link>}
        </div>
        <button type="button" className="self-center border-0 bg-transparent px-3 text-[15px] text-urucum" onClick={() => setConfirm(true)}>{t('animalLot.delete')}</button>
        <span className="-mt-2.5 text-center text-[13px] leading-[18px] text-ink-muted">{t('animalLot.deleteNote')}</span>
      </main>
      <BottomNav active="sitio" />
      {confirm && (
        <BottomSheet variant="modal" labelledBy="del-t" onClose={() => setConfirm(false)}>
          <h2 id="del-t" className="kb-h2">{t('animalLot.deleteTitle', { name: group.name })}</h2>
          <p className="m-0 text-ink-muted">{t('animalLot.deleteText')}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" className="kb-tap kb-tap-alt kb-tap-md" onClick={() => setConfirm(false)} data-autofocus>{t('common.cancel')}</button>
            <button type="button" className="kb-tap kb-tap-md" style={{ background: 'var(--urucum)', color: 'var(--on-urucum)' }} onClick={remove}>{t('common.delete')}</button>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
