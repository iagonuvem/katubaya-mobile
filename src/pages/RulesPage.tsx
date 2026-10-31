/**
 * As regras do jogo: the rules board from the design canvas, alive. The ritual, the tree,
 * Broto's next sentence and the saved seeds all read the farm's real data.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '@/data/db/schema';
import { useFarm, useNow } from '@/hooks/useFarm';
import { achievements, notifications, ritual, treeStage, type TreeStage } from '@/domain/rules/farm';
import { ScreenHeader, sprite } from '@/components/game/Shell';
import { TreeStageArt } from '@/components/game/TreeStage';
import { Loading } from '@/components/game/bits';
import { fmtQty } from '@/lib/format';
import type { UnitType } from '@/domain/contracts/types';

const STAGES: { stage: TreeStage; at: number }[] = [{ stage: 'semente', at: 0 }, { stage: 'broto', at: 1 }, { stage: 'muda', at: 4 }, { stage: 'arvore', at: 12 }];

export default function RulesPage() {
  const { t } = useTranslation();
  const data = useFarm();
  const now = useNow();
  const sent = useLiveQuery(() => db.availabilityLists.filter(l => !!l.sentAt).count(), [], 0);
  if (!data) return <Loading />;

  const rit = ritual(data, now);
  const closed = data.ritualWeeks.length;
  const stage = treeStage(closed);
  const top = notifications(data, now)[0];
  const p = (o?: Record<string, unknown>) => (o && typeof o.qty === 'number' && o.unit ? { ...o, qty: fmtQty(o.qty, o.unit as UnitType) } : o);
  const quote = top ? `${t(top.title.key, p(top.title.params))}. ${t(top.body.key, p(top.body.params))}` : t('rules.broto.calm');
  const mood = !top ? 'tranquilo' : top.tone === 'urucum' ? 'avisando' : rit.complete ? 'comemorando' : 'explicando';
  const seeds = achievements(data, sent, now);
  const box = 'flex flex-col gap-3.5 rounded-[20px] border border-line bg-surface-raised p-5';

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-4 pb-10 sm:px-8 lg:px-12" style={{ paddingTop: 'calc(16px + var(--safe-area-top))' }}>
      <ScreenHeader title={t('rules.title')} back={{ to: '/', label: t('paiol.backToFarm') }} />
      <div className="flex max-w-[820px] flex-col gap-2">
        <img src={sprite('logo')} alt="katūbayá" className="h-[30px] w-auto self-start dark:invert" />
        <p className="m-0 text-[17px] leading-[26px] text-ink-muted">{t('rules.intro')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <section className={box}>
          <h2 className="kb-h2 !text-[22px]">{t('rules.ritual.title')}</h2>
          <p className="kb-sub m-0 !text-[15px]">{t('rules.ritual.text')}</p>
          {rit.steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[15px] font-medium"
                style={s.done ? { background: 'var(--canopy)', color: 'var(--on-canopy)' } : { border: '2px dashed var(--line-strong)', color: 'var(--ink-muted)' }}
                aria-label={s.done ? t('map.stepDone', { label: t(`ritual.${s.key}`) }) : undefined}>{i + 1}</span>
              <span>{t(`rules.ritual.${s.key}`)}</span>
              <span className="kb-mono ml-auto text-right text-[13px] text-ink-muted">{t(`rules.ritual.${s.key}Hint`)}</span>
            </div>
          ))}
        </section>

        <section className={box}>
          <h2 className="kb-h2 !text-[22px]">{t('rules.tree.title')}</h2>
          <p className="kb-sub m-0 !text-[15px]">{t('rules.tree.text')}</p>
          <div className="grid flex-1 grid-cols-4 items-end gap-2.5">
            {STAGES.map(s => (
              <div key={s.stage} className="flex flex-col items-center gap-2 rounded-xl py-1" style={s.stage === stage ? { background: 'var(--canopy-soft)' } : undefined}
                aria-current={s.stage === stage ? 'step' : undefined}>
                <TreeStageArt stage={s.stage} label={t(`rules.tree.${s.stage}`)} />
                <span className="font-medium">{t(`rules.tree.${s.stage}`)}</span>
                <span className="kb-mono text-[13px] text-ink-muted">{t('rules.tree.at', { count: s.at })}</span>
              </div>
            ))}
          </div>
          <p className="kb-sub m-0">{t('rules.tree.yours', { count: closed, stage: t(`rules.tree.${stage}`) })}</p>
        </section>

        <section className={box}>
          <h2 className="kb-h2 !text-[22px]">{t('rules.broto.title')}</h2>
          <p className="kb-sub m-0 !text-[15px]">{t('rules.broto.text')}</p>
          <div className="grid grid-cols-4 gap-2">
            {(['tranquilo', 'explicando', 'comemorando', 'avisando'] as const).map(m => (
              <div key={m} className="flex flex-col items-center gap-1.5 rounded-[14px] px-1.5 py-2.5 text-center text-[13px] leading-[18px]"
                style={{ background: `var(--${{ tranquilo: 'canopy', explicando: 'river', comemorando: 'amber', avisando: 'urucum' }[m]}-soft)`, outline: m === mood ? '2px solid var(--ink)' : undefined }}>
                <img src={sprite(`broto-${m}`)} alt={t(`rules.broto.alt.${m}`)} className="h-[72px] w-auto" />
                {t(`rules.broto.mood.${m}`)}
              </div>
            ))}
          </div>
          <p className="m-0 rounded-[14px] border border-line bg-surface px-3.5 py-3 text-[15px] leading-[22px]">“{quote}”</p>
        </section>

        <section className={box}>
          <h2 className="kb-h2 !text-[22px]">{t('rules.fresh.title')}</h2>
          <p className="kb-sub m-0 !text-[15px]">{t('rules.fresh.text')}</p>
          {([['100%', 'var(--canopy)', 'fresh'], ['40%', 'var(--amber-bright)', 'soon'], ['8%', 'var(--urucum)', 'out']] as const).map(([w, c, k]) => (
            <div key={k} className="flex items-center gap-3">
              <div className="h-2.5 flex-1 rounded-full bg-surface-sunken"><div className="h-full rounded-full" style={{ width: w, background: c }} /></div>
              <span className="w-[150px] font-medium" style={{ color: c === 'var(--amber-bright)' ? 'var(--amber)' : c }}>{t(`rules.fresh.${k}`)}</span>
            </div>
          ))}
          <p className="kb-sub m-0">{t('rules.fresh.note')}</p>
        </section>

        <section className={box}>
          <h2 className="kb-h2 !text-[22px]">{t('rules.seeds.title')}</h2>
          <p className="kb-sub m-0 !text-[15px]">{t('rules.seeds.text')}</p>
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
            {seeds.map(s => (
              <li key={s.key} className="flex items-center gap-2.5 rounded-[14px] bg-surface p-2.5" style={s.earned ? undefined : { color: 'var(--ink-muted)' }}>
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl font-medium"
                  style={s.earned ? { background: 'var(--canopy-soft)', color: 'var(--canopy)' } : { border: '2px dashed var(--line-strong)' }}>
                  {s.key === 'firstHarvest' && s.earned ? <img src={sprite('caixa-banana')} alt="" className="h-[30px] w-auto" /> : s.value ?? (s.earned ? '✓' : '')}
                </span>
                <span className="text-sm leading-[18px]">{t(`rules.seeds.${s.key}`, { count: s.value ?? 0 })}<span className="sr-only">{s.earned ? t('rules.seeds.earned') : t('rules.seeds.notYet')}</span></span>
              </li>
            ))}
          </ul>
        </section>

        <section className={box} style={{ background: 'var(--ink)', color: 'var(--surface)', borderColor: 'var(--ink)' }}>
          <h2 className="kb-h2 !text-[22px]">{t('rules.never.title')}</h2>
          <ul className="m-0 flex flex-col gap-2.5 pl-[18px] text-base leading-[23px]">
            {['ranking', 'countdown', 'account', 'truth', 'hide'].map(k => <li key={k}>{t(`rules.never.${k}`)}</li>)}
          </ul>
          <div aria-hidden="true" className="mt-auto h-3 opacity-50 invert dark:invert-0" style={{ background: `url(${sprite('grafismo')}) repeat-x`, backgroundSize: '36px 12px' }} />
        </section>
      </div>
    </main>
  );
}
