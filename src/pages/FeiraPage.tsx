/**
 * Feira da semana: the stock turned into a WhatsApp availability message. Toggle what goes on
 * the stall, nudge quantities, copy.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { feiraStatus, stockGroups, type FarmData } from '@/domain/rules/farm';
import { generateAvailabilityMessage, itemDisplayName } from '@/domain/rules/availability';
import type { AvailabilityItem } from '@/domain/contracts/types';
import { generateList, sendList, updateList } from '@/data/actions';
import { ScreenHeader } from '@/components/game/Shell';
import { Icon } from '@/components/game/Icon';
import { Loading, lifeLabel } from '@/components/game/bits';
import { showToast, useToastOffset } from '@/components/game/toast';
import { fmtNum, fmtQty, fmtUnit, fmtWeekdayDay } from '@/lib/format';

export default function FeiraPage() {
  const data = useFarm();
  const now = useNow();
  if (!data) return <Loading />;
  return <Feira data={data} now={now} />;
}

function Feira({ data, now }: { data: FarmData; now: Date }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  useToastOffset(112); // the fixed copy bar is taller than the nav
  const list = data.list;
  const status = feiraStatus(data, now);
  const groups = stockGroups(data, now);
  const win = (list?.windowId as 'this' | 'next') ?? 'this';
  const stale = status.state === 'desatualizada';

  const regen = async () => {
    setBusy(true);
    await generateList(win, list);
    setBusy(false);
  };
  const setWindow = (w: 'this' | 'next') => list && list.windowId !== w && updateList(list, { windowId: w });
  const setItem = (item: AvailabilityItem, patch: Partial<AvailabilityItem>) =>
    list && updateList(list, { items: list.items.map(i => (i.id === item.id ? { ...i, ...patch } : i)) });
  const copy = async () => {
    const l = list ?? (await generateList(win));
    const ok = await sendList(l);
    showToast(ok ? t('feira.copied') : t('map.copyFailed'));
  };

  const included = list?.items.filter(i => i.isIncluded && i.quantity > 0).length ?? 0;
  const message = list ? (list.generatedMessage ?? generateAvailabilityMessage(list)) : '';

  return (
    <>
      <main className="kb-screen" style={{ paddingBottom: 'calc(120px + var(--safe-area-bottom))' }}>
        <ScreenHeader title={t('feira.title')} back={{ to: '/', label: t('paiol.backToFarm') }}
          right={<Link to="/feira/banca" className="kb-head-btn">{t('feira.stall')}</Link>} />

        <div role="group" aria-label={t('feira.period')} className="kb-segs">
          {(['this', 'next'] as const).map(w => (
            <button key={w} type="button" aria-pressed={win === w} className={`kb-seg ${win === w ? 'kb-seg-on' : ''}`} onClick={() => setWindow(w)} disabled={!list}>
              {t(`feira.window.${w}`)}
            </button>
          ))}
        </div>

        {(stale || !list) ? (
          <>
            <div className="flex items-center gap-2.5 rounded-[18px] bg-amber-soft px-3.5 py-3">
              <span className="flex-1 text-[15px] leading-[22px]">
                {!list ? t('feira.none') : status.harvestsAfter ? t('feira.staleHarvests', { count: status.harvestsAfter }) : t('feira.stale', { count: status.changes })}
              </span>
            </div>
            <button type="button" className="kb-tap kb-tap-go" onClick={regen} disabled={busy}>{list ? t('feira.update') : t('feira.build')}</button>
          </>
        ) : (
          <div key={list.id} className="kb-fresh flex items-center gap-2.5 rounded-[18px] bg-canopy-soft px-3.5 py-3">
            <span className="flex-1 text-[15px] leading-[22px]">
              <span className="font-medium text-canopy">{t('feira.fresh')}</span> {t('feira.freshMeta', { when: fmtWeekdayDay(list.createdAt), count: included })}
            </span>
          </div>
        )}

        {list && (
          <section aria-labelledby="barraca-t" className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 id="barraca-t" className="kb-h2">{t('map.atStall')}</h2>
              <span className="kb-sub">{t('feira.tapHint')}</span>
            </div>
            {[...list.items].sort((a, b) => a.sortOrder - b.sortOrder).map(item => {
              const g = groups.find(x => x.crop.id === item.cropId && (x.cultivar?.id ?? undefined) === (item.cultivarId ?? undefined));
              const on = item.isIncluded;
              const name = itemDisplayName(item);
              const warn = g && g.worst.state !== 'fresh' ? g.worst.tone : undefined;
              const note = !g ? t('map.feiraRow.sold')
                : warn ? `${lifeLabel(t, g.worst)}${on ? '' : ` · ${t('map.feiraRow.outOfList')}`}`
                : t('feira.inStock', { qty: fmtQty(g.total, g.unit) });
              return (
                <div key={item.id} className="flex items-center gap-2.5 rounded-2xl border-[1.5px] py-2.5 pl-3 pr-2.5 transition-[opacity,background-color] duration-200"
                  style={on ? { background: 'var(--surface-raised)', borderColor: 'var(--line)' } : { background: 'var(--surface)', borderColor: 'var(--line)', borderStyle: 'dashed', opacity: 0.55 }}>
                  <button type="button" role="switch" aria-checked={on} aria-label={t('feira.include', { name })} className="kb-switch" onClick={() => setItem(item, { isIncluded: !on })}><span /></button>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium leading-5">{name}</span>
                    <span className="text-[13px] leading-[18px]" style={warn ? { color: `var(--${warn})`, fontWeight: 500 } : { color: 'var(--ink-muted)' }}>{note}</span>
                  </div>
                  <button type="button" className="kb-icon-btn !rounded-[10px] !bg-surface" aria-label={t('feira.less', { name })} onClick={() => setItem(item, { quantity: Math.max(0, item.quantity - 1) })}><Icon name="minus" size={16} strokeWidth={2} /></button>
                  <span className="kb-mono min-w-14 text-center text-[15px]">{fmtNum(item.quantity)} {fmtUnit(item.unit, item.quantity)}</span>
                  <button type="button" className="kb-icon-btn !rounded-[10px] !bg-surface" aria-label={t('feira.more', { name })} onClick={() => setItem(item, { quantity: item.quantity + 1 })}><Icon name="plus" size={16} strokeWidth={2} /></button>
                </div>
              );
            })}
          </section>
        )}

        {list && (
          <section aria-labelledby="zap-t" className="flex flex-col gap-2.5">
            <h2 id="zap-t" className="kb-h2">{t('feira.preview')}</h2>
            <div className="rounded-[20px] p-3.5" style={{ background: 'var(--whatsapp-wall)' }}>
              <div className="ml-7 whitespace-pre-wrap rounded-[14px_4px_14px_14px] px-3 py-2.5 text-sm leading-[21px]" style={{ background: 'var(--whatsapp-bubble)', color: 'var(--whatsapp-ink)' }}>{message}</div>
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface-raised px-4 pt-3.5" style={{ paddingBottom: 'calc(24px + var(--safe-area-bottom))' }}>
        <button type="button" className="kb-tap kb-tap-go" onClick={copy}><Icon name="copy" size={22} />{t('feira.copy')}</button>
      </div>
    </>
  );
}
