/** Words and dot colors for what a weekly observation recorded ("sinais da mata") */

import type { TFunction } from 'i18next';
import type { Observation } from '@/domain/contracts/types';

export interface SignalChip { label: string; color: string }

export function observationChips(o: Observation, t: TFunction): SignalChip[] {
  const out: SignalChip[] = [];
  if (o.pollinators !== undefined) out.push({ label: t(`obs.pollinators.${o.pollinators}`), color: 'var(--canopy)' });
  if (o.soil !== undefined) out.push({ label: t(`obs.soil.${o.soil}`), color: 'var(--river)' });
  if (o.phase) out.push({ label: t(`obs.phase.${o.phase}`), color: 'var(--amber-bright)' });
  if (o.pest !== undefined && o.pest > 0) out.push({ label: t(`obs.pest.${o.pest}`), color: o.pest === 2 ? 'var(--urucum)' : 'var(--amber-bright)' });
  if (o.disease) out.push({ label: t(`obs.disease.${o.disease}`), color: 'var(--urucum)' });
  return out;
}
