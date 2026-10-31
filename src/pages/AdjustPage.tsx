/**
 * Ajustar paiol: sold, eaten, given, damaged or lost. The adjustment enters the history; nothing is deleted.
 */

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { round1, stockGroups, type FarmData, type StockGroup } from '@/domain/rules/farm';
import type { AdjustmentReason } from '@/domain/contracts/types';
import { adjustLot } from '@/data/actions';
import { BottomSheet, ScreenHeader } from '@/components/game/Shell';
import { Icon, type IconName } from '@/components/game/Icon';
import { CropArt, Loading, OptionalLabel, lifeLabel } from '@/components/game/bits';
import { showToast } from '@/components/game/toast';
import { fmtDayMonth, fmtNum, fmtQty, fmtUnit } from '@/lib/format';

const REASONS: { key: AdjustmentReason; icon: IconName }[] = [
  { key: 'sold', icon: 'money' }, { key: 'consumed', icon: 'bowl' }, { key: 'gift', icon: 'gift' }, { key: 'damage', icon: 'warn' },
  { key: 'loss', icon: 'trash' }, { key: 'correction', icon: 'edit' }, { key: 'processing', icon: 'funnel' },
];

export default function AdjustPage() {
  const data = useFarm();
  const now = useNow();
  if (!data) return <Loading />;
  return <Adjust data={data} now={now} />;
}

