/** Small pieces shared by many screens: product art, life bar, status pill, choice chips */

import { useState as useStateCompat, type ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { Crop, CropCategory } from '@/domain/contracts/types';
import type { LotLife } from '@/domain/rules/farm';
import { ART_INK, cropArt } from './crop';
import { cropSprite } from './Shell';
import { Icon } from './Icon';
import { fmtDate, fmtTime, fmtWeekdayDay, toLocalDateInput, toLocalInput } from '@/lib/format';

/** Pastel tile with the crate drawing when there is one, else the initial */
export function CropArt({ crop, categories, className = '', imgHeight, fontSize = 22, style }: {
  crop: Pick<Crop, 'name' | 'categoryId'>; categories: CropCategory[]; className?: string; imgHeight?: number; fontSize?: number; style?: React.CSSProperties;
}) {
  const img = cropSprite(crop.name);
  return (
    <span className={`flex flex-none items-center justify-center font-medium ${className}`} style={{ background: cropArt(crop, categories), color: ART_INK, fontSize, ...style }}>
      {img ? <img src={img} alt="" style={{ height: imgHeight, width: 'auto' }} /> : crop.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** "Fresco · 7 dias", "Vence em 3 dias", "Vence hoje", "Vencido há 1 dia" */
export function lifeLabel(t: TFunction, life: LotLife): string {
  switch (life.state) {
    case 'fresh': return t('life.fresh', { days: t('common.days', { count: life.days }) });
    case 'soon': return t('life.soon', { count: life.days });
    case 'today': return t('life.today');
    default: return t('life.expired', { count: -life.days });
  }
}

const BAR: Record<LotLife['tone'], string> = { canopy: 'var(--canopy)', amber: 'var(--amber-bright)', urucum: 'var(--urucum)' };

export function LifeBar({ life, className = '', track }: { life: LotLife; className?: string; track?: string }) {
  return (
    <div className={`kb-life ${className}`} style={track ? { background: track } : undefined} aria-hidden="true">
      <div style={{ width: `${Math.round(life.fraction * 100)}%`, background: BAR[life.tone] }} />
    </div>
  );
}

export const TONE_STYLE = {
  amber: { background: 'var(--amber-soft)', color: 'var(--amber)', dot: 'var(--amber-bright)' },
  river: { background: 'var(--river-soft)', color: 'var(--river)', dot: 'var(--river)' },
  canopy: { background: 'var(--canopy-soft)', color: 'var(--canopy)', dot: 'var(--canopy)' },
  urucum: { background: 'var(--urucum-soft)', color: 'var(--urucum)', dot: 'var(--urucum)' },
  muted: { background: 'var(--surface-sunken)', color: 'var(--ink-muted)', dot: 'var(--line-strong)' },
} as const;
export type Tone = keyof typeof TONE_STYLE;

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const s = TONE_STYLE[tone];
  return (
    <div className="kb-status-pill" style={{ background: s.background, color: s.color }}>
      <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
      {children}
    </div>
  );
}

/** Confirmation banner shown after saving ("Lote de animais ajustado") */
export function DoneBanner({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-2xl bg-canopy-soft p-3.5 font-medium text-canopy">
      <Icon name="check" size={20} strokeWidth={2.2} />
      {children}
    </div>
  );
}

/** Single choice as a row of chips, exposed as a radio group */
export function ChipChoice<T extends string>({ label, options, value, onChange, className = '' }: {
  label: string; options: { value: T; label: ReactNode }[]; value: T | undefined; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={`kb-chip ${value === o.value ? 'kb-chip-on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Label with "(opcional)" in muted weight */
export function OptionalLabel({ children, t }: { children: ReactNode; t: TFunction }) {
  return <span className="kb-label">{children} <span className="font-normal text-ink-muted">{t('common.optional')}</span></span>;
}

/** Loading state while the first snapshot arrives */
export function Loading() {
  return <main className="kb-screen kb-screen-flow" aria-busy="true" />;
}

/** "Quando · Agora, sex 30 out, 07:40" with a Mudar button that reveals a date field (never in the future) */
export function WhenRow({ label, value, onChange, t, dateOnly = false, hint }: {
  label: string; value: Date; onChange: (d: Date) => void; t: TFunction; dateOnly?: boolean; hint?: string;
}) {
  const [open, setOpen] = useStateCompat(false);
  const now = new Date();
  const isNow = Math.abs(now.getTime() - value.getTime()) < 120_000;
  const text = dateOnly
    ? `${sameDay(value, now) ? `${t('common.today')}, ` : ''}${fmtDate(value)}`
    : `${isNow ? `${t('common.now')} · ` : ''}${fmtWeekdayDay(value)}, ${fmtTime(value)}`;
  return (
    <div className="kb-card flex flex-col gap-2 rounded-2xl px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="kb-label">{label}</span>
          <span className="kb-sub">{text}{hint ? ` · ${hint}` : ''}</span>
        </span>
        <button type="button" className="kb-chip" aria-expanded={open} onClick={() => setOpen(!open)}>{t('common.change')}</button>
      </div>
      {open && (
        <input
          type={dateOnly ? 'date' : 'datetime-local'}
          className="kb-field kb-rise"
          aria-label={label}
          max={dateOnly ? toLocalDateInput(now) : toLocalInput(now)}
          value={dateOnly ? toLocalDateInput(value) : toLocalInput(value)}
          onChange={e => {
            if (!e.target.value) return;
            const d = new Date(dateOnly ? `${e.target.value}T12:00` : e.target.value);
            onChange(d > now ? now : d);
          }}
        />
      )}
    </div>
  );
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
