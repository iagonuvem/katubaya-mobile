/**
 * Processar: one product in stock becomes another (leite → queijo). Uses the lots closest to
 * expiry first and links each consumed lot to the new one.
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { derivedOf, processableStock, round1, stockGroups, type FarmData } from '@/domain/rules/farm';
import { planFifoConsumption } from '@/domain/rules/processing';
import { processStock } from '@/data/actions';
import { ScreenHeader } from '@/components/game/Shell';
import { Icon } from '@/components/game/Icon';
import { DoneBanner, Loading } from '@/components/game/bits';
import { showToast } from '@/components/game/toast';
import { fmtDdMm, fmtNum, fmtNum1, fmtQty, fmtUnit, parseNum } from '@/lib/format';

export default function ProcessPage() {
  const data = useFarm();
  const now = useNow();
  if (!data) return <Loading />;
  return <Process data={data} now={now} />;
}

function Process({ data, now }: { data: FarmData; now: Date }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const groups = stockGroups(data, now);
  const inputs = processableStock(groups, data.crops);
  const [inp, setInp] = useState<string | undefined>(params.get('entrada') ?? undefined);
  const cur = inputs.find(i => i.crop.id === inp) ?? inputs[0];
  const [q, setQ] = useState(() => Math.min(10, Math.floor(cur?.total ?? 0)) || 1);
  // Outputs made most often come first
  const made = (id: string) => data.harvests.filter(h => h.cropId === id).length;
  const outsOf = (id: string) => derivedOf(id, data.crops).sort((a, b) => made(b.id) - made(a.id));
  const outs = cur ? outsOf(cur.crop.id) : [];
  const [out, setOut] = useState(outs[0]?.id);
  const [oq, setOq] = useState('1,0');
  const [done, setDone] = useState<{ summary: string; lotId: string; name: string; output: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const header = <ScreenHeader title={t('process.title')} sub={t('process.sub')} size="md" back={{ to: '/', label: t('common.close'), icon: 'close' }} />;
  if (!cur) {
    return (
      <main className="kb-screen kb-screen-flow">
        {header}
        <p className="kb-card m-0 rounded-[18px] p-4 text-ink-muted">{t('process.nothing')}</p>
        <Link to="/paiol" className="kb-tap kb-tap-alt">{t('map.seeStock')}</Link>
      </main>
    );
  }

  const output = data.crops.find(c => c.id === out) ?? outs[0];
  const lots = groups.filter(g => g.crop.id === cur.crop.id && g.unit === cur.unit).flatMap(g => g.lots).sort((a, b) => a.expiresAtEstimate.localeCompare(b.expiresAtEstimate));
  const over = q > cur.total;
  let left = q;
  const plan = lots.map(l => {
    const use = Math.max(0, Math.min(l.quantityRemaining, left));
    left = round1(left - use);
    return { l, use };
  });
  const outQty = round1(parseNum(oq));
  const ok = q > 0 && !over && outQty > 0 && !!output;
  const summary = output ? `${fmtQty(q, cur.unit)} ${cur.crop.name} → ${fmtNum1(outQty)} ${fmtUnit(output.defaultUnit, outQty)} ${output.name}` : '';

  const pickInput = (id: string) => {
    const next = inputs.find(i => i.crop.id === id);
    setInp(id);
    setQ(Math.min(10, Math.floor(next?.total ?? 0)) || 1);
    setOut(outsOf(id)[0]?.id);
  };
  const save = async () => {
    if (!ok || busy) return;
    planFifoConsumption(lots, q); // throws before writing if stock moved meanwhile
    setBusy(true);
    try {
      const r = await processStock({ cropId: cur.crop.id, unit: cur.unit, quantity: q }, { cropId: output.id, quantity: outQty, unit: output.defaultUnit });
      setDone({ summary, lotId: r.lotId, name: cur.crop.name, output: output.name });
    } catch {
      showToast(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <main className="kb-screen kb-screen-flow">
        {header}
        <div className="kb-pop flex flex-1 flex-col gap-3.5">
          <DoneBanner>{t('process.done')}</DoneBanner>
          <div className="kb-card flex flex-col gap-3 p-3.5">
            <span className="kb-mono text-lg font-medium">{done.summary}</span>
            <span className="kb-sub">{t('process.doneMeta', { input: done.name, output: done.output })}</span>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2.5">
            <Link to={`/paiol/lote/${done.lotId}`} className="kb-tap kb-tap-alt">{t('process.trace')}</Link>
            <Link to="/" className="kb-tap kb-tap-go">{t('harvest.backToFarm')}</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="kb-screen kb-screen-flow">
      {header}
      <section className="kb-card flex flex-col gap-3 p-3.5" aria-labelledby="in-t">
        <span id="in-t" className="kb-label">{t('process.in')}</span>
        <div role="radiogroup" aria-label={t('process.inLabel')} className="flex flex-wrap gap-2">
          {inputs.map(i => <button key={i.crop.id} type="button" role="radio" aria-checked={inp === i.crop.id} className={`kb-chip ${inp === i.crop.id ? 'kb-chip-on' : ''}`} onClick={() => pickInput(i.crop.id)}>{i.crop.name}</button>)}
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <span className="flex flex-col">
            <span className="kb-sub">{t('process.qty', { unit: fmtUnit(cur.unit, 2) })}</span>
            <span className="kb-mono text-[32px] font-medium leading-[38px]" style={{ color: over ? 'var(--urucum)' : 'var(--ink)' }} aria-live="polite">{fmtQty(q, cur.unit)}</span>
          </span>
          <div className="flex gap-2">
            <button type="button" className="kb-stepper kb-stepper-sm !bg-surface" aria-label={t('process.less', { unit: fmtUnit(cur.unit) })} onClick={() => setQ(Math.max(1, q - 1))}><Icon name="minus" size={22} strokeWidth={2} /></button>
            <button type="button" className="kb-stepper kb-stepper-sm !bg-surface" aria-label={t('process.more', { unit: fmtUnit(cur.unit) })} onClick={() => setQ(q + 1)}><Icon name="plus" size={22} strokeWidth={2} /></button>
          </div>
        </div>
        {over && <span role="alert" className="text-sm font-medium text-urucum">{t('process.over', { qty: fmtQty(cur.total, cur.unit) })}</span>}
        <span className="kb-sub">{t('process.fifo', { qty: fmtQty(cur.total, cur.unit) })}</span>
        <div className="flex flex-col gap-2">
          {plan.map(({ l, use }) => (
            <div key={l.id} className="flex items-center gap-2.5 text-sm leading-5">
              <span className="w-24 flex-none">
                <span className="block font-medium">{t('process.lot', { date: fmtDdMm(l.harvestedAt) })}</span>
                <span className="block text-xs leading-4" style={{ color: `var(--${l.life.tone})` }}>{l.life.days <= 0 ? t('life.today') : t('process.expires', { count: l.life.days })}</span>
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <div className="h-full transition-[width] duration-300" style={{ width: `${Math.round((use / l.quantityRemaining) * 100)}%`, background: use ? 'var(--river)' : 'transparent' }} />
              </div>
              <span className="kb-mono w-[72px] text-right text-[13px]">{use ? '−' : ''}{fmtNum(use)} {t('process.of')} {fmtNum(l.quantityRemaining)}</span>
            </div>
          ))}
        </div>
      </section>

      <div aria-hidden="true" className="-my-2 flex h-11 w-11 items-center justify-center self-center rounded-full bg-canopy text-canopy-on"><Icon name="arrowDown" size={22} strokeWidth={2.2} /></div>

      <section className="kb-card flex flex-col gap-3 p-3.5" aria-labelledby="out-t">
        <span id="out-t" className="kb-label">{t('process.out')}</span>
        <div role="radiogroup" aria-label={t('process.out')} className="flex flex-wrap gap-2">
          {outs.map(o => <button key={o.id} type="button" role="radio" aria-checked={output?.id === o.id} className={`kb-chip ${output?.id === o.id ? 'kb-chip-on' : ''}`} onClick={() => setOut(o.id)}>{o.name}</button>)}
          <Link to="/produtos/nova" className="kb-chip kb-chip-dashed">{t('process.newProduct')}</Link>
        </div>
        {output && (
          <>
            <div className="flex items-center justify-between gap-2.5">
              <label className="flex flex-col">
                <span className="kb-sub">{t('process.outQty', { unit: fmtUnit(output.defaultUnit, 2) })}</span>
                <span className="flex items-baseline gap-1.5">
                  <input type="text" inputMode="decimal" value={oq} onChange={e => setOq(e.target.value)} className="kb-mono w-24 border-0 bg-transparent p-0 text-[32px] font-medium leading-[38px] text-ink" />
                  <span className="kb-mono text-[32px] font-medium">{fmtUnit(output.defaultUnit, outQty)}</span>
                </span>
              </label>
              <div className="flex gap-2">
                <button type="button" className="kb-stepper kb-stepper-sm !bg-surface" aria-label={t('process.outLess', { unit: fmtUnit(output.defaultUnit) })} onClick={() => setOq(fmtNum1(Math.max(0, outQty - 0.1)))}><Icon name="minus" size={22} strokeWidth={2} /></button>
                <button type="button" className="kb-stepper kb-stepper-sm !bg-surface" aria-label={t('process.outMore', { unit: fmtUnit(output.defaultUnit) })} onClick={() => setOq(fmtNum1(outQty + 0.1))}><Icon name="plus" size={22} strokeWidth={2} /></button>
              </div>
            </div>
            <span className="kb-sub">{t('process.outMeta', { name: output.name, count: output.shelfLifeDaysDefault })}</span>
          </>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2">
        <span className="kb-mono text-center text-[15px]">{summary}</span>
        <button type="button" className={`kb-tap ${ok ? 'kb-tap-go' : 'kb-tap-off'}`} aria-disabled={!ok} onClick={save}>{t('process.save')}</button>
      </div>
    </main>
  );
}
