/**
 * Ajustar Cabeças: births, purchases, deaths, sales and slaughter. A slaughter can register the
 * meat it produced as a lot in the storehouse, linked back to this animal lot.
 */

import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm } from '@/hooks/useFarm';
import type { AnimalAdjustment, AnimalAdjustmentReason, AnimalGroup } from '@/domain/contracts/types';
import { round1, type FarmData } from '@/domain/rules/farm';
import { adjustAnimals } from '@/data/actions';
import { ScreenHeader } from '@/components/game/Shell';
import { Icon } from '@/components/game/Icon';
import { DoneBanner, Loading, OptionalLabel } from '@/components/game/bits';
import { showToast } from '@/components/game/toast';
import { fmtNum1, fmtQty, parseNum } from '@/lib/format';

const REMOVE: AnimalAdjustmentReason[] = ['death', 'sale', 'slaughter', 'correction'];
const ADD: AnimalAdjustmentReason[] = ['birth', 'purchase', 'correction'];

export default function AdjustHeadsPage() {
  const { id } = useParams();
  const data = useFarm();
  if (!data) return <Loading />;
  const group = data.animalGroups.find(g => g.id === id);
  if (!group) return <Loading />;
  return <AdjustHeads key={group.id} data={data} group={group} />;
}

function AdjustHeads({ data, group }: { data: FarmData; group: AnimalGroup }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const slaughterFirst = params.get('motivo') === 'slaughter';
  const meats = data.crops.filter(c => c.species === group.species && c.animalYield === 'slaughter');
  const [mode, setMode] = useState<'rem' | 'add'>(group.headcount === 0 ? 'add' : 'rem');
  const [n, setN] = useState(1);
  const [reason, setReason] = useState<AnimalAdjustmentReason | null>(slaughterFirst ? 'slaughter' : null);
  const [prod, setProd] = useState<string>(meats[0]?.id ?? 'none');
  const [kg, setKg] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState<{ adj: AnimalAdjustment; preview: string; after: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const max = group.headcount;
  const rem = mode === 'rem';
  const list = rem ? REMOVE : ADD;
  const tooMany = rem && n > max;
  const slaughter = rem && reason === 'slaughter';
  const meat = slaughter && prod !== 'none' ? data.crops.find(c => c.id === prod) : undefined;
  const qty = round1(parseNum(kg));
  const ok = n > 0 && !tooMany && !!reason && (!meat || qty > 0);
  const after = rem ? max - n : max + n;
  const preview = `${rem ? '−' : '+'}${n} ${reason ? t(`animalReasons.${reason}`) : '…'}${meat ? ` · ${fmtQty(qty, meat.defaultUnit)} ${meat.name}` : ''}`;

  const save = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      const adj = await adjustAnimals({
        groupId: group.id, delta: rem ? -n : n, reason: reason!, notes: notes.trim() || undefined,
        output: meat ? { cropId: meat.id, quantity: qty, unit: meat.defaultUnit, notes: notes.trim() || undefined } : undefined,
      });
      setDone({ adj, preview, after });
    } catch {
      showToast(t('common.error'));
    } finally {
      setBusy(false);
    }
  };
  const again = () => { setDone(null); setN(1); setReason(null); setKg(''); setNotes(''); };
  const switchMode = (m: 'rem' | 'add') => { if (m !== mode) { setMode(m); setReason(null); } };
  const meatHarvest = done?.adj.harvestEventId ? data.harvests.find(h => h.id === done.adj.harvestEventId) : undefined;
  const meatLot = meatHarvest ? data.lots.find(l => l.id === meatHarvest.lotId) : undefined;

  return (
    <main className="kb-screen kb-screen-flow">
      <ScreenHeader title={t('heads.title')} size="md" back={{ to: `/animais/${group.id}`, label: t('common.close'), icon: 'close' }}
        sub={[group.name, t(`species.${group.species}`), t('heads.current', { count: max })].join(' · ')} />

      {done ? (
        <div className="kb-rise flex flex-1 flex-col gap-3.5">
          <DoneBanner>{t('heads.done')}</DoneBanner>
          <div className="kb-card flex flex-col gap-1 rounded-2xl p-3.5">
            <span className="text-[13px] text-ink-muted">{t('heads.inHistory')}</span>
            <span className="kb-mono text-[17px] font-medium">{done.preview}</span>
            <span className="kb-sub">{t('heads.after', { name: group.name, count: done.after })}</span>
          </div>
          {meatHarvest && meatLot && (
            <Link to={`/paiol/lote/${meatLot.id}`} className="kb-card flex items-center gap-2.5 rounded-2xl p-3.5 text-ink no-underline">
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{t('heads.meatIn', { qty: fmtQty(meatHarvest.quantity, meatHarvest.unit), name: data.crops.find(c => c.id === meatHarvest.cropId)?.name })}</span>
                <span className="text-[13px] text-ink-muted">{t('heads.meatLinked')}</span>
              </span>
              <Icon name="chevron" size={20} strokeWidth={2} />
            </Link>
          )}
          <div className="mt-auto grid grid-cols-2 gap-2.5">
            <button type="button" className="kb-tap kb-tap-alt" onClick={again}>{t('heads.again')}</button>
            <Link to={`/animais/${group.id}`} className="kb-tap kb-tap-go">{t('heads.seeLot')}</Link>
          </div>
        </div>
      ) : (
        <>
          <div role="group" aria-label={t('heads.kind')} className="kb-segs">
            {(['rem', 'add'] as const).map(m => (
              <button key={m} type="button" aria-pressed={mode === m} className={`kb-seg !min-h-12 !text-base ${mode === m ? 'kb-seg-on' : ''}`} onClick={() => switchMode(m)} disabled={m === 'rem' && max === 0}>{t(`heads.mode.${m}`)}</button>
            ))}
          </div>

          <section aria-label={t('heads.howMany')} className="kb-card flex flex-col items-center gap-2 rounded-[22px] p-4">
            <div className="flex items-center gap-[18px]">
              <button type="button" className="kb-stepper" aria-label={t('heads.less')} onClick={() => setN(Math.max(1, n - 1))}><Icon name="minus" strokeWidth={2} /></button>
              <span className="kb-mono min-w-24 text-center text-5xl font-medium leading-[52px]" aria-live="polite" style={{ color: rem ? 'var(--urucum)' : 'var(--canopy)' }}>{rem ? '−' : '+'}{n}</span>
              <button type="button" className="kb-stepper" aria-label={t('heads.more')} onClick={() => setN(n + 1)}><Icon name="plus" strokeWidth={2} /></button>
            </div>
            <span className="kb-sub">{rem ? t('heads.hintRem', { max, count: Math.max(0, after) }) : t('heads.hintAdd', { count: after })}</span>
            {tooMany && <span role="alert" className="text-sm font-medium text-urucum">{t('heads.tooMany', { max })}</span>}
          </section>

          <div className="flex flex-col gap-2">
            <span className="kb-label">{t('heads.reason')}</span>
            <div role="radiogroup" aria-label={t('heads.reason')} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}>
              {list.map(r => (
                <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={`kb-pick min-h-[52px] !text-[15px] ${reason === r ? 'kb-pick-on' : ''}`}>{t(`animalReasons.${r}`)}</button>
              ))}
            </div>
          </div>

          {slaughter && (
            <section className="kb-rise flex flex-col gap-2.5 rounded-[18px] bg-amber-soft p-3.5" aria-labelledby="abate-t">
              <span id="abate-t" className="kb-label">{t('heads.meatTitle')}</span>
              <span className="text-sm leading-5">{t('heads.meatText')}</span>
              <div role="radiogroup" aria-label={t('heads.product')} className="flex flex-wrap gap-2">
                {[{ id: 'none', name: t('heads.noProduct') }, ...meats].map(m => (
                  <button key={m.id} type="button" role="radio" aria-checked={prod === m.id} className={`kb-chip ${prod === m.id ? 'kb-chip-on' : ''}`} onClick={() => setProd(m.id)}>{m.name}</button>
                ))}
                {meats.length === 0 && <Link to="/produtos/nova" className="kb-chip kb-chip-dashed">{t('heads.newMeat')}</Link>}
              </div>
              {meat && (
                <div className="flex items-center justify-between gap-2.5 rounded-[14px] bg-surface-raised py-2 pl-3.5 pr-2">
                  <span className="text-[15px]">{t('heads.produced', { unit: meat.defaultUnit === 'kg' ? 'kg' : t(`units.${meat.defaultUnit}`, { count: 2 }) })}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="kb-stepper kb-stepper-xs" aria-label={t('heads.kgLess')} onClick={() => setKg(fmtNum1(Math.max(0, qty - 0.1)))}><Icon name="minus" size={20} strokeWidth={2} /></button>
                    <input type="text" inputMode="decimal" aria-label={t('heads.produced', { unit: 'kg' })} placeholder="0,0" value={kg} onChange={e => setKg(e.target.value)}
                      className="kb-mono w-16 border-0 bg-transparent text-center text-xl font-medium text-ink" />
                    <button type="button" className="kb-stepper kb-stepper-xs" aria-label={t('heads.kgMore')} onClick={() => setKg(fmtNum1(qty + 0.1))}><Icon name="plus" size={20} strokeWidth={2} /></button>
                  </div>
                </div>
              )}
            </section>
          )}

          <label className="flex flex-col gap-1.5">
            <OptionalLabel t={t}>{t('common.notes')}</OptionalLabel>
            <input type="text" className="kb-field" placeholder={t('heads.notesPlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>

          <div className="mt-auto flex flex-col gap-2">
            <span className="kb-mono text-center text-[15px]">{preview}</span>
            <button type="button" className={`kb-tap ${ok ? 'kb-tap-go' : 'kb-tap-off'}`} aria-disabled={!ok} onClick={save}>{t('heads.save')}</button>
          </div>
        </>
      )}
    </main>
  );
}
