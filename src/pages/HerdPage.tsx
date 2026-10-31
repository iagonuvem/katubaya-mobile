/** Produtos · Lotes de Animais: every animal lot, grouped by species */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { animalLotStats } from '@/domain/rules/farm';
import type { Species } from '@/domain/contracts/types';
import { BottomNav, ScreenHeader } from '@/components/game/Shell';
import { ProductTabs } from '@/components/game/ProductTabs';
import { Icon } from '@/components/game/Icon';
import { Loading, TONE_STYLE } from '@/components/game/bits';
import { SPECIES_ICON, SPECIES_LIST, SPECIES_TONE } from '@/components/game/species';
import { fmtQty } from '@/lib/format';

export default function HerdPage() {
  const { t } = useTranslation();
  const data = useFarm();
  const now = useNow();
  const [f, setF] = useState<'all' | Species>('all');
  const [closed, setClosed] = useState(false);
  if (!data) return <Loading />;

  const lots = data.animalGroups;
  const present = SPECIES_LIST.filter(s => lots.some(l => l.species === s));
  const vis = lots.filter(l => (f === 'all' || l.species === f) && (closed || l.headcount > 0));
  const nClosed = lots.filter(l => l.headcount === 0).length;

  return (
    <>
      <main className="kb-screen kb-screen-nav !gap-3">
        <ScreenHeader title={t('collection.title')} back={{ to: '/', label: t('plot.back') }}
          right={<Link to="/animais/novo" className="kb-head-btn kb-head-btn-go"><Icon name="plus" size={18} strokeWidth={2.2} />{t('herd.new')}</Link>} />
        <ProductTabs current="animals" />

        <div className="flex flex-wrap gap-2" role="group" aria-label={t('herd.filter')}>
          {(['all', ...present] as const).map(s => (
            <button key={s} type="button" aria-pressed={f === s} className={`kb-chip !min-h-10 ${f === s ? 'kb-chip-ink' : ''}`} onClick={() => setF(s)}>
              {s === 'all' ? t('herd.all') : t(`species.${s}`)}
            </button>
          ))}
        </div>

        {present.map(sp => {
          const items = vis.filter(l => l.species === sp);
          if (!items.length) return null;
          const heads = items.reduce((s, l) => s + l.headcount, 0);
          return (
            <section key={sp} className="flex flex-col gap-3" aria-labelledby={`sp-${sp}`}>
              <h2 id={`sp-${sp}`} className="m-0 mt-1.5 flex items-center gap-2 text-sm font-medium leading-5 text-ink-muted">
                <span>{t(`species.${sp}`)}</span><span className="kb-mono font-normal">{t('common.heads', { count: heads })}</span>
              </h2>
              {items.map(l => {
                const s = animalLotStats(l, data, now);
                const tone = s.closed ? 'muted' : SPECIES_TONE[l.species];
                const tag = s.closed ? t('herd.closed')
                  : s.dailyCrop && (s.yesterday || s.today) ? t(s.today ? 'herd.today' : 'herd.yesterday', { qty: fmtQty(s.today || s.yesterday, s.dailyCrop.defaultUnit) })
                  : s.slaughterQty ? t('herd.yearQty', { qty: fmtQty(s.slaughterQty, 'kg'), year: now.getFullYear() })
                  : t('herd.active');
                const zone = data.zones.find(z => z.id === l.zoneId)?.name;
                return (
                  <Link key={l.id} to={`/animais/${l.id}`}
                    className="flex min-h-[72px] items-center gap-3 rounded-[18px] border border-line bg-surface-raised px-3.5 py-3 text-ink no-underline"
                    style={s.closed ? { background: 'transparent', borderStyle: 'dashed' } : { boxShadow: '0 3px 0 var(--line)' }}>
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px]" style={{ background: TONE_STYLE[tone].background, color: TONE_STYLE[tone].color }}>
                      <Icon name={SPECIES_ICON[l.species]} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{l.name}</span>
                      <span className="text-[13px] leading-[18px] text-ink-muted">{[t('common.heads', { count: l.headcount }), zone].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="flex-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-medium leading-5" style={{ background: TONE_STYLE[tone].background, color: TONE_STYLE[tone].color }}>{tag}</span>
                  </Link>
                );
              })}
            </section>
          );
        })}

        {lots.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-line-strong px-4 py-6 text-center">
            <span className="font-medium">{t('herd.emptyTitle')}</span>
            <span className="kb-sub">{t('herd.emptyText')}</span>
            <Link to="/animais/novo" className="mt-1.5">{t('herd.new')}</Link>
          </div>
        )}

        {nClosed > 0 && (
          <div className="kb-card flex items-center justify-between gap-2.5 rounded-2xl px-3.5 py-2.5">
            <span className="flex flex-col"><span className="font-medium">{t('herd.showClosed')}</span><span className="text-[13px] text-ink-muted">{t('herd.closedHint', { count: nClosed })}</span></span>
            <button type="button" role="switch" aria-checked={closed} aria-label={t('herd.showClosedLabel')} className="kb-switch" onClick={() => setClosed(!closed)}><span /></button>
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
