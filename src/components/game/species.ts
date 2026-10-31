/** Icon and tint for each species of animal lot */

import type { Species } from '@/domain/contracts/types';
import type { IconName } from './Icon';
import type { Tone } from './bits';

export const SPECIES_ICON: Record<Species, IconName> = {
  cattle: 'cattle', poultry: 'poultry', swine: 'swine', goat: 'paw', sheep: 'paw', bees: 'bees', fish: 'fish', other: 'paw',
};

export const SPECIES_TONE: Record<Species, Tone> = {
  cattle: 'river', poultry: 'amber', swine: 'canopy', goat: 'canopy', sheep: 'canopy', bees: 'amber', fish: 'river', other: 'canopy',
};

export const SPECIES_LIST: Species[] = ['cattle', 'poultry', 'swine', 'goat', 'sheep', 'bees', 'fish', 'other'];

/** The sprite used for the species in the pen drawings */
export const SPECIES_SPRITE: Record<Species, string> = {
  cattle: 'cow', poultry: 'hen', swine: 'pig', goat: 'goat', sheep: 'sheep', bees: 'hive', fish: 'hen', other: 'sheep',
};
