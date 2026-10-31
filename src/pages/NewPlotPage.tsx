/** Abrir talhão: mark a piece of free land, choose its type and it becomes a tappable plot */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm } from '@/hooks/useFarm';
import type { SunExposure, WaterSource, ZoneType } from '@/domain/contracts/types';
import { createZone } from '@/data/actions';
import { ScreenHeader } from '@/components/game/Shell';
import { Icon, type IconName } from '@/components/game/Icon';
import { Loading } from '@/components/game/bits';
import { showToast } from '@/components/game/toast';
import { heightForArea } from '@/components/map/layout';

const TYPES: { id: ZoneType; icon: IconName }[] = [
  { id: 'canteiro', icon: 'zoneCanteiro' }, { id: 'linha', icon: 'zoneLinha' }, { id: 'agrofloresta', icon: 'zoneSaf' },
  { id: 'pomar', icon: 'zonePomar' }, { id: 'pasto', icon: 'zonePasto' }, { id: 'abrigo', icon: 'zoneAbrigo' },
];
const START = new Set([10, 11, 12, 13, 19, 20, 21, 22]);

export default function NewPlotPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const data = useFarm();
  const [on, setOn] = useState<Set<number>>(START);
  const [type, setType] = useState<ZoneType>('canteiro');
  const [name, setName] = useState<string | null>(null);
  const [sun, setSun] = useState<SunExposure>('full');
  const [water, setWater] = useState<WaterSource>('rain');
  const [busy, setBusy] = useState(false);
  if (!data) return <Loading />;

  const n = on.size;
  const area = n * 4;
  const nextName = (ty: ZoneType) => `${t(`newPlot.defaultName.${ty}`)} ${data.zones.filter(z => z.type === ty).length + 1}`;
  const finalName = name ?? nextName(type);
  const toggle = (i: number) => setOn(cur => {
    const next = new Set(cur);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });
  const create = async () => {
    if (!n || !finalName.trim() || busy) return;
    setBusy(true);
    const id = await createZone({
      name: finalName.trim(), type, areaM2: area, size: `${area} m²`, description: type === 'canteiro' ? undefined : t(`zoneTypes.${type}`).toLowerCase(),
      gridRows: type === 'linha' ? 4 : 3, mapHeight: heightForArea(area), sun, water,
    });
    showToast(t('newPlot.created', { name: finalName.trim() }));
    navigate(type === 'abrigo' ? '/animais/novo' : `/talhao/${id}/plantar`, { replace: true });
  };
  const chips = <T extends string>(label: string, opts: T[], value: T, set: (v: T) => void, key: string) => (
    <div className="flex flex-col gap-2">
      <span className="kb-label">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {opts.map(o => <button key={o} type="button" role="radio" aria-checked={value === o} className={`kb-chip ${value === o ? 'kb-chip-on' : ''}`} onClick={() => set(o)}>{t(`${key}.${o}`)}</button>)}
      </div>
    </div>
  );

  return (
    <main className="kb-screen kb-screen-flow">
      <ScreenHeader title={t('newPlot.title')} sub={t('newPlot.sub')} size="md" back={{ to: '/', label: t('common.close'), icon: 'close' }} />

      <section aria-label={t('newPlot.mark')} className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="kb-label">{t('newPlot.mark')}</span>
          <span className="kb-mono text-[15px]" aria-live="polite">{t('newPlot.area', { area, count: n })}</span>
        </div>
        <div className="rounded-[18px] border-2 border-dashed p-2.5" style={{ background: '#9cc96a', borderColor: '#f3eedf' }}>
          <div className="grid grid-cols-9 gap-1">
            {Array.from({ length: 27 }, (_, i) => {
              const sel = on.has(i);
              return (
                <button key={i} type="button" aria-pressed={sel} aria-label={t('newPlot.square', { n: i + 1 })} onClick={() => toggle(i)}
                  className="kb-hit aspect-square rounded-md border-0 p-0 transition-[background-color,box-shadow] duration-150"
                  style={sel ? { background: '#b07a43', boxShadow: 'inset 0 -3px 0 #8a5a2b, 0 0 0 2px #faf8f2' } : { background: 'rgba(250,248,242,.25)' }} />
              );
            })}
          </div>
        </div>
        <span className="kb-hint">{t('newPlot.squareHint')}</span>
      </section>

      <div className="flex flex-col gap-2">
        <span className="kb-label">{t('newPlot.type')}</span>
        <div role="radiogroup" aria-label={t('newPlot.typeLabel')} className="grid grid-cols-3 gap-2">
          {TYPES.map(ty => (
            <button key={ty.id} type="button" role="radio" aria-checked={type === ty.id} className={`kb-pick ${type === ty.id ? 'kb-pick-on' : ''}`} onClick={() => { setType(ty.id); setName(null); }}>
              <Icon name={ty.icon} size={26} />{t(`zoneTypes.${ty.id}`)}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="kb-label">{t('newPlot.name')}</span>
        <input className="kb-field" type="text" value={finalName} onChange={e => setName(e.target.value)} />
      </label>

      {chips<SunExposure>(t('newPlot.sun'), ['full', 'partial', 'shade'], sun, setSun, 'newPlot.suns')}
      {chips<WaterSource>(t('newPlot.water'), ['irrigated', 'rain'], water, setWater, 'newPlot.waters')}

      <div className="mt-auto">
        {n > 0
          ? <button type="button" className="kb-tap kb-tap-go" onClick={create} disabled={busy}>{type === 'abrigo' ? t('newPlot.goShelter') : t('newPlot.go')}</button>
          : <span className="kb-tap kb-tap-off">{t('newPlot.markOne')}</span>}
      </div>
    </main>
  );
}
