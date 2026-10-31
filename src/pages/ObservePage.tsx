/** Observar: ten minutes in the plot, once a week. Five signs, a photo and a note. */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm } from '@/hooks/useFarm';
import { lastObservation, plotZones } from '@/domain/rules/farm';
import type { Observation, ObservationLevel3 } from '@/domain/contracts/types';
import { saveObservation } from '@/data/actions';
import { ScreenHeader } from '@/components/game/Shell';
import { Icon } from '@/components/game/Icon';
import { Loading } from '@/components/game/bits';
import { showToast } from '@/components/game/toast';

type Vals = Required<Pick<Observation, 'phase' | 'pollinators' | 'pest' | 'disease' | 'soil'>>;
const DEFAULTS: Vals = { phase: 'vegetative', pollinators: 1, pest: 0, disease: 0, soil: 1 };
const PHASES: Observation['phase'][] = ['vegetative', 'flowering', 'fruiting', 'dormant'];
const SIGNALS: { key: keyof Vals; opts: (string | number)[]; warn?: number }[] = [
  { key: 'phase', opts: PHASES as string[] },
  { key: 'pollinators', opts: [0, 1, 2] },
  { key: 'pest', opts: [0, 1, 2], warn: 2 },
  { key: 'disease', opts: [0, 1, 2], warn: 2 },
  { key: 'soil', opts: [0, 1, 2] },
];

/** Downscales a photo to a small JPEG so it fits in the local database */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 640 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function ObservePage() {
  const { t } = useTranslation();
  const data = useFarm();
  const [params] = useSearchParams();
  const [plot, setPlot] = useState<string | null>(params.get('talhao'));
  const [vals, setVals] = useState<Partial<Vals>>({});
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [saved, setSaved] = useState<string | null>(null);
  if (!data) return <Loading />;

  const plots = plotZones(data);
  const zoneId = plot ?? plots[0]?.id;
  const zone = data.zones.find(z => z.id === zoneId);
  const last = zoneId ? lastObservation(zoneId, data.observations) : undefined;
  const base: Vals = { ...DEFAULTS, ...(last ? Object.fromEntries(Object.entries(last).filter(([k, v]) => k in DEFAULTS && v !== undefined)) : {}) } as Vals;
  const cur: Vals = { ...base, ...vals };

  const save = async () => {
    if (!zone) return;
    try {
      await saveObservation(zone.id, { ...cur, notes: notes.trim() || undefined, photo });
      setSaved(zone.name);
    } catch {
      showToast(t('common.error'));
    }
  };
  const pick = (k: keyof Vals, v: string | number) => { setVals({ ...vals, [k]: v as ObservationLevel3 }); setSaved(null); };

  return (
    <main className="kb-screen kb-screen-flow !gap-3.5">
      <ScreenHeader title={t('observe.title')} sub={t('observe.sub')} size="md" back={{ to: '/', label: t('common.close'), icon: 'close' }} />

      <div role="radiogroup" aria-label={t('observe.plot')} className="flex flex-wrap gap-2">
        {plots.map(z => (
          <button key={z.id} type="button" role="radio" aria-checked={zoneId === z.id} className={`kb-chip ${zoneId === z.id ? 'kb-chip-on' : ''}`}
            onClick={() => { setPlot(z.id); setVals({}); setSaved(null); }}>{z.name}</button>
        ))}
      </div>
      {plots.length === 0 && <p className="kb-sub m-0">{t('observe.noPlots')} <Link to="/talhao/novo">{t('observe.openPlot')}</Link></p>}

      {zone && SIGNALS.map(s => (
        <div key={s.key} role="radiogroup" aria-label={t(`observe.signal.${s.key}`)} className="kb-card flex flex-col gap-2 rounded-[18px] px-3.5 py-3">
          <span className="font-medium">{t(`observe.signal.${s.key}`)}</span>
          <div className="flex gap-1.5">
            {s.opts.map(o => {
              const on = cur[s.key] === o;
              const warn = on && s.warn === o;
              return (
                <button key={String(o)} type="button" role="radio" aria-checked={on} onClick={() => pick(s.key, o)}
                  className="min-h-11 flex-1 rounded-xl border-[1.5px] px-1 text-sm transition-colors"
                  style={warn ? { borderColor: 'var(--urucum)', background: 'var(--urucum-soft)', color: 'var(--urucum)', fontWeight: 500 }
                    : on ? { borderColor: 'var(--canopy)', background: 'var(--canopy-soft)', color: 'var(--canopy)', fontWeight: 500 }
                    : { borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}>
                  {t(`observe.opt.${s.key}.${o}`)}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {zone && (
        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2.5">
          <label className="relative flex h-24 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-[1.5px] border-dashed border-line-strong text-[13px] text-ink-muted">
            {photo ? <img src={photo} alt={t('observe.photoAlt')} className="absolute inset-0 h-full w-full object-cover" /> : <><Icon name="camera" size={26} />{t('observe.photo')}</>}
            <input type="file" accept="image/*" capture="environment" className="sr-only"
              onChange={async e => { const f = e.target.files?.[0]; if (f) setPhoto(await shrink(f)); }} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[15px] font-medium">{t('observe.notes')}</span>
            <textarea rows={2} className="kb-field flex-1 !text-[15px]" placeholder={t('observe.notesPlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2.5">
        {saved ? (
          <>
            <div role="status" className="kb-rise flex items-center gap-2.5 rounded-2xl bg-canopy-soft px-3.5 py-3 font-medium text-canopy">
              <Icon name="check" size={20} strokeWidth={2.2} /><span>{t('observe.saved', { name: saved })}</span>
            </div>
            <Link to="/" className="kb-tap kb-tap-alt">{t('observe.back')}</Link>
          </>
        ) : (
          <button type="button" className={`kb-tap ${zone ? 'kb-tap-go' : 'kb-tap-off'}`} onClick={save} aria-disabled={!zone}>{t('observe.save')}</button>
        )}
      </div>
    </main>
  );
}
