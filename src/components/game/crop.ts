/**
 * Illustration colors for products: the pastel "art" behind a card and the dot that marks a
 * product in lists and plots. These are drawing colors, not UI tokens; text on them stays dark.
 */

import type { Crop, CropCategory } from '@/domain/contracts/types';

const BY_TYPE: Record<string, [string, string]> = {
  fruits: ['#f3e5c0', '#d79a2b'],
  vegetables: ['#d9e9cc', '#2d5a28'],
  herbs: ['#d1e6ec', '#1d5d70'],
  roots: ['#f5dcd3', '#a3321c'],
  nuts: ['#e5e1d3', '#857c66'],
  grains: ['#e5e1d3', '#857c66'],
  forage: ['#cfe5b4', '#5f8f45'],
  custom: ['#e5e1d3', '#857c66'],
};

const BY_CATEGORY: Record<string, [string, string]> = {
  'cat-eggs': ['#f3e5c0', '#d79a2b'],
  'cat-dairy': ['#d1e6ec', '#1d5d70'],
  'cat-meat': ['#f5dcd3', '#a3321c'],
  'cat-honey': ['#f3e5c0', '#b8860b'],
};

const BY_NAME: [string, string][] = [
  ['banana', '#d79a2b'], ['guandu', '#1d5d70'], ['abóbora', '#a3321c'], ['ingá', '#2d5a28'], ['cacau', '#b5651d'],
  ['mandioca', '#a3321c'], ['tomate', '#d9412b'], ['alface', '#2d5a28'], ['coentro', '#1d5d70'], ['manjericão', '#7fc4d6'],
  ['batata', '#e3a08a'], ['feijão', '#b39b6a'], ['capim', '#7fae52'], ['braquiária', '#8fbf5a'], ['tifton', '#9cc96a'], ['capiaçu', '#6f9f45'],
];

export const ART_INK = '#1e2316';

function pair(crop: Pick<Crop, 'categoryId'>, categories: CropCategory[]): [string, string] {
  if (BY_CATEGORY[crop.categoryId]) return BY_CATEGORY[crop.categoryId];
  const cat = categories.find(c => c.id === crop.categoryId);
  return BY_TYPE[cat?.type ?? 'custom'] ?? BY_TYPE.custom;
}

export function cropArt(crop: Pick<Crop, 'categoryId'>, categories: CropCategory[]): string {
  return pair(crop, categories)[0];
}

export function cropDot(crop: Pick<Crop, 'categoryId' | 'name'>, categories: CropCategory[]): string {
  const n = crop.name.toLowerCase();
  return BY_NAME.find(([k]) => n.includes(k))?.[1] ?? pair(crop, categories)[1];
}

/** Category dot only (lists grouped by category) */
export function categoryDot(crop: Pick<Crop, 'categoryId'>, categories: CropCategory[]): string {
  return pair(crop, categories)[1];
}
