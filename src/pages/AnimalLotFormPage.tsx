/** Novo Lote de animais (and editing one): name, species, heads, pasture, start date */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm } from '@/hooks/useFarm';
import type { AnimalGroup, Species } from '@/domain/contracts/types';
import { createAnimalGroup, updateAnimalGroup } from '@/data/actions';
import { ScreenHeader } from '@/components/game/Shell';
import { Icon } from '@/components/game/Icon';
import { DoneBanner, Loading, OptionalLabel, WhenRow } from '@/components/game/bits';
import { showToast } from '@/components/game/toast';
import { SPECIES_ICON, SPECIES_LIST } from '@/components/game/species';
import { fmtDate } from '@/lib/format';

export default function AnimalLotFormPage() {
  const { id } = useParams();
  const data = useFarm();
  if (!data) return <Loading />;
  const group = id ? data.animalGroups.find(g => g.id === id) : undefined;
  if (id && !group) return <Loading />;
  return <LotForm key={id ?? 'new'} data={data} group={group} />;
}

function LotForm({ data, group }: { data: NonNullable<ReturnType<typeof useFarm>>; group?: AnimalGroup }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState(group?.name ?? '');
  const [sp, setSp] = useState<Species>(group?.species ?? 'cattle');
  const [heads, setHeads] = useState(group?.initialHeadcount ?? 10);
  const [zoneId, setZoneId] = useState<string | undefined>(group?.zoneId);
  const [start, setStart] = useState(group ? new Date(group.startedAt) : new Date());
  const [notes, setNotes] = useState(group?.notes ?? '');
  const [tried, setTried] = useState(false);
  const [created, setCreated] = useState<AnimalGroup | null>(null);
  const nameBad = tried && !name.trim();
  const pens = data.zones.filter(z => z.type === 'pasto' || z.type === 'abrigo' || data.animalGroups.some(g => g.zoneId === z.id));
  const zoneName = data.zones.find(z => z.id === zoneId)?.name;

  const save = async () => {
    if (!name.trim()) { setTried(true); return; }
    try {
      if (group) {
        await updateAnimalGroup(group.id, { name: name.trim(), species: sp, zoneId, startedAt: start.toISOString(), notes: notes.trim() || undefined });
        showToast(t('lotForm.saved'));
        navigate(`/animais/${group.id}`);
      } else {
        setCreated(await createAnimalGroup({ name: name.trim(), species: sp, headcount: heads, zoneId, startedAt: start.toISOString(), notes: notes.trim() || undefined }));
      }
    } catch {
      showToast(t('common.error'));
    }
  };

  const back = group ? `/animais/${group.id}` : '/animais';
  return (
    <main className="kb-screen kb-screen-flow">
      <ScreenHeader title={group ? t('lotForm.editTitle') : t('lotForm.title')} size="md" back={{ to: back, label: t('common.close'), icon: 'close' }} />

      {created ? (
        <div className="kb-pop flex flex-1 flex-col gap-3.5">
          <DoneBanner>{t('lotForm.created')}</DoneBanner>
          <div className="kb-card flex flex-col gap-1 rounded-2xl p-3.5">
            <span className="text-lg font-medium">{created.name}</span>
            <span className="kb-sub">{[t(`species.${created.species}`), t('common.heads', { count: created.headcount }), zoneName, t('lotForm.since', { date: fmtDate(created.startedAt) })].filter(Boolean).join(' · ')}</span>
          </div>
          <p className="m-0 text-ink-muted">{t('lotForm.createdText')}</p>
          <div className="mt-auto grid grid-cols-2 gap-2.5">
            <Link to="/animais" className="kb-tap kb-tap-alt">{t('lotForm.seeLots')}</Link>
            <Link to="/" className="kb-tap kb-tap-go">{t('plant.seeMap')}</Link>
          </div>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="kb-label">{t('lotForm.name')}</span>
            <input className="kb-field" type="text" placeholder={t('lotForm.namePlaceholder')} value={name} onChange={e => setName(e.target.value)} aria-invalid={nameBad} />
            {nameBad && <span className="text-sm font-medium text-urucum" aria-live="polite">{t('lotForm.nameError')}</span>}
          </label>

          <div className="flex flex-col gap-2">
            <span className="kb-label">{t('lotForm.species')}</span>
            <div role="radiogroup" aria-label={t('lotForm.species')} className="grid grid-cols-4 gap-2">
              {SPECIES_LIST.map(s => (
                <button key={s} type="button" role="radio" aria-checked={sp === s} className={`kb-pick min-h-[76px] !text-[13px] !leading-4 ${sp === s ? 'kb-pick-on' : ''}`} onClick={() => setSp(s)}>
                  <Icon name={SPECIES_ICON[s]} size={26} />{t(`species.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {!group && (
            <div className="kb-card flex items-center justify-between gap-3 rounded-[18px] py-2.5 pl-3.5 pr-2.5">
              <span className="kb-label">{t('lotForm.heads')}</span>
              <div className="flex items-center gap-2.5">
                <button type="button" className="kb-stepper kb-stepper-sm" aria-label={t('lotForm.less')} onClick={() => setHeads(Math.max(0, heads - 1))}><Icon name="minus" size={22} strokeWidth={2} /></button>
                <input type="text" inputMode="numeric" aria-label={t('lotForm.heads')} value={heads} onChange={e => setHeads(Math.max(0, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))}
                  className="kb-mono w-14 border-0 bg-transparent text-center text-2xl font-medium text-ink" />
                <button type="button" className="kb-stepper kb-stepper-sm" aria-label={t('lotForm.more')} onClick={() => setHeads(heads + 1)}><Icon name="plus" size={22} strokeWidth={2} /></button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="kb-label">{t('harvest.zoneOrPasture')}</span>
            <div role="radiogroup" aria-label={t('harvest.zoneOrPasture')} className="flex flex-wrap gap-2">
              {[{ id: '', name: t('common.noZone') }, ...pens].map(z => (
                <button key={z.id || 'none'} type="button" role="radio" aria-checked={(zoneId ?? '') === z.id} className={`kb-chip ${(zoneId ?? '') === z.id ? 'kb-chip-on' : ''}`} onClick={() => setZoneId(z.id || undefined)}>{z.name}</button>
              ))}
              <Link to="/talhao/novo" className="kb-chip kb-chip-dashed">{t('lotForm.newPasture')}</Link>
            </div>
          </div>

          <WhenRow label={t('lotForm.start')} value={start} onChange={setStart} t={t} dateOnly hint={t('lotForm.noFuture')} />

          <label className="flex flex-col gap-1.5">
            <OptionalLabel t={t}>{t('common.notes')}</OptionalLabel>
            <textarea className="kb-field" rows={2} placeholder={t('lotForm.notesPlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>

          <div className="mt-auto">
            <button type="button" className="kb-tap kb-tap-go" onClick={save}>{group ? t('lotForm.save') : t('lotForm.create')}</button>
          </div>
        </>
      )}
    </main>
  );
}
