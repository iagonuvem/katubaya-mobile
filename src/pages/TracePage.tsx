/**
 * Lote no paiol · de onde veio: traces a lot back through processing and slaughter to the
 * animal lot or plot it came from.
 */

import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { indexById, lotLife, type FarmData } from '@/domain/rules/farm';
import type { HarvestEvent, Lot } from '@/domain/contracts/types';
import { ScreenHeader } from '@/components/game/Shell';
import { Icon, type IconName } from '@/components/game/Icon';
import { Loading, lifeLabel } from '@/components/game/bits';
import { fmtDdMm, fmtQty } from '@/lib/format';

export default function TracePage() {
  const { lotId } = useParams();
  const data = useFarm();
  const now = useNow();
  if (!data) return <Loading />;
  return <Trace data={data} now={now} lotId={lotId!} />;
}

interface NodeProps { icon: IconName; tone: 'amber' | 'river' | 'canopy' | 'urucum'; title: string; sub: string; subTone?: string; to?: string; current?: boolean; chevron?: boolean }

function Node({ icon, tone, title, sub, subTone, to, current, chevron }: NodeProps) {
  const body = (
    <>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}><Icon name={icon} size={22} /></span>
      <span className="flex flex-1 flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-[13px]" style={{ color: subTone ?? 'var(--ink-muted)', fontWeight: subTone ? 500 : undefined }}>{sub}</span>
      </span>
      {chevron && <Icon name="chevron" size={20} strokeWidth={2} />}
    </>
  );
  const cls = `flex items-center gap-3 rounded-2xl bg-surface-raised px-3.5 py-3 text-ink no-underline ${current ? 'border-[1.5px] border-canopy' : 'border border-line'}`;
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Link2({ label }: { label: string }) {
  return (
    <>
      <div className="ml-[33px] h-[18px] w-0.5 bg-line-strong" aria-hidden="true" />
      <span className="my-0.5 ml-12 text-xs font-medium leading-4 text-ink-muted">{label}</span>
      <div className="ml-[33px] h-[18px] w-0.5 bg-line-strong" aria-hidden="true" />
    </>
  );
}