function Adjust({ data, now }: { data: FarmData; now: Date }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const groups = stockGroups(data, now);
  const lots = groups.flatMap(g => g.lots.map(l => ({ g, l })));
  const urgent = [...lots].sort((a, b) => a.l.life.days - b.l.life.days)[0];
  const [lotId, setLotId] = useState(params.get('lote') ?? urgent?.l.id);
  const [delta, setDelta] = useState(-1);
  const [reason, setReason] = useState<AdjustmentReason>('sold');
  const [notes, setNotes] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const cur = lots.find(x => x.l.id === (lotId ?? urgent?.l.id));
  if (!cur) {
    return (
      <main className="kb-screen kb-screen-flow">
        <ScreenHeader title={t('adjust.title')} back={{ to: '/paiol', label: t('adjust.back') }} />
        <p className="kb-sub">{t('adjust.nothing')}</p>
      </main>
    );
  }
  const { g, l } = cur;
  const max = l.quantityRemaining;
  const adding = delta > 0;
  const left = round1(max + delta);
  const set = (d: number) => setDelta(Math.max(-max, round1(d)));
  const ok = delta !== 0 && left >= 0 && (!adding || reason === 'correction');

  const confirm = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      await adjustLot(l.id, delta, reason, notes.trim() || undefined);
      showToast(t('adjust.saved', { qty: fmtQty(Math.abs(delta), l.unit), reason: t(`adjustReasons.${reason}`).toLowerCase() }));
      navigate('/paiol');
    } catch {
      showToast(t('common.error'));
      setBusy(false);
    }
  };

  return (
    <main className="kb-screen kb-screen-flow">
      <ScreenHeader title={t('adjust.title')} back={{ to: '/paiol', label: t('adjust.back') }} />

      <button type="button" onClick={() => setPicking(true)} aria-haspopup="dialog"
        className="kb-card flex items-center gap-3 rounded-[18px] px-3.5 py-3 text-left text-ink">
        <CropArt crop={g.crop} categories={data.categories} className="h-11 w-[52px] rounded-xl" imgHeight={42} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{t('adjust.lotOf', { name: lotName(g), date: fmtDayMonth(l.harvestedAt) })}</span>
          <span className="text-sm font-medium" style={{ color: `var(--${l.life.tone})` }}>{lifeLabel(t, l.life)} · <span className="kb-mono text-ink">{fmtQty(max, l.unit)}</span></span>
        </span>
        <span className="text-sm text-canopy">{t('adjust.swap')}</span>
      </button>

      <section aria-label={t('adjust.howMuch')} className="kb-card flex flex-col items-center gap-3 rounded-[22px] p-[18px]">
        <div className="flex items-center gap-[18px]">
          <button type="button" className="kb-stepper" aria-label={t('adjust.less')} onClick={() => set(delta - 1)}><Icon name="minus" strokeWidth={2} /></button>
          <span className="kb-mono min-w-[120px] whitespace-nowrap text-center text-[44px] font-medium leading-[48px]" aria-live="polite" style={{ color: adding ? 'var(--canopy)' : 'var(--urucum)' }}>
            {delta > 0 ? '+' : delta < 0 ? '−' : ''}{fmtNum(Math.abs(delta))}<span className="text-[26px]"> {fmtUnit(l.unit, Math.abs(delta))}</span>
          </span>
          <button type="button" className="kb-stepper" aria-label={t('adjust.more')} onClick={() => set(delta + 1)}><Icon name="plus" strokeWidth={2} /></button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="kb-chip" onClick={() => set(-1)}>−1</button>
          <button type="button" className="kb-chip" onClick={() => set(-5)}>−5</button>
          <button type="button" className="kb-chip" onClick={() => set(-max)}>{t('adjust.all')}</button>
          <button type="button" className={`kb-chip ${adding ? 'kb-chip-on' : ''}`} aria-pressed={adding} onClick={() => { setDelta(Math.abs(delta) || 1); setReason('correction'); }}>{t('adjust.add')}</button>
        </div>
        <span className="text-[15px] text-ink-muted">{t('adjust.left')} <span className="kb-mono font-medium text-ink">{fmtQty(left, l.unit)}</span></span>
      </section>

      <div className="flex flex-col gap-2">
        <span className="kb-label">{t('adjust.what')}</span>
        <div role="radiogroup" aria-label={t('adjust.reason')} className="grid grid-cols-4 gap-2">
          {REASONS.map(r => {
            const on = reason === r.key;
            const disabled = adding && r.key !== 'correction';
            return (
              <button key={r.key} type="button" role="radio" aria-checked={on} aria-disabled={disabled}
                onClick={() => r.key === 'processing' ? navigate(`/processar?entrada=${g.crop.id}`) : !disabled && setReason(r.key)}
                className={`kb-pick min-h-[84px] ${on ? 'kb-pick-on' : ''} ${disabled ? 'opacity-50' : ''}`}>
                <Icon name={r.icon} />{t(`adjustReasons.${r.key}`)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <OptionalLabel t={t}>{t('adjust.note')}</OptionalLabel>
        <input type="text" className="kb-field" placeholder={t('adjust.notePlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} />
      </label>

      <div className="mt-auto flex flex-col gap-2.5">
        <span className="kb-sub text-center">{t('adjust.history')}</span>
        <button type="button" className={`kb-tap ${ok ? 'kb-tap-go' : 'kb-tap-off'}`} aria-disabled={!ok} onClick={confirm}>{t('adjust.confirm')}</button>
      </div>

      {picking && (
        <BottomSheet variant="modal" labelledBy="pick-t" onClose={() => setPicking(false)}>
          <h2 id="pick-t" className="kb-h2">{t('adjust.pick')}</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {lots.map(({ g: pg, l: pl }) => (
              <li key={pl.id}>
                <button type="button" onClick={() => { setLotId(pl.id); setDelta(-1); setPicking(false); }} aria-current={pl.id === lotId}
                  className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-3 py-2.5 text-left text-ink ${pl.id === lotId ? 'border-canopy bg-canopy-soft' : 'border-line bg-surface'}`}
                  data-autofocus={pl.id === lotId || undefined}>
                  <CropArt crop={pg.crop} categories={data.categories} className="h-10 w-12 rounded-[10px]" imgHeight={38} fontSize={18} />
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium">{lotName(pg)} · {fmtDayMonth(pl.harvestedAt)}</span>
                    <span className="text-[13px] font-medium" style={{ color: `var(--${pl.life.tone})` }}>{lifeLabel(t, pl.life)}</span>
                  </span>
                  <span className="kb-mono text-sm">{fmtQty(pl.quantityRemaining, pl.unit)}</span>
                </button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}
    </main>
  );
}

const lotName = (g: StockGroup) => (g.cultivar ? `${g.crop.name} ${g.cultivar.name}` : g.crop.name);
