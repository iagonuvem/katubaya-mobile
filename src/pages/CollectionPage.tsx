/** Produtos: the collection of product cards (from the field and from the animals) */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm } from '@/hooks/useFarm';
import { BottomNav, ScreenHeader } from '@/components/game/Shell';
import { ProductTabs } from '@/components/game/ProductTabs';
import { Icon } from '@/components/game/Icon';
import { CropArt, Loading } from '@/components/game/bits';
import { fmtMoney, fmtUnit } from '@/lib/format';

export default function CollectionPage() {
  const { t } = useTranslation();
  const data = useFarm();
  const [cat, setCat] = useState('all');
  if (!data) return <Loading />;

  const cats = data.categories.filter(c => data.crops.some(p => p.categoryId === c.id));
  const shown = data.crops.filter(c => cat === 'all' || c.categoryId === cat);
  const catName = (id: string) => data.categories.find(c => c.id === id)?.name ?? '';

  return (
    <>
      <main className="kb-screen kb-screen-nav !gap-3.5">
        <ScreenHeader title={t('collection.title')} back={{ to: '/', label: t('paiol.backToFarm') }}
          sub={t('collection.sub', { cards: data.crops.length, cats: cats.length, count: data.cultivars.length })} />
        <ProductTabs current="products" />

        <div className="flex flex-wrap gap-2" role="group" aria-label={t('collection.filter')}>
          {[{ id: 'all', name: t('collection.all') }, ...cats].map(c => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} className={`kb-chip ${cat === c.id ? 'kb-chip-ink' : ''}`} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {shown.map(c => {
            const vars = data.cultivars.filter(v => v.cropId === c.id);
            const meta = [fmtUnit(c.defaultUnit, 1), c.shelfLifeDaysDefault ? t('common.days', { count: c.shelfLifeDaysDefault }) : null,
              vars.length === 1 ? vars[0].name : vars.length > 1 ? t('collection.varieties', { count: vars.length }) : null].filter(Boolean).join(' · ');
            return (
              <Link key={c.id} to={`/produtos/${c.id}`}
                className="relative flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-line bg-surface-raised px-2 pb-3 pt-2 text-ink no-underline transition-transform hover:-translate-y-0.5 hover:-rotate-[.5deg]"
                style={{ boxShadow: '0 4px 0 var(--line)' }}>
                <span className="relative flex h-24 items-center justify-center overflow-hidden rounded-[14px]">
                  <CropArt crop={c} categories={data.categories} className="absolute inset-0" imgHeight={84} fontSize={40} />
                  <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium leading-[18px]" style={{ background: 'rgba(250,248,242,.85)', color: '#1e2316' }}>{catName(c.categoryId)}</span>
                  {c.isFavorite && <Icon name="star" fill size={20} label={t('collection.favorite')} className="absolute right-2 top-2" style={{ color: '#b8860b' }} />}
                </span>
                <span className="px-1 text-[17px] font-medium leading-[22px]">{c.name}</span>
                {c.shelfLifeDaysDefault
                  ? <span className="px-1 text-[13px] leading-[18px] text-ink-muted">{meta}</span>
                  : <span className="px-1 text-[13px] font-medium leading-[18px] text-amber">{fmtUnit(c.defaultUnit, 1)} · {t('collection.noShelf')}</span>}
                <span className="kb-mono px-1 text-sm">{c.pricePerUnit ? `${fmtMoney(c.pricePerUnit)}/${fmtUnit(c.defaultUnit)}` : t('common.noPrice')}</span>
              </Link>
            );
          })}
          <Link to="/produtos/nova" className="flex min-h-[200px] flex-col items-center justify-center gap-2.5 rounded-[20px] border-[1.5px] border-dashed border-line-strong text-ink no-underline">
            <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-canopy text-canopy-on" style={{ boxShadow: '0 4px 0 var(--canopy-edge)' }}><Icon name="plus" size={28} strokeWidth={2.2} /></span>
            <span className="font-medium">{t('collection.newCard')}</span>
            <span className="text-center text-[13px] leading-[18px] text-ink-muted">{t('collection.newCardHint')}</span>
          </Link>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
