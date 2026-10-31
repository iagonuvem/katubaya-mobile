/**
 * Carta: one product card with its varieties, role in the agroforest and notes.
 * /produtos/nova creates a card; "Editar carta" turns the card into a form in place.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { stockGroups, type FarmData } from '@/domain/rules/farm';
import type { AnimalYield, Crop, Layer, Species, UnitType } from '@/domain/contracts/types';
import { addCultivar, createCrop, deleteCrop, deleteCultivar, toggleFavorite, updateCrop } from '@/data/actions';
import { BottomSheet, ScreenHeader } from '@/components/game/Shell';
import { Icon } from '@/components/game/Icon';
import { CropArt, Loading, OptionalLabel } from '@/components/game/bits';
import { cropDot } from '@/components/game/crop';
import { showToast } from '@/components/game/toast';
import { fmtMoney, fmtMonthYear, fmtNum, fmtQty, fmtUnit, parseNum } from '@/lib/format';

const UNITS: UnitType[] = ['kg', 'g', 'unit', 'bunch', 'dozen', 'liter', 'ml', 'box', 'bag'];
const LAYERS: Layer[] = ['emergente', 'alto', 'medio', 'baixo', 'rasteiro', 'pasto'];
const SPECIES: Species[] = ['cattle', 'poultry', 'swine', 'goat', 'sheep', 'bees', 'fish', 'other'];

export default function CardPage() {
  const { id } = useParams();
  const data = useFarm();
  const now = useNow();
  if (!data) return <Loading />;
  const crop = data.crops.find(c => c.id === id);
  if (!id) return <CardForm data={data} />;
  if (!crop) return <Missing />;
  return <CardView key={crop.id} data={data} crop={crop} now={now} />;
}

function Missing() {
  const { t } = useTranslation();
  return <main className="kb-screen kb-screen-flow"><ScreenHeader title={t('card.missing')} back={{ to: '/produtos', label: t('card.back') }} /></main>;
}

function CardView({ data, crop, now }: { data: FarmData; crop: Crop; now: Date }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [tag, setTag] = useState<string | null>(null);
  const [varName, setVarName] = useState('');
  const [varShelf, setVarShelf] = useState('');
  if (editing) return <CardForm data={data} crop={crop} onDone={() => setEditing(false)} />;

  const cat = data.categories.find(c => c.id === crop.categoryId);
  const vars = data.cultivars.filter(v => v.cropId === crop.id);
  const harvests = data.harvests.filter(h => h.cropId === crop.id).sort((a, b) => a.harvestedAt.localeCompare(b.harvestedAt));
  const stock = stockGroups(data, now).filter(g => g.crop.id === crop.id).reduce((s, g) => s + g.total, 0);
  const sub = harvests.length
    ? `${t('card.produced', { count: harvests.length, since: fmtMonthYear(harvests[0].harvestedAt) })} · ${t('card.inStock', { qty: fmtQty(stock, crop.defaultUnit) })}`
    : t('card.never');
  const dot = cropDot(crop, data.categories);

  const addTag = async () => {
    const v = tag?.trim();
    if (v) await updateCrop(crop.id, { guildTags: [...(crop.guildTags ?? []), v] });
    setTag(null);
  };
  const addVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varName.trim()) return;
    await addCultivar(crop.id, varName, varShelf ? Math.round(parseNum(varShelf)) || undefined : undefined);
    setVarName(''); setVarShelf('');
    showToast(t('card.varAdded'));
  };
  const remove = async () => {
    await deleteCrop(crop.id);
    showToast(t('card.deleted', { name: crop.name }));
    navigate('/produtos');
  };

  return (
    <main className="kb-screen kb-screen-flow">
      <header className="flex items-center gap-3">
        <Link to="/produtos" aria-label={t('card.back')} className="kb-icon-btn"><Icon name="back" size={22} /></Link>
        <span className="flex-1 text-ink-muted">{t('card.eyebrow')}</span>
        <button type="button" onClick={() => toggleFavorite(crop.id)} aria-pressed={crop.isFavorite} aria-label={crop.isFavorite ? t('card.unfav') : t('card.fav')}
          className="kb-icon-btn" style={crop.isFavorite ? { background: 'var(--amber-soft)', color: '#b8860b' } : undefined}>
          <Icon name="star" size={22} fill={crop.isFavorite} />
        </button>
      </header>

      <section className="flex flex-col gap-3 rounded-[26px] bg-surface-raised px-2.5 pb-4 pt-2.5"
        style={{ border: `2px solid ${crop.isFavorite ? '#d79a2b' : 'var(--line)'}`, boxShadow: `0 6px 0 ${crop.isFavorite ? '#e6cf98' : 'var(--line)'}` }}>
        <div className="relative flex h-[180px] items-center justify-center overflow-hidden rounded-[18px]">
          <CropArt crop={crop} categories={data.categories} className="absolute inset-0" imgHeight={160} fontSize={72} />
          {cat && <span className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium" style={{ background: 'rgba(250,248,242,.85)', color: '#1e2316' }}>{cat.name}</span>}
        </div>
        <div className="flex flex-col gap-0.5 px-1.5">
          <h1 className="m-0 text-[30px] font-medium leading-9">{crop.name}</h1>
          <span className="kb-sub">{sub}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 px-1.5">
          <div className="kb-stat"><span>{t('card.unit')}</span><b>{fmtUnit(crop.defaultUnit, 1)}</b></div>
          <div className="kb-stat"><span>{t('card.shelf')}</span><b style={crop.shelfLifeDaysDefault ? undefined : { color: 'var(--amber)' }}>{crop.shelfLifeDaysDefault ? t('common.days', { count: crop.shelfLifeDaysDefault }) : t('card.missingShelf')}</b></div>
          <div className="kb-stat"><span>{t('card.price')}</span><b>{crop.pricePerUnit ? fmtMoney(crop.pricePerUnit) : '—'}</b></div>
        </div>
        {!crop.species && (
          <div className="flex flex-col gap-2 px-1.5">
            <span className="text-sm font-medium">{t('card.guild')}</span>
            <div className="flex flex-wrap gap-1.5">
              {(crop.guildTags ?? []).map(g => <span key={g} className="inline-flex min-h-8 items-center rounded-full bg-canopy-soft px-3 text-sm font-medium text-canopy">{g}</span>)}
              {tag === null
                ? <button type="button" className="inline-flex min-h-8 items-center rounded-full border-[1.5px] border-dashed border-line-strong bg-transparent px-3 text-sm text-ink-muted" onClick={() => setTag('')}>{t('card.addGuild')}</button>
                : <input autoFocus className="kb-field !min-h-9 !w-44 !rounded-full !text-sm" aria-label={t('card.guildLabel')} value={tag} onChange={e => setTag(e.target.value)}
                    onBlur={addTag} onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') setTag(null); }} placeholder={t('card.guildPlaceholder')} />}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="kb-h2">{t('card.varieties')}</h2>
          <span className="kb-sub">{t('card.varCount', { count: vars.length })}</span>
        </div>
        {vars.map(v => (
          <div key={v.id} className="kb-card flex items-center gap-3 rounded-2xl py-1.5 pl-3.5 pr-1.5">
            <span className="kb-dot" style={{ background: dot }} />
            <span className="flex-1 font-medium">{v.name}</span>
            <span className="kb-sub">{v.shelfLifeDaysOverride ? t('card.varShelf', { count: v.shelfLifeDaysOverride }) : t('card.varShelfDefault')}</span>
            <button type="button" className="kb-icon-btn !border-0 !bg-transparent" aria-label={t('card.removeVar', { name: v.name })} onClick={() => deleteCultivar(v.id)}><Icon name="close" size={18} /></button>
          </div>
        ))}
        <form onSubmit={addVar} className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line-strong p-3.5">
          <span className="font-medium">{t('card.newVar')}</span>
          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
            <label className="flex flex-col gap-1 text-[13px] text-ink-muted">{t('card.varName')}
              <input className="kb-field !min-h-12 !rounded-xl" type="text" placeholder={t('card.varNamePlaceholder')} value={varName} onChange={e => setVarName(e.target.value)} /></label>
            <label className="flex flex-col gap-1 text-[13px] text-ink-muted">{t('card.shelf')}
              <input className="kb-field !min-h-12 !rounded-xl" type="text" inputMode="numeric" placeholder={t('card.daysPlaceholder')} value={varShelf} onChange={e => setVarShelf(e.target.value)} /></label>
          </div>
          <button type="submit" className="kb-tap kb-tap-go kb-tap-md" aria-disabled={!varName.trim()}>{t('card.addVar')}</button>
        </form>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="kb-h2">{t('common.notes')}</h2>
        <p className="kb-card m-0 rounded-[14px] px-3.5 py-3 text-ink-muted">{crop.notes || t('card.noNotes')}</p>
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className="kb-tap kb-tap-alt kb-tap-md min-h-[52px]" onClick={() => setEditing(true)}>{t('card.edit')}</button>
        <button type="button" className="kb-tap kb-tap-danger kb-tap-md min-h-[52px]" onClick={() => setConfirm(true)}>{t('common.delete')}</button>
      </div>

      {confirm && (
        <BottomSheet variant="modal" labelledBy="del-t" onClose={() => setConfirm(false)}>
          <h2 id="del-t" className="kb-h2">{t('card.deleteTitle', { name: crop.name })}</h2>
          {harvests.length
            ? <p className="m-0 text-ink-muted">{t('card.deleteBlocked')}</p>
            : <p className="m-0 text-ink-muted">{t('card.deleteText')}</p>}
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" className="kb-tap kb-tap-alt kb-tap-md" onClick={() => setConfirm(false)} data-autofocus>{t('common.cancel')}</button>
            {!harvests.length && <button type="button" className="kb-tap kb-tap-md" style={{ background: 'var(--urucum)', color: 'var(--on-urucum)' }} onClick={remove}>{t('common.delete')}</button>}
          </div>
        </BottomSheet>
      )}
    </main>
  );
}

function CardForm({ data, crop, onDone }: { data: FarmData; crop?: Crop; onDone?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [f, setF] = useState({
    name: crop?.name ?? '',
    categoryId: crop?.categoryId ?? data.categories[0]?.id ?? '',
    unit: crop?.defaultUnit ?? ('kg' as UnitType),
    shelf: crop?.shelfLifeDaysDefault ? String(crop.shelfLifeDaysDefault) : '',
    price: crop?.pricePerUnit ? fmtNum(crop.pricePerUnit, 2) : '',
    layer: crop?.layer,
    cycle: crop?.cycleDays ? String(crop.cycleDays) : '',
    species: crop?.species,
    yieldKind: crop?.animalYield,
    from: crop?.derivedFromCropId,
    notes: crop?.notes ?? '',
  });
  const [tried, setTried] = useState(false);
  const cat = data.categories.find(c => c.id === f.categoryId);
  const animal = cat?.type === 'animal';
  const nameBad = tried && !f.name.trim();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(cur => ({ ...cur, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) { setTried(true); return; }
    const payload: Partial<Crop> = {
      name: f.name.trim(), categoryId: f.categoryId, defaultUnit: f.unit, shelfLifeDaysDefault: Math.round(parseNum(f.shelf)) || 0,
      pricePerUnit: parseNum(f.price) || undefined, notes: f.notes.trim() || undefined,
      layer: animal ? undefined : f.layer, cycleDays: animal ? undefined : Math.round(parseNum(f.cycle)) || undefined,
      isForage: cat?.type === 'forage' || undefined,
      species: animal ? f.species : undefined, animalYield: animal && !f.from ? f.yieldKind : undefined, derivedFromCropId: animal || f.from ? f.from : undefined,
    };
    try {
      if (crop) {
        await updateCrop(crop.id, payload);
        showToast(t('card.saved'));
        onDone?.();
      } else {
        const created = await createCrop({ ...(payload as Omit<Crop, 'id' | 'createdAt' | 'updatedAt'>), isFavorite: false, guildTags: [] });
        showToast(t('card.created', { name: created.name }));
        navigate(`/produtos/${created.id}`, { replace: true });
      }
    } catch {
      showToast(t('common.error'));
    }
  };

  const chips = <T extends string>(label: string, options: { v: T; l: string }[], value: T | undefined, onPick: (v: T | undefined) => void, optional = false) => (
    <div className="flex flex-col gap-2">
      {optional ? <OptionalLabel t={t}>{label}</OptionalLabel> : <span className="kb-label">{label}</span>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={`kb-chip ${value === o.v ? 'kb-chip-on' : ''}`}
            onClick={() => onPick(optional && value === o.v ? undefined : o.v)}>{o.l}</button>
        ))}
      </div>
    </div>
  );

  return (
    <main className="kb-screen kb-screen-flow">
      <ScreenHeader title={crop ? t('card.editTitle') : t('card.newTitle')} size="md"
        back={crop ? { onClick: () => onDone?.(), label: t('common.cancel'), icon: 'close' } : { to: '/produtos', label: t('card.back'), icon: 'close' }} />
      <label className="flex flex-col gap-1.5">
        <span className="kb-label">{t('card.name')}</span>
        <input className="kb-field" type="text" value={f.name} aria-invalid={nameBad} onChange={e => set('name', e.target.value)} placeholder={t('card.namePlaceholder')} />
        {nameBad && <span className="text-sm font-medium text-urucum" aria-live="polite">{t('card.nameError')}</span>}
      </label>
      {chips(t('card.category'), data.categories.map(c => ({ v: c.id, l: c.name })), f.categoryId, v => v && set('categoryId', v))}
      {chips(t('card.unit'), UNITS.map(u => ({ v: u, l: fmtUnit(u, 1) })), f.unit, v => v && set('unit', v))}
      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5"><span className="kb-label">{t('card.shelfDays')}</span>
          <input className="kb-field" type="text" inputMode="numeric" value={f.shelf} onChange={e => set('shelf', e.target.value)} placeholder={t('card.daysPlaceholder')} /></label>
        <label className="flex flex-col gap-1.5"><span className="kb-label">{t('card.pricePer', { unit: fmtUnit(f.unit, 1) })}</span>
          <input className="kb-field" type="text" inputMode="decimal" value={f.price} onChange={e => set('price', e.target.value)} placeholder="0,00" /></label>
      </div>
      {!animal && chips(t('card.layer'), LAYERS.map(l => ({ v: l, l: t(`layers.${l}`) })), f.layer, v => set('layer', v), true)}
      {!animal && (
        <label className="flex flex-col gap-1.5"><OptionalLabel t={t}>{t('card.cycle')}</OptionalLabel>
          <input className="kb-field" type="text" inputMode="numeric" value={f.cycle} onChange={e => set('cycle', e.target.value)} placeholder={t('card.cyclePlaceholder')} />
          <span className="kb-hint">{t('card.cycleHint')}</span></label>
      )}
      {animal && chips(t('card.species'), SPECIES.map(s => ({ v: s, l: t(`species.${s}`) })), f.species, v => set('species', v), true)}
      {animal && chips(t('card.from'), data.crops.filter(c => c.species && c.id !== crop?.id && !c.derivedFromCropId).map(c => ({ v: c.id, l: c.name })), f.from, v => set('from', v), true)}
      {animal && !f.from && chips(t('card.yield'), (['collect', 'slaughter'] as AnimalYield[]).map(y => ({ v: y, l: t(`card.yieldKind.${y}`) })), f.yieldKind, v => set('yieldKind', v), true)}
      <label className="flex flex-col gap-1.5"><OptionalLabel t={t}>{t('common.notes')}</OptionalLabel>
        <textarea className="kb-field" rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder={t('card.notesPlaceholder')} /></label>
      <div className="mt-auto">
        <button type="button" className="kb-tap kb-tap-go" onClick={save}>{crop ? t('card.saveEdit') : t('card.create')}</button>
      </div>
    </main>
  );
}