function Trace({ data, now, lotId }: { data: FarmData; now: Date; lotId: string }) {
  const { t } = useTranslation();
  const crops = indexById(data.crops);
  const lot = data.lots.find(l => l.id === lotId);
  if (!lot) {
    return (
      <main className="kb-screen kb-screen-flow">
        <ScreenHeader title={t('trace.missing')} back={{ to: '/paiol', label: t('trace.back') }} />
      </main>
    );
  }
  const crop = crops.get(lot.cropId);
  const harvest = data.harvests.find(h => h.id === lot.harvestEventId);
  const life = lotLife(lot, now);
  const name = (l: Lot) => crops.get(l.cropId)?.name ?? '';
  const iconOf = (cropId: string): IconName => {
    const c = crops.get(cropId);
    if (c?.derivedFromCropId) return 'cheese';
    if (c?.species) return c.defaultUnit === 'liter' ? 'milk' : c.defaultUnit === 'dozen' ? 'egg' : 'box';
    return 'harvest';
  };

  // Lots consumed to make this one, and where each of those came from
  const inputs = data.adjustments.filter(a => a.reason === 'processing' && a.harvestEventId === lot.harvestEventId);
  const slaughter = data.animalAdjustments.find(a => a.harvestEventId === lot.harvestEventId);
  const sourceOf = (h?: HarvestEvent) => {
    if (!h) return null;
    const group = data.animalGroups.find(g => g.id === h.animalGroupId);
    const zone = data.zones.find(z => z.id === h.zoneId);
    return { group, zone };
  };
  const sourceNode = (h: HarvestEvent | undefined) => {
    const s = sourceOf(h);
    if (!s || (!s.group && !s.zone)) return null;
    return s.group
          ? <Node icon={s.group.species === 'poultry' ? 'poultry' : s.group.species === 'swine' ? 'swine' : 'cattle'} tone={s.group.species === 'poultry' ? 'amber' : 'canopy'}
              title={s.group.name} sub={[t('trace.animalLot'), data.zones.find(z => z.id === s.group!.zoneId)?.name].filter(Boolean).join(' · ')} to={`/animais/${s.group.id}`} chevron />
      : <Node icon="grid" tone="canopy" title={s.zone!.name} sub={t('trace.plot')} to={`/talhao/${s.zone!.id}`} chevron />;
  };
  const tail = (h: HarvestEvent | undefined, label: string) => {
    const node = sourceNode(h);
    return node && <><Link2 label={label} />{node}</>;
  };
  const kindOf = (h: HarvestEvent) => {
    const c = crops.get(h.cropId);
    return c?.defaultUnit === 'liter' && c.species ? t('trace.milking') : c?.defaultUnit === 'dozen' ? t('trace.collect') : t('trace.harvest');
  };
  const outs = data.adjustments.filter(a => a.lotId === lot.id).sort((a, b) => b.adjustedAt.localeCompare(a.adjustedAt));

  const sourceLots = inputs.map(a => ({ a, src: data.lots.find(l => l.id === a.lotId) })).filter(x => x.src);
  const srcHarvests = sourceLots.map(x => data.harvests.find(h => h.id === x.src!.harvestEventId)).filter(Boolean) as HarvestEvent[];

  return (
    <main className="kb-screen kb-screen-flow">
      <ScreenHeader eyebrow={t('trace.eyebrow')} title={crop?.name} back={{ to: '/paiol', label: t('trace.back') }} size="md" />

      <section className="kb-card flex flex-col gap-2.5 p-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="kb-stat"><span>{t('trace.inLot')}</span><b>{fmtQty(lot.quantityRemaining, lot.unit)}</b></div>
          <div className="kb-stat"><span>{crop?.derivedFromCropId ? t('trace.madeOn') : t('trace.harvestedOn')}</span><b>{fmtDdMm(lot.harvestedAt)}</b></div>
          <div className="kb-stat"><span>{t('trace.shelf')}</span><b className="!font-sans !text-[15px]" style={{ color: `var(--${life.tone})` }}>{life.state === 'fresh' ? `${t('trace.fresh')} · ${fmtDdMm(lot.expiresAtEstimate)}` : lifeLabel(t, life)}</b></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link to={`/paiol/ajustar?lote=${lot.id}`} className="kb-tap kb-tap-alt kb-tap-md">{t('trace.adjust')}</Link>
          <Link to="/feira" className="kb-tap kb-tap-go kb-tap-md">{t('trace.toFeira')}</Link>
        </div>
      </section>

      <h2 className="kb-h3">{t('trace.origin')}</h2>
      <div className="flex flex-col">
        <Node current icon={iconOf(lot.cropId)} tone={crop?.derivedFromCropId ? 'amber' : life.tone === 'urucum' ? 'urucum' : 'river'}
          title={`${fmtQty(lot.initialQuantity, lot.unit)} ${name(lot)}`} sub={life.state === 'fresh' ? t('trace.thisLot') : lifeLabel(t, life)}
          subTone={life.state === 'fresh' ? undefined : `var(--${life.tone})`} />

        {sourceLots.length > 0 && (
          <>
            <Link2 label={t('trace.processing', { date: fmtDdMm(harvest?.harvestedAt ?? lot.harvestedAt) })} />
            {sourceLots.map(({ a, src }, i) => (
              <Fragment key={a.id}>
                {i > 0 && <div className="h-2" />}
                <Node icon={iconOf(src!.cropId)} tone="river" title={`${fmtQty(-a.quantityDelta, a.unit)} ${name(src!)} · ${t('trace.lotOf', { date: fmtDdMm(src!.harvestedAt) })}`}
                  sub={-a.quantityDelta >= src!.initialQuantity ? t('trace.whole') : t('trace.part', { qty: fmtQty(src!.initialQuantity, src!.unit) })} to={`/paiol/lote/${src!.id}`} />
              </Fragment>
            ))}
            {tail(srcHarvests[0], `${kindOf(srcHarvests[0] ?? harvest!)} · ${[...new Set(srcHarvests.map(h => fmtDdMm(h.harvestedAt)))].join(t('trace.and'))}`)}
          </>
        )}
        {sourceLots.length === 0 && slaughter && (
          <>
            <Link2 label={t('trace.slaughter', { count: -slaughter.delta, date: fmtDdMm(slaughter.adjustedAt) })} />
            {sourceNode(harvest)}
          </>
        )}
        {sourceLots.length === 0 && !slaughter && harvest && tail(harvest, `${kindOf(harvest)} · ${fmtDdMm(harvest.harvestedAt)}`)}
      </div>

      {outs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="kb-h3 mt-2">{t('trace.outs')}</h2>
          {outs.map(a => (
            <div key={a.id} className="kb-card flex items-center gap-3 rounded-2xl px-3.5 py-3">
              <span className="kb-mono min-w-[52px] flex-none rounded-full px-2 py-0.5 text-center text-[13px] font-medium"
                style={a.quantityDelta < 0 ? { background: 'var(--urucum-soft)', color: 'var(--urucum)' } : { background: 'var(--canopy-soft)', color: 'var(--canopy)' }}>
                {a.quantityDelta > 0 ? '+' : '−'}{fmtQty(Math.abs(a.quantityDelta), a.unit)}
              </span>
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{t(`adjustReasons.${a.reason}`)}</span>
                <span className="text-[13px] text-ink-muted">{fmtDdMm(a.adjustedAt)}{a.notes ? ` · ${a.notes}` : ''}</span>
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
