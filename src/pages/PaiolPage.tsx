/**
 * Paiol: stock and freshness. Each product is a crate card; each lot inside carries a life bar
 * with the words next to it, never color alone.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { calendarDays, stockGroups, stockSummary, type StockGroup } from '@/domain/rules/farm';
import { BottomNav, ScreenHeader, sprite } from '@/components/game/Shell';
import { CropArt, LifeBar, Loading, lifeLabel } from '@/components/game/bits';
import { fmtDayMonth, fmtMoney, fmtQty, fmtUnit } from '@/lib/format';

export default function PaiolPage() {
  const { t } = useTranslation();
  const data = useFarm();
  const now = useNow();
  const [filter, setFilter] = useState<string>('all');
  if (!data) return <Loading />;

  const groups = stockGroups(data, now);
  const summary = stockSummary(groups);
  const categories = data.categories.filter(c => groups.some(g => g.crop.categoryId === c.id));
  const shown = groups.filter(g =>
    filter === 'all' ? true : filter === 'expiring' ? g.lots.some(l => l.life.state !== 'fresh') : g.crop.categoryId === filter,
  );
  const filters = [
    { id: 'all', label: t('paiol.all') },
    { id: 'expiring', label: t('paiol.expiring'), dot: true },
    ...categories.map(c => ({ id: c.id, label: c.name })),
  ];

  return (
    <>
      <main className="kb-screen kb-screen-nav">
        <ScreenHeader title={t('paiol.title')} back={{ to: '/', label: t('paiol.backToFarm') }}
          right={<Link to="/paiol/ajustar" className="kb-head-btn">{t('paiol.adjust')}</Link>} />

        <section className="relative flex items-center gap-3 overflow-hidden rounded-[22px] bg-canopy p-4 text-canopy-on">
          <img src={sprite('paiol')} alt="" className="-my-2 -ml-2.5 -mr-2 w-[120px] flex-none" style={{ marginBottom: -14 }} />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm opacity-90">{t('paiol.now')}</span>
            <span className="kb-mono text-[26px] font-medium leading-8">{fmtMoney(summary.value)}</span>
            <span className="text-sm opacity-90">{t('paiol.summary', { boxes: summary.boxes, count: summary.products })}{summary.attention ? ` · ${t('paiol.attention', { count: summary.attention })}` : ''}</span>
          </div>
        </section>

        <div className="flex flex-wrap gap-2" role="group" aria-label={t('paiol.filter')}>
          {filters.map(f => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`kb-chip ${filter === f.id ? 'kb-chip-on' : ''}`}>
              {f.dot && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--urucum)' }} />}{f.label}
            </button>
          ))}
        </div>

        {shown.map(g => <StockCard key={g.key} g={g} now={now} categories={data.categories} />)}
        {shown.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-line-strong px-4 py-6 text-center">
            <img src={sprite('broto-tranquilo')} alt="" className="h-20 w-auto" />
            <span className="font-medium">{groups.length ? t('paiol.emptyFilter') : t('paiol.empty')}</span>
            {!groups.length && <Link to="/colher" className="kb-tap kb-tap-go kb-tap-md mt-1.5 max-w-xs">{t('paiol.logFirst')}</Link>}
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}

function StockCard({ g, now, categories }: { g: StockGroup; now: Date; categories: Parameters<typeof CropArt>[0]['categories'] }) {
  const { t } = useTranslation();
  const name = g.cultivar ? `${g.crop.name} ${g.cultivar.name}` : g.crop.name;
  const price = g.crop.pricePerUnit ? `${fmtMoney(g.crop.pricePerUnit)}/${fmtUnit(g.unit)}` : t('common.noPrice');
  const art = <CropArt crop={g.crop} categories={categories} className="h-12 w-14 rounded-xl" imgHeight={46} />;
  const compact = g.lots.length === 1 && g.lots[0].life.state === 'fresh';

  if (compact) {
    const lot = g.lots[0];
    return (
      <Link to={`/paiol/lote/${lot.id}`} className="kb-card flex items-center gap-3 p-3.5 text-ink no-underline">
        {art}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-lg font-medium">{name}</span>
          <span className="text-sm font-medium text-canopy">{lifeLabel(t, lot.life)}</span>
        </div>
        <span className="kb-mono text-xl font-medium">{fmtQty(g.total, g.unit)}</span>
      </Link>
    );
  }

  return (
    <section className="kb-card flex flex-col gap-2.5 p-3.5" aria-label={name}>
      <div className="flex items-center gap-3">
        {art}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-lg font-medium">{name}</span>
          <span className="kb-sub">{t('paiol.lots', { count: g.lots.length })} · {price}</span>
        </div>
        <span className="kb-mono text-xl font-medium">{fmtQty(g.total, g.unit)}</span>
      </div>
      {g.lots.map(lot => {
        const when = calendarDays(lot.harvestedAt, now) === 0 ? t('paiol.harvestedToday') : fmtDayMonth(lot.harvestedAt);
        const expired = lot.life.state === 'expired';
        const today = lot.life.state === 'today';
        return (
          <div key={lot.id} className="flex flex-col gap-1.5 rounded-[14px] px-3 py-2.5"
            style={{ background: today ? 'var(--urucum-soft)' : 'var(--surface)', border: expired ? '1.5px dashed var(--urucum)' : undefined }}>
            <div className="flex items-center justify-between gap-2">
              <Link to={`/paiol/lote/${lot.id}`} className="kb-inline text-sm text-ink no-underline">{when} · <span className="kb-mono">{fmtQty(lot.quantityRemaining, lot.unit)}</span></Link>
              <span className="text-[13px] font-medium" style={{ color: `var(--${lot.life.tone})` }}>{lifeLabel(t, lot.life)}</span>
            </div>
            <div className="flex items-center gap-2.5">
              {expired
                ? <span className="kb-hint flex-1">{t('paiol.expiredHint')}</span>
                : <LifeBar life={lot.life} className="flex-1" track={today ? 'var(--surface-raised)' : undefined} />}
              <Link to={`/paiol/ajustar?lote=${lot.id}`} className="flex min-h-10 flex-none items-center rounded-[10px] border-[1.5px] border-line-strong px-3 text-sm font-medium text-ink no-underline">{t('paiol.adjust')}</Link>
            </div>
          </div>
        );
      })}
    </section>
  );
}
