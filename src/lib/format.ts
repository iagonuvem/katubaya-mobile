/**
 * Locale-aware formatting. Numbers, money and dates follow the active i18n language.
 */

import i18n from '@/i18n';
import type { UnitType } from '@/domain/contracts/types';

const lang = () => (i18n.language === 'en' ? 'en' : 'pt-BR');

/** 12 · 3,4 · 0,5 (one decimal at most) */
export function fmtNum(n: number, decimals = 1): string {
  return new Intl.NumberFormat(lang(), { maximumFractionDigits: decimals }).format(n);
}

/** Always one decimal: 1,0 · 3,4 */
export function fmtNum1(n: number): string {
  return new Intl.NumberFormat(lang(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}

export function fmtMoney(n: number, compact = false): string {
  return new Intl.NumberFormat(lang(), {
    style: 'currency', currency: 'BRL', maximumFractionDigits: compact ? 0 : 2, minimumFractionDigits: compact ? 0 : 2,
  }).format(n);
}

/** Unit label for a quantity: "kg", "maços", "unid" */
export function fmtUnit(unit: UnitType, count = 1): string {
  return i18n.t(`units.${unit}`, { count });
}

/** "16 kg", "3 maços" */
export function fmtQty(n: number, unit: UnitType): string {
  return `${fmtNum(n)} ${fmtUnit(unit, n)}`;
}

const df = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(lang(), opts);
const clean = (s: string) => s.replace(/\./g, '').replace(/ de /g, ' ');

/** 26 out */
export const fmtDayMonth = (d: Date | string) => clean(df({ day: 'numeric', month: 'short' }).format(new Date(d)));
/** 30/10 */
export const fmtDdMm = (d: Date | string) => df({ day: '2-digit', month: '2-digit' }).format(new Date(d));
/** 30/10/2026 */
export const fmtDate = (d: Date | string) => df({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
/** 07:40 */
export const fmtTime = (d: Date | string) => df({ hour: '2-digit', minute: '2-digit' }).format(new Date(d));
/** sex */
export const fmtWeekday = (d: Date | string) => clean(df({ weekday: 'short' }).format(new Date(d)));
/** sex, 30 out */
export const fmtWeekdayDay = (d: Date | string) => `${fmtWeekday(d)}, ${fmtDayMonth(d)}`;
/** jun 2026 */
export const fmtMonthYear = (d: Date | string) => clean(df({ month: 'short', year: 'numeric' }).format(new Date(d)));

/** Input value for <input type="datetime-local"> in local time */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function toLocalDateInput(d: Date): string {
  return toLocalInput(d).slice(0, 10);
}

/** Parses "3,5" or "3.5" */
export function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
