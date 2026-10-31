/** The farm tree: one branch per closed weekly ritual (Semente → Broto → Muda → Árvore) */

import type { TreeStage } from '@/domain/rules/farm';

export function TreeStageArt({ stage, width = 64, label }: { stage: TreeStage; width?: number; label?: string }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg width={width} height={(width * 120) / 64} viewBox="0 0 64 120" {...a11y}>
      <ellipse cx="32" cy="112" rx={stage === 'arvore' ? 28 : 26} ry="6" fill="#d9cbb0" />
      {stage === 'semente' && <ellipse cx="32" cy="104" rx="9" ry="7" fill="#8e6f45" />}
      {stage === 'broto' && (
        <>
          <path d="M32 110V86" stroke="#2d5a28" strokeWidth="4" strokeLinecap="round" />
          <path d="M32 92c0-10 8-14 16-14 0 9-7 14-16 14z" fill="#5f8f45" />
          <path d="M32 96c0-8-6-12-13-12 0 8 6 12 13 12z" fill="#7aa85c" />
        </>
      )}
      {stage === 'muda' && (
        <>
          <path d="M32 110V58" stroke="#6b4f2c" strokeWidth="5" strokeLinecap="round" />
          <circle cx="32" cy="56" r="18" fill="#5f8f45" /><circle cx="20" cy="72" r="10" fill="#7aa85c" /><circle cx="44" cy="70" r="11" fill="#2d5a28" />
        </>
      )}
      {stage === 'arvore' && (
        <>
          <path d="M32 110V40" stroke="#6b4f2c" strokeWidth="6" strokeLinecap="round" />
          <circle cx="32" cy="34" r="24" fill="#2d5a28" /><circle cx="14" cy="54" r="14" fill="#5f8f45" /><circle cx="50" cy="52" r="14" fill="#5f8f45" />
          <circle cx="22" cy="30" r="4" fill="#d79a2b" /><circle cx="42" cy="40" r="4" fill="#a3321c" /><circle cx="50" cy="56" r="4" fill="#d79a2b" />
        </>
      )}
    </svg>
  );
}
