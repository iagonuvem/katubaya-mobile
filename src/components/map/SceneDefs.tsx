/**
 * Reusable SVG symbols for the farm scene: plants, trees and animals drawn in the canvas style.
 * Rendered once inside each scene <svg>; tiles reference them with <use href="#id">.
 */

export type PlantSprite = 'ban' | 'gua' | 'abo' | 'arv' | 'cac' | 'man' | 'tom' | 'alf' | 'coe' | 'grass';
export type AnimalSprite = 'cow' | 'hen' | 'hen2' | 'pig' | 'sheep' | 'goat' | 'hive';

const SHADOW = 'rgba(30,35,22,.2)';

export function SceneDefs({ prefix = '' }: { prefix?: string }) {
  const id = (n: string) => `${prefix}${n}`;
  return (
    <defs>
      <g id={id('tuft')}><path d="M0 0l-3-7M0 0l0-8M0 0l3-7" stroke="#6f9f45" strokeWidth="1.6" strokeLinecap="round" fill="none" /></g>
      <g id={id('ban')}>
        <ellipse cx="3" cy="14" rx="14" ry="5" fill={SHADOW} /><rect x="-2" y="-2" width="4" height="16" rx="2" fill="#7a8f3a" />
        <ellipse cx="-9" cy="-6" rx="12" ry="5" fill="#4f9a3a" transform="rotate(-30 -9 -6)" /><ellipse cx="9" cy="-6" rx="12" ry="5" fill="#5fae45" transform="rotate(30 9 -6)" />
        <ellipse cx="0" cy="-11" rx="5" ry="11" fill="#6cbf4f" /><circle cx="4" cy="3" r="3.5" fill="#e6c13b" />
      </g>
      <g id={id('gua')}><ellipse cx="2" cy="7" rx="8" ry="3" fill="rgba(30,35,22,.18)" /><circle cx="0" cy="0" r="7" fill="#7ab24f" /><circle cx="-2" cy="-2" r="3" fill="#9ccc6a" /><circle cx="3" cy="2" r="1.5" fill="#e6c13b" /></g>
      <g id={id('abo')}><ellipse cx="0" cy="0" rx="10" ry="7" fill="#5f9a3a" /><circle cx="5" cy="2" r="4.5" fill="#e08a2c" /></g>
      <g id={id('arv')}><ellipse cx="5" cy="20" rx="22" ry="7" fill="rgba(30,35,22,.22)" /><rect x="-3" y="4" width="6" height="16" rx="2" fill="#6b4f2c" /><circle cx="0" cy="-4" r="21" fill="#2f6b2a" /><circle cx="-7" cy="-11" r="9" fill="#3f8a35" /></g>
      <g id={id('cac')}><ellipse cx="3" cy="11" rx="12" ry="4" fill={SHADOW} /><rect x="-1.5" y="2" width="3" height="9" fill="#6b4f2c" /><circle cx="0" cy="-2" r="11" fill="#3e7d33" /><ellipse cx="-4" cy="3" rx="2.5" ry="4" fill="#b5651d" /><ellipse cx="5" cy="1" rx="2.5" ry="4" fill="#c8862a" /></g>
      <g id={id('man')}>
        <ellipse cx="2" cy="7" rx="8" ry="3" fill="rgba(30,35,22,.18)" />
        <g fill="#6aa84f"><ellipse cx="0" cy="-6" rx="2.5" ry="7" /><ellipse cx="-6" cy="-2" rx="2.5" ry="7" transform="rotate(-60 -6 -2)" /><ellipse cx="6" cy="-2" rx="2.5" ry="7" transform="rotate(60 6 -2)" /></g>
        <circle cx="0" cy="0" r="2" fill="#a3321c" />
      </g>
      <g id={id('tom')}><circle cx="0" cy="0" r="7" fill="#4e9a3a" /><circle cx="-3" cy="2" r="2.2" fill="#d9412b" /><circle cx="3" cy="-1" r="2.2" fill="#d9412b" /></g>
      <g id={id('alf')}><circle cx="0" cy="0" r="7" fill="#a8d86a" /><circle cx="0" cy="0" r="4" fill="#c8ec8c" /></g>
      <g id={id('coe')}><circle cx="-3" cy="1" r="3" fill="#5aa04a" /><circle cx="3" cy="1" r="3" fill="#4d9140" /><circle cx="0" cy="-3" r="3" fill="#69b257" /></g>
      <g id={id('grass')}><path d="M-8 6l2-10M-3 6l-1-12M2 6l3-13M7 6l-2-10" stroke="#3f7d2c" strokeWidth="2" strokeLinecap="round" fill="none" /></g>
      <g id={id('tree')}><ellipse cx="6" cy="18" rx="22" ry="7" fill={SHADOW} /><circle cx="0" cy="0" r="22" fill="#4c8a3a" /><circle cx="-8" cy="-8" r="10" fill="#5fa047" /></g>
      <g id={id('cow')}>
        <ellipse cx="3" cy="15" rx="20" ry="4" fill={SHADOW} /><rect x="-14" y="8" width="4" height="8" fill="#d8d2c0" /><rect x="8" y="8" width="4" height="8" fill="#d8d2c0" />
        <rect x="-16" y="-8" width="30" height="18" rx="8" fill="#faf8f2" /><ellipse cx="-6" cy="-2" rx="6" ry="4" fill="#2b2b2b" /><ellipse cx="7" cy="4" rx="4" ry="3" fill="#2b2b2b" />
        <rect x="12" y="-11" width="12" height="12" rx="4" fill="#faf8f2" /><rect x="18" y="-4" width="7" height="5" rx="2" fill="#e8a7a0" /><circle cx="16" cy="-7" r="1.3" fill="#1e2316" />
        <path d="M13 -11l-3 -3M22 -11l2 -3" stroke="#d9c39a" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g id={id('hen')}>
        <ellipse cx="1" cy="6" rx="6" ry="2" fill={SHADOW} /><ellipse cx="0" cy="0" rx="6" ry="5" fill="#faf8f2" /><circle cx="5" cy="-4" r="3.2" fill="#faf8f2" />
        <path d="M4 -8l1 -2 1 2z" fill="#a3321c" /><path d="M8 -4l3 1 -3 1z" fill="#d79a2b" /><circle cx="5.6" cy="-4.4" r=".8" fill="#1e2316" />
      </g>
      <g id={id('hen2')}>
        <ellipse cx="1" cy="6" rx="6" ry="2" fill={SHADOW} /><ellipse cx="0" cy="0" rx="6" ry="5" fill="#c07a3c" /><circle cx="5" cy="-4" r="3.2" fill="#c07a3c" />
        <path d="M4 -8l1 -2 1 2z" fill="#a3321c" /><path d="M8 -4l3 1 -3 1z" fill="#d79a2b" /><circle cx="5.6" cy="-4.4" r=".8" fill="#1e2316" />
      </g>
      <g id={id('pig')}>
        <ellipse cx="1" cy="10" rx="14" ry="3" fill={SHADOW} /><rect x="-9" y="6" width="3" height="5" fill="#e08f86" /><rect x="6" y="6" width="3" height="5" fill="#e08f86" />
        <ellipse cx="0" cy="0" rx="13" ry="9" fill="#f2b6ae" /><circle cx="11" cy="-2" r="6" fill="#f2b6ae" /><ellipse cx="16" cy="-1" rx="2.6" ry="2.2" fill="#e08f86" />
        <path d="M9 -8l2 -3 2 3z" fill="#e08f86" /><circle cx="12" cy="-4" r=".9" fill="#1e2316" /><path d="M-13 -2q-4 -2 -2 -5" stroke="#e08f86" strokeWidth="1.5" fill="none" />
      </g>
      <g id={id('sheep')}>
        <ellipse cx="1" cy="10" rx="13" ry="3" fill={SHADOW} /><rect x="-7" y="5" width="3" height="6" fill="#3b3b3b" /><rect x="5" y="5" width="3" height="6" fill="#3b3b3b" />
        <circle cx="-6" cy="0" r="6" fill="#f3eedf" /><circle cx="1" cy="-3" r="7" fill="#f3eedf" /><circle cx="6" cy="1" r="6" fill="#f3eedf" />
        <ellipse cx="13" cy="-2" rx="4" ry="5" fill="#3b3b3b" /><circle cx="14" cy="-3" r=".9" fill="#faf8f2" />
      </g>
      <g id={id('goat')}>
        <ellipse cx="1" cy="10" rx="13" ry="3" fill={SHADOW} /><rect x="-8" y="4" width="3" height="7" fill="#7a5636" /><rect x="6" y="4" width="3" height="7" fill="#7a5636" />
        <rect x="-11" y="-6" width="22" height="12" rx="6" fill="#b5895a" /><rect x="9" y="-12" width="9" height="10" rx="3" fill="#b5895a" />
        <path d="M11 -12l-2 -4M15 -12l1 -4" stroke="#5a3f24" strokeWidth="1.6" strokeLinecap="round" /><circle cx="14" cy="-8" r=".9" fill="#1e2316" />
      </g>
      <g id={id('hive')}>
        <ellipse cx="2" cy="12" rx="14" ry="3" fill={SHADOW} /><rect x="-10" y="-10" width="22" height="22" rx="2" fill="#e6c13b" stroke="#a88a58" strokeWidth="1.5" />
        <path d="M-10 -3h22M-10 4h22" stroke="#a88a58" strokeWidth="1.5" /><rect x="-12" y="-13" width="26" height="4" rx="1" fill="#c8935a" />
      </g>
    </defs>
  );
}

/** Picks the drawing for a product: by name when we drew it, else by its stratum */
export function plantSprite(name: string, layer?: string): PlantSprite {
  const n = name.toLowerCase();
  const byName: [string, PlantSprite][] = [
    ['banana', 'ban'], ['guandu', 'gua'], ['abóbora', 'abo'], ['ingá', 'arv'], ['abacate', 'arv'], ['castanha', 'arv'], ['cacau', 'cac'],
    ['mandioca', 'man'], ['tomate', 'tom'], ['alface', 'alf'], ['coentro', 'coe'], ['manjericão', 'coe'], ['batata', 'abo'], ['feijão', 'coe'],
    ['capim', 'grass'], ['braquiária', 'grass'], ['tifton', 'grass'], ['capiaçu', 'grass'],
  ];
  const hit = byName.find(([k]) => n.includes(k));
  if (hit) return hit[1];
  switch (layer) {
    case 'emergente': return 'arv';
    case 'alto': return 'cac';
    case 'medio': return 'gua';
    case 'rasteiro': return 'abo';
    case 'pasto': return 'grass';
    default: return 'alf';
  }
}
