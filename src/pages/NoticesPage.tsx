/** Notificações: generated on the phone from the farm's own data, no internet */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { calendarDays, notifications, type Notice, type NoticeCategory } from '@/domain/rules/farm';
import { markNoticesRead } from '@/data/actions';
import { BottomNav, ScreenHeader, sprite } from '@/components/game/Shell';
import { Icon, type IconName } from '@/components/game/Icon';
import { Loading, TONE_STYLE } from '@/components/game/bits';
import { fmtDayMonth, fmtQty, fmtWeekday } from '@/lib/format';
import type { UnitType } from '@/domain/contracts/types';

const FILTERS: ('all' | NoticeCategory)[] = ['all', 'paiol', 'talhao', 'animal', 'feira', 'bau'];
const ICON: Record<Notice['icon'], IconName> = {
  paiol: 'box', talhao: 'grid', colher: 'harvest', olho: 'eye', feira: 'stall', bau: 'download', milk: 'milk', egg: 'egg', heads: 'heads',
};

export default function NoticesPage() {
  const { t } = useTranslation();
  const data = useFarm();
  const now = useNow();
  const [filter, setFilter] = useState<'all' | NoticeCategory>('all');
  if (!data) return <Loading />;

  const all = notifications(data, now);
  const read = new Set(data.notificationReads.map(r => r.id));
  const unread = all.filter(n => !read.has(n.id)).length;
  const list = all.filter(n => filter === 'all' || n.category === filter);
  const groups = (['now', 'week'] as const).map(g => ({ g, items: list.filter(n => n.group === g) })).filter(x => x.items.length);

  /** Quantities in params are formatted here so units follow the locale */
  const params = (p?: Record<string, unknown>) => {
    if (!p) return undefined;
    const out: Record<string, unknown> = { ...p };
    if (typeof p.qty === 'number' && p.unit) out.qty = fmtQty(p.qty, p.unit as UnitType);
    if (typeof p.date === 'string') out.date = fmtDayMonth(p.date);
    return out;
  };
  const when = (iso: string) => {
    const d = calendarDays(iso, now);
    return d <= 0 ? t('common.today').toLowerCase() : d === 1 ? t('common.yesterday').toLowerCase() : d < 7 ? fmtWeekday(iso) : fmtDayMonth(iso);
  };

  return (
    <>
      <main className="kb-screen kb-screen-nav !gap-3">
        <ScreenHeader title={t('notices.title')} size="md" back={{ to: '/', label: t('notices.back') }}
          sub={unread ? t('notices.unread', { count: unread }) : t('notices.allRead')}
          right={<button type="button" className="kb-icon-btn !w-auto px-3 text-sm text-canopy" onClick={() => markNoticesRead(all.map(n => n.id))} disabled={!unread}>{t('notices.readAll')}</button>} />

        <div className="flex flex-wrap gap-2" role="group" aria-label={t('notices.filterLabel')}>
          {FILTERS.map(f => (
            <button key={f} type="button" aria-pressed={filter === f} className={`kb-chip !min-h-10 ${filter === f ? 'kb-chip-ink' : ''}`} onClick={() => setFilter(f)}>{t(`notices.filter.${f}`)}</button>
          ))}
        </div>

        {groups.map(({ g, items }) => (
          <section key={g} className="flex flex-col gap-3" aria-labelledby={`grp-${g}`}>
            <h2 id={`grp-${g}`} className="m-0 mt-1 text-sm font-medium leading-5 text-ink-muted">{t(`notices.group.${g}`)}</h2>
            {items.map(n => {
              const isUnread = !read.has(n.id);
              const tone = TONE_STYLE[n.tone];
              return (
                <article key={n.id} className="kb-rise relative flex gap-3 rounded-[18px] border border-line p-3.5" style={{ background: isUnread ? 'var(--surface-raised)' : 'transparent' }}>
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px]" style={{ background: tone.background, color: tone.color }}><Icon name={ICON[n.icon]} size={22} /></span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2 pr-4">
                      <span className="truncate text-xs font-medium leading-4 text-ink-muted">{'text' in n.kind ? n.kind.text : t(n.kind.key)}</span>
                      <span className="flex-none text-xs leading-4 text-ink-muted">{when(n.at)}</span>
                    </div>
                    <span className="font-medium leading-[22px]">{t(n.title.key, params(n.title.params))}</span>
                    <span className="text-sm leading-5 text-ink-muted">{t(n.body.key, params(n.body.params))}</span>
                    <Link to={n.href} onClick={() => markNoticesRead([n.id])}
                      className={`mt-1 inline-flex min-h-10 items-center self-start rounded-xl px-3.5 text-sm font-medium no-underline ${n.main && isUnread ? 'bg-canopy text-canopy-on' : 'border-[1.5px] border-line-strong text-ink'}`}
                      style={n.main && isUnread ? { boxShadow: '0 3px 0 var(--canopy-edge)' } : undefined}>{t(n.cta)}</Link>
                  </div>
                  {isUnread && <span role="img" aria-label={t('notices.new')} className="absolute right-3.5 top-4 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--urucum)' }} />}
                </article>
              );
            })}
          </section>
        ))}

        {groups.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-line-strong p-5 text-center text-ink-muted">
            <img src={sprite('broto-tranquilo')} alt="" className="h-24 w-auto" />
            {t('notices.none')}
          </div>
        )}

        <Link to="/ajustes" className="kb-inline mt-1.5 self-center text-[15px]">{t('notices.choose')}</Link>
      </main>
      <BottomNav />
    </>
  );
}
