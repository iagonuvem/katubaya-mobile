/**
 * Colher: log any production in three taps (what, how much, quick details).
 * `?talhao=` presets the plot, `?produto=` the product, `?lote=` an animal lot (milking, eggs),
 * which skips to the quantity and uses the animal-production details step.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { dailyCropFor, derivedOf, indexById, penZoneIds, plotZones, type FarmData } from '@/domain/rules/farm';
import type { AnimalGroup, Crop, Observation, UnitType } from '@/domain/contracts/types';
import { logProduction } from '@/data/actions';
import { Icon } from '@/components/game/Icon';
import { CropArt, DoneBanner, Loading, OptionalLabel, WhenRow } from '@/components/game/bits';
import { cropArt, cropDot, ART_INK } from '@/components/game/crop';
import { cropSprite } from '@/components/game/Shell';
import { showToast } from '@/components/game/toast';
import { fmtDayMonth, fmtDdMm, fmtNum, fmtQty, fmtUnit, parseNum } from '@/lib/format';

const UNITS: UnitType[] = ['kg', 'liter', 'dozen', 'unit', 'bunch', 'box', 'bag'];

type SignalKey = 'pollinators' | 'pestLow' | 'pestHigh' | 'soilDry' | 'soilWet' | 'flowering';
const SIGNALS: SignalKey[] = ['pollinators', 'pestLow', 'pestHigh', 'soilDry', 'soilWet', 'flowering'];
const EXCLUSIVE: Partial<Record<SignalKey, SignalKey>> = { pestLow: 'pestHigh', pestHigh: 'pestLow', soilDry: 'soilWet', soilWet: 'soilDry' };

function signalsToObservation(sig: Set<SignalKey>): Partial<Observation> {
  const o: Partial<Observation> = {};
  if (sig.has('pollinators')) o.pollinators = 2;
  if (sig.has('pestLow')) o.pest = 0;
  if (sig.has('pestHigh')) o.pest = 2;
  if (sig.has('soilDry')) o.soil = 0;
  if (sig.has('soilWet')) o.soil = 1;
  if (sig.has('flowering')) o.phase = 'flowering';
  return o;
}

export default function HarvestPage() {
  const data = useFarm();
  const now = useNow();
  if (!data) return <Loading />;
  return <Wizard data={data} now={now} />;
}

function Wizard({ data, now }: { data: FarmData; now: Date }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const crops = useMemo(() => indexById(data.crops), [data.crops]);
  const lotParam = data.animalGroups.find(g => g.id === params.get('lote'));
  const zoneParam = params.get('talhao') ?? undefined;
  const presetCrop = crops.get(params.get('produto') ?? '') ?? (lotParam ? dailyCropFor(lotParam.species, data.crops) : undefined);
  const fromLot = !!lotParam && !!presetCrop;

  const [step, setStep] = useState(presetCrop ? 2 : 1);
  const [q, setQ] = useState('');
  const [cropId, setCropId] = useState<string | undefined>(presetCrop?.id);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<UnitType>(presetCrop?.defaultUnit ?? 'kg');
  const [zoneId, setZoneId] = useState<string | undefined>(zoneParam ?? lotParam?.zoneId);
  const [lotId, setLotId] = useState<string | undefined>(lotParam?.id);
  const [cultivarId, setCultivarId] = useState<string | undefined>();
  const [when, setWhen] = useState(() => new Date());
  const [shelf, setShelf] = useState<number | undefined>();
  const [sig, setSig] = useState<Set<SignalKey>>(new Set());
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState<{ crop: Crop; qty: number; unit: UnitType; zone?: string; lot?: AnimalGroup; expires: Date; days: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const crop = cropId ? crops.get(cropId) : undefined;
  const isAnimal = !!crop?.species;
  const num = parseNum(qty);
  const plots = plotZones(data);
  const pens = data.zones.filter(z => penZoneIds(data.animalGroups).has(z.id));
  const lotsForCrop = crop?.species ? data.animalGroups.filter(g => g.species === crop.species && g.headcount > 0) : [];
  const effectiveLot = lotId === 'none' ? undefined : (lotId ? data.animalGroups.find(g => g.id === lotId) : lotsForCrop.length === 1 ? lotsForCrop[0] : undefined);
  const cultivars = crop ? data.cultivars.filter(c => c.cropId === crop.id) : [];
  const needShelf = !!crop && !crop.shelfLifeDaysDefault;

  const pickCrop = (c: Crop) => {
    setCropId(c.id);
    setUnit(c.defaultUnit);
    setQty('');
    setShelf(undefined);
    setLotId(undefined);
    setStep(2);
    const planted = data.plantings.find(p => p.cropId === c.id && !p.endedAt && (!zoneParam || p.zoneId === zoneParam));
    setCultivarId(planted?.cultivarId);
    if (c.species) {
      const only = data.animalGroups.filter(g => g.species === c.species && g.headcount > 0);
      setZoneId(only.length === 1 ? only[0].zoneId : undefined);
    } else {
      setZoneId(zoneParam ?? planted?.zoneId);
    }
  };

  const save = async () => {
    if (!crop || num <= 0 || (needShelf && !shelf) || busy) return;
    setBusy(true);
    try {
      const zone = zoneId ?? (isAnimal ? effectiveLot?.zoneId : undefined);
      await logProduction({
        cropId: crop.id, cultivarId, zoneId: zone, quantity: num, unit, harvestedAt: when.toISOString(), notes: notes.trim() || undefined,
        animalGroupId: isAnimal ? effectiveLot?.id : undefined, shelfDays: needShelf ? shelf : undefined,
        signals: !isAnimal && zone ? signalsToObservation(sig) : undefined,
      });
      const days = (cultivars.find(c => c.id === cultivarId)?.shelfLifeDaysOverride ?? crop.shelfLifeDaysDefault) || shelf || 0;
      const expires = new Date(when);
      expires.setDate(expires.getDate() + days);
      setSaved({ crop, qty: num, unit, zone: data.zones.find(z => z.id === zone)?.name, lot: isAnimal ? effectiveLot : undefined, expires, days });
      setStep(4);
    } catch {
      showToast(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const again = () => {
    setStep(1); setCropId(undefined); setQty(''); setQ(''); setSig(new Set()); setShelf(undefined); setLotId(undefined);
    setZoneId(zoneParam); setNotes(''); setWhen(new Date()); setSaved(null);
  };

  const titles = { 1: t('harvest.title1'), 2: t('harvest.title2'), 3: fromLot ? t('harvest.titleAnimal') : t('harvest.title3'), 4: fromLot ? t('harvest.titleAnimal') : t('harvest.title4') };
  const shownStep = Math.min(step, 3);
  const doneMode = step === 4;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <header className="flex flex-none flex-col gap-3 px-4 pb-2" style={{ paddingTop: 'calc(16px + var(--safe-area-top))' }}>
        <div className="flex items-center gap-3">
          {(step === 2 && !presetCrop) || step === 3
            ? <button type="button" onClick={() => setStep(step - 1)} aria-label={t('common.back')} className="kb-icon-btn"><Icon name="back" size={22} /></button>
            : <Link to={lotParam ? `/animais/${lotParam.id}` : '/'} aria-label={t('common.close')} className="kb-icon-btn"><Icon name="close" size={22} /></Link>}
          <div className="grid flex-1 grid-cols-3 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={shownStep} aria-label={t('harvest.progress', { step: shownStep })}>
            {[1, 2, 3].map(i => (
              <span key={i} className="h-2 rounded-full transition-colors duration-300" style={{ background: i <= shownStep || doneMode ? 'var(--canopy)' : 'var(--surface-sunken)' }} />
            ))}
          </div>
          <span className="kb-mono min-w-8 text-right text-sm text-ink-muted">{step < 4 || fromLot ? `${shownStep}/3` : ''}</span>
        </div>
        <h1 className="kb-title">{titles[step as 1 | 2 | 3 | 4]}</h1>
      </header>

      {step === 1 && <StepWhat data={data} q={q} setQ={setQ} pick={pickCrop} zoneParam={zoneParam} />}

      {step === 2 && crop && (
        <div key="s2" className="kb-step-in flex min-h-0 flex-1 flex-col gap-3.5 px-4 pb-5 pt-1">
          <div className="kb-card flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-2.5"><span className="kb-dot" style={{ background: cropDot(crop, data.categories) }} /><span className="font-medium">{crop.name}</span></div>
            <div className="flex items-baseline gap-1.5" aria-live="polite">
              <span className="kb-mono text-[40px] font-medium leading-[44px]">{qty || '0'}</span>
              <span className="text-lg text-ink-muted">{fmtUnit(unit, num || 2)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('harvest.unit')}>
            {UNITS.map(u => (
              <button key={u} type="button" role="radio" aria-checked={unit === u} className={`kb-chip ${unit === u ? 'kb-chip-on' : ''}`} onClick={() => setUnit(u)}>{fmtUnit(u, 1)}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(unit === 'liter' ? [1, 5, 10] : [0.5, 1, 5]).map(v => (
              <button key={v} type="button" className="kb-chip justify-center border-transparent bg-amber-soft font-medium" onClick={() => setQty(fmtNum(num + v).replace(/\./g, ''))}>+{fmtNum(v)}</button>
            ))}
          </div>
          <Keypad value={qty} onChange={setQty} />
          <div className="mt-auto">
            <button type="button" className={`kb-tap ${num > 0 ? 'kb-tap-go' : 'kb-tap-off'}`} aria-disabled={num <= 0} onClick={() => num > 0 && setStep(3)}>{t('harvest.continue')}</button>
          </div>
        </div>
      )}

      {step === 3 && crop && fromLot && (
        <div key="s3a" className="kb-step-in flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-5 pt-1">
          <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2.5 rounded-2xl border-0 bg-river-soft px-3.5 py-3 text-left text-ink">
            <span className="kb-dot" style={{ background: 'var(--river)' }} />
            <span className="flex-1 font-medium">{crop.name} · <span className="kb-mono">{fmtQty(num, unit)}</span></span>
            <span className="text-sm text-canopy">{t('common.change')}</span>
          </button>
          <div className="flex flex-col gap-2">
            <span className="kb-label">{t('harvest.animalLot')}</span>
            <div role="radiogroup" aria-label={t('harvest.animalLot')} className="flex flex-col gap-2">
              {[...lotsForCrop, null].map(g => {
                const on = g ? effectiveLot?.id === g.id : lotId === 'none';
                return (
                  <button key={g?.id ?? 'none'} type="button" role="radio" aria-checked={on}
                    onClick={() => { setLotId(g?.id ?? 'none'); if (g) setZoneId(g.zoneId); }}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-2.5 text-left text-ink ${on ? 'border-canopy bg-canopy-soft' : 'border-line bg-surface-raised'}`}>
                    <span className="flex flex-1 flex-col">
                      <span className="font-medium">{g ? g.name : t('harvest.noLot')}</span>
                      <span className="text-[13px] text-ink-muted">
                        {g ? [t(`species.${g.species}`), t('common.heads', { count: g.headcount }), data.zones.find(z => z.id === g.zoneId)?.name].filter(Boolean).join(' · ') : t('harvest.noLotHint')}
                      </span>
                    </span>
                    {on && <Icon name="check" size={22} strokeWidth={2.2} style={{ color: 'var(--canopy)' }} />}
                  </button>
                );
              })}
            </div>
            <span className="kb-hint">{lotsForCrop.length === 1 && !lotId ? t('harvest.onlyLot', { species: t(`species.${crop.species}`).toLowerCase() }) : t('harvest.lotOptional')}</span>
          </div>
          <ZoneChips label={t('harvest.zoneOrPasture')} zones={[...pens, ...plots]} value={zoneId} onChange={setZoneId} t={t} />
          <WhenRow label={t('harvest.date')} value={when} onChange={setWhen} t={t} />
          {needShelf && <ShelfAsk crop={crop} shelf={shelf} setShelf={setShelf} />}
          <label className="flex flex-col gap-1.5">
            <OptionalLabel t={t}>{t('common.notes')}</OptionalLabel>
            <input type="text" className="kb-field" placeholder={t('common.notesPlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
          <div className="mt-auto flex flex-col gap-2">
            <span className="kb-sub text-center">{t('harvest.becomesLot', { count: crop.shelfLifeDaysDefault || shelf || 0, date: fmtDdMm(addDays(when, crop.shelfLifeDaysDefault || shelf || 0)) })}</span>
            <button type="button" className={`kb-tap ${!needShelf || shelf ? 'kb-tap-go' : 'kb-tap-off'}`} onClick={save} aria-disabled={needShelf && !shelf}>{t('harvest.done')}</button>
          </div>
        </div>
      )}

      {step === 3 && crop && !fromLot && (
        <div key="s3" className="kb-step-in flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-4 pb-5 pt-1">
          <div className="flex items-center gap-2.5 rounded-2xl bg-canopy-soft px-3.5 py-3 font-medium text-canopy">
            <span className="kb-dot" style={{ background: cropDot(crop, data.categories) }} />{crop.name} · <span className="kb-mono">{fmtQty(num, unit)}</span>
          </div>
          {isAnimal && (
            <div className="flex flex-col gap-2">
              <span className="kb-label">{t('harvest.animalLot')}</span>
              <div role="radiogroup" aria-label={t('harvest.animalLot')} className="flex flex-wrap gap-2">
                {[...lotsForCrop, null].map(g => {
                  const on = g ? effectiveLot?.id === g.id : !effectiveLot;
                  return (
                    <button key={g?.id ?? 'none'} type="button" role="radio" aria-checked={on} className={`kb-chip ${on ? 'kb-chip-on' : ''}`}
                      onClick={() => { setLotId(g?.id ?? 'none'); setZoneId(g?.zoneId); }}>
                      {g ? `${g.name} · ${g.headcount}` : t('harvest.noLot')}
                    </button>
                  );
                })}
              </div>
              <span className="kb-hint">
                {crop.animalYield === 'slaughter' ? t('harvest.slaughterHint') : lotsForCrop.length === 1 && !lotId ? t('harvest.onlyLot', { species: t(`species.${crop.species}`).toLowerCase() }) : t('harvest.lotOptional')}
              </span>
            </div>
          )}
          <ZoneChips label={isAnimal ? t('harvest.zoneOrPasture') : t('harvest.where')} zones={isAnimal ? pens : plots} value={zoneId} onChange={setZoneId} t={t} />
          {cultivars.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="kb-label">{t('harvest.variety')}</span>
              <div role="radiogroup" aria-label={t('harvest.variety')} className="flex flex-wrap gap-2">
                {[...cultivars, null].map(c => (
                  <button key={c?.id ?? 'none'} type="button" role="radio" aria-checked={cultivarId === c?.id} className={`kb-chip ${cultivarId === c?.id ? 'kb-chip-on' : ''}`} onClick={() => setCultivarId(c?.id)}>
                    {c ? c.name : t('harvest.anyVariety')}
                  </button>
                ))}
              </div>
            </div>
          )}
          <WhenRow label={t('harvest.when')} value={when} onChange={setWhen} t={t} />
          {needShelf && <ShelfAsk crop={crop} shelf={shelf} setShelf={setShelf} />}
          {!isAnimal && (
            <div className="flex flex-col gap-2">
              <OptionalLabel t={t}>{t('harvest.signals')}</OptionalLabel>
              <div className="flex flex-wrap gap-2">
                {SIGNALS.map(s => (
                  <button key={s} type="button" aria-pressed={sig.has(s)} className={`kb-chip ${sig.has(s) ? 'kb-chip-on' : ''}`}
                    onClick={() => setSig(cur => {
                      const next = new Set(cur);
                      if (next.has(s)) next.delete(s); else { next.add(s); if (EXCLUSIVE[s]) next.delete(EXCLUSIVE[s]!); }
                      return next;
                    })}>{t(`harvest.signal.${s}`)}</button>
                ))}
              </div>
              {sig.size > 0 && !zoneId && <span className="kb-hint">{t('harvest.signalsNeedZone')}</span>}
            </div>
          )}
          <label className="flex flex-col gap-2">
            <OptionalLabel t={t}>{t('common.notes')}</OptionalLabel>
            <textarea rows={2} className="kb-field" placeholder={t('common.notesPlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
          <div className="mt-auto">
            <button type="button" className={`kb-tap ${!needShelf || shelf ? 'kb-tap-go' : 'kb-tap-off'}`} onClick={save} aria-disabled={needShelf && !shelf}>{t('harvest.save')}</button>
          </div>
        </div>
      )}

      {step === 4 && saved && fromLot && (
        <div className="kb-pop flex flex-1 flex-col gap-3.5 px-4 pb-5">
          <DoneBanner>{t('harvest.doneAnimal', { qty: fmtQty(saved.qty, saved.unit), name: saved.crop.name })}</DoneBanner>
          <div className="kb-card flex flex-col gap-1 rounded-2xl p-3.5">
            <span className="font-medium">{saved.lot ? t('harvest.linkedTo', { name: saved.lot.name, zone: saved.zone ?? t('common.noZone') }) : t('harvest.unlinked', { zone: saved.zone ?? t('common.noZone') })}</span>
            <span className="kb-sub">{t('harvest.mapEffect')}</span>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2.5">
            {derivedOf(saved.crop.id, data.crops).length > 0
              ? <Link to={`/processar?entrada=${saved.crop.id}`} className="kb-tap kb-tap-alt">{t('harvest.processThis', { name: saved.crop.name })}</Link>
              : <button type="button" className="kb-tap kb-tap-alt" onClick={again}>{t('harvest.again')}</button>}
            <Link to="/" className="kb-tap kb-tap-go">{t('harvest.backToFarm')}</Link>
          </div>
        </div>
      )}

      {step === 4 && saved && !fromLot && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-5">
          <div className="relative flex h-[300px] items-end justify-center overflow-hidden rounded-[28px] bg-canopy-soft">
            <svg aria-hidden="true" width="358" height="300" viewBox="0 0 358 300" className="absolute left-1/2 top-0 -translate-x-1/2">
              <g fill="#2d5a28" opacity=".18"><circle cx="40" cy="50" r="6" /><circle cx="310" cy="70" r="8" /><circle cx="290" cy="30" r="4" /><circle cx="70" cy="110" r="4" /></g>
              <g fill="#d79a2b" className="kb-pop"><rect x="60" y="40" width="10" height="10" rx="2" transform="rotate(20 65 45)" /><rect x="280" y="100" width="9" height="9" rx="2" transform="rotate(-15 284 104)" /><rect x="250" y="40" width="8" height="8" rx="2" /></g>
              <g fill="#a3321c" className="kb-pop"><rect x="100" y="70" width="8" height="8" rx="2" transform="rotate(35 104 74)" /><rect x="300" y="160" width="8" height="8" rx="2" /></g>
            </svg>
            {cropSprite(saved.crop.name)
              ? <img className="kb-drop relative mb-10 h-[190px] w-auto" src={cropSprite(saved.crop.name)} alt={t('harvest.crateAlt')} />
              : <span className="kb-drop relative mb-[70px] flex h-[140px] w-[140px] items-center justify-center rounded-[32px] text-[64px] font-medium"
                  style={{ background: cropArt(saved.crop, data.categories), color: ART_INK, boxShadow: '0 6px 0 rgba(30,35,22,.15)' }}>{saved.crop.name.charAt(0)}</span>}
          </div>
          <div className="flex flex-col gap-1" role="status">
            <span className="text-[26px] font-medium leading-8">{t('harvest.registered')} <span className="kb-mono">{fmtQty(saved.qty, saved.unit)}</span> {saved.crop.name}</span>
            <span className="text-ink-muted">{t('harvest.doneMeta', { zone: saved.zone ?? t('common.noZone'), date: fmtDayMonth(saved.expires), count: saved.days })}</span>
          </div>
          <div className="kb-card flex items-center gap-3 rounded-2xl px-3.5 py-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-canopy text-canopy-on"><Icon name="check" size={18} strokeWidth={2.2} /></span>
            <span className="flex flex-col">
              <span className="font-medium">{saved.crop.species ? t('harvest.linkedLot', { name: saved.lot?.name ?? t('harvest.noLotShort') }) : t('harvest.ritualDone')}</span>
              <span className="kb-sub">{t('harvest.feiraStale')}</span>
            </span>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2.5">
            <button type="button" className="kb-tap kb-tap-alt" onClick={again}>{t('harvest.again')}</button>
            <button type="button" className="kb-tap kb-tap-go" onClick={() => navigate('/')}>{t('harvest.backToFarm')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function StepWhat({ data, q, setQ, pick, zoneParam }: { data: FarmData; q: string; setQ: (s: string) => void; pick: (c: Crop) => void; zoneParam?: string }) {
  const { t } = useTranslation();
  const query = q.trim().toLowerCase();
  const sellable = data.crops.filter(c => !(c.isForage && c.layer === 'pasto'));
  const all = sellable.filter(c => !query || c.name.toLowerCase().includes(query));
  const lastByCrop = new Map<string, string>();
  for (const h of data.harvests) if ((lastByCrop.get(h.cropId) ?? '') < h.harvestedAt) lastByCrop.set(h.cropId, h.harvestedAt);
  const zone = data.zones.find(z => z.id === zoneParam);
  const inZone = zone ? data.plantings.filter(p => p.zoneId === zone.id && !p.endedAt).map(p => data.crops.find(c => c.id === p.cropId)!).filter(c => c && !c.isForage) : [];
  const recents = inZone.length ? inZone : [...sellable].filter(c => lastByCrop.has(c.id) || c.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt ?? lastByCrop.get(b.id) ?? '').localeCompare(a.lastUsedAt ?? lastByCrop.get(a.id) ?? '')).slice(0, 5);
  const favs = sellable.filter(c => c.isFavorite);
  const animal = all.filter(c => c.species);
  const roca = all.filter(c => !c.species);
  const dot = (c: Crop) => <span className="kb-dot" style={{ background: cropDot(c, data.categories) }} />;
  return (
    <div key="s1" className="kb-step-in flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-1">
      <label className="flex min-h-[52px] items-center gap-2.5 rounded-2xl border-[1.5px] border-line-strong bg-surface-raised px-3.5">
        <Icon name="search" size={20} />
        <span className="sr-only">{t('harvest.search')}</span>
        <input type="search" enterKeyHint="search" placeholder={t('harvest.searchPlaceholder')} value={q} onChange={e => setQ(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-base text-ink outline-none" />
      </label>
      {!query && recents.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="kb-sub">{zone && inZone.length ? t('harvest.inPlot', { name: zone.name }) : t('harvest.recent')}</span>
          <div className="flex flex-wrap gap-2">{recents.map(c => <button key={c.id} type="button" className="kb-chip" onClick={() => pick(c)}>{dot(c)}{c.name}</button>)}</div>
        </div>
      )}
      {!query && favs.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="kb-sub">{t('harvest.favorites')}</span>
          <div className="grid grid-cols-3 gap-2.5">
            {favs.map(c => (
              <button key={c.id} type="button" onClick={() => pick(c)}
                className="flex flex-col items-start gap-1 rounded-[18px] border-[1.5px] border-line bg-surface-raised p-2.5 text-left text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
                style={{ boxShadow: '0 3px 0 var(--line)' }}>
                <CropArt crop={c} categories={data.categories} className="h-16 w-full rounded-xl" imgHeight={58} fontSize={30} />
                <span className="text-[15px] font-medium leading-5">{c.name}</span>
                <span className="text-xs leading-4 text-ink-muted">{fmtUnit(c.defaultUnit, 1)} · {c.shelfLifeDaysDefault ? t('common.days', { count: c.shelfLifeDaysDefault }) : t('harvest.noShelf')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {animal.length > 0 && (
          <>
            <span className="kb-sub">{t('harvest.fromAnimals')}</span>
            <div className="grid grid-cols-2 gap-2">{animal.map(c => <button key={c.id} type="button" className="kb-chip min-h-12 justify-start rounded-[14px]" onClick={() => pick(c)}>{dot(c)}<span className="truncate">{c.name}</span></button>)}</div>
          </>
        )}
        {roca.length > 0 && (
          <>
            <span className="kb-sub mt-1.5">{t('harvest.fromField')}</span>
            <div className="grid grid-cols-2 gap-2">{roca.map(c => <button key={c.id} type="button" className="kb-chip min-h-12 justify-start rounded-[14px]" onClick={() => pick(c)}>{dot(c)}<span className="truncate">{c.name}</span></button>)}</div>
          </>
        )}
        {all.length === 0 && <p className="m-0 text-ink-muted">{t('harvest.noneFound')} <Link to="/produtos/nova">{t('harvest.newCard')}</Link></p>}
      </div>
    </div>
  );
}

function Keypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t, i18n } = useTranslation();
  const dec = i18n.language === 'en' ? '.' : ',';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', dec, '0', 'del'];
  const press = (k: string) => {
    let cur = value;
    if (k === 'del') cur = cur.slice(0, -1);
    else if (k === dec) { if (!cur.includes(dec)) cur = (cur || '0') + dec; }
    else if (cur.length < 6) cur = cur === '0' ? k : cur + k;
    onChange(cur);
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map(k => (
        <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'del' ? t('harvest.erase') : k === dec ? t('harvest.decimal') : k}
          className="min-h-14 rounded-[14px] border border-line bg-surface-raised text-2xl font-medium text-ink transition-transform active:translate-y-0.5"
          style={{ boxShadow: '0 3px 0 var(--line)' }}>
          {k === 'del' ? '⌫' : k}
        </button>
      ))}
    </div>
  );
}

function ZoneChips({ label, zones, value, onChange, t }: { label: string; zones: { id: string; name: string }[]; value?: string; onChange: (v?: string) => void; t: (k: string) => string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="kb-label">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {[...zones, { id: '', name: t('common.noZone') }].map(z => {
          const on = (value ?? '') === z.id;
          return <button key={z.id || 'none'} type="button" role="radio" aria-checked={on} className={`kb-chip ${on ? 'kb-chip-on' : ''}`} onClick={() => onChange(z.id || undefined)}>{z.name}</button>;
        })}
      </div>
    </div>
  );
}

function ShelfAsk({ crop, shelf, setShelf }: { crop: Crop; shelf?: number; setShelf: (n: number) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-amber-soft p-3.5">
      <span className="text-[15px] leading-[22px]">{t('harvest.shelfAsk', { name: crop.name })}</span>
      <div role="radiogroup" aria-label={t('harvest.shelfLabel')} className="flex gap-2">
        {[7, 14, 30].map(d => (
          <button key={d} type="button" role="radio" aria-checked={shelf === d} className={`kb-chip ${shelf === d ? 'kb-chip-on' : ''}`} onClick={() => setShelf(d)}>{t('common.days', { count: d })}</button>
        ))}
      </div>
    </div>
  );
}

