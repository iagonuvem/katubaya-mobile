/**
 * Seed data: "Sítio Pé de Serra", the demo farm drawn in the design canvas.
 * Dates are relative to the first run so the map always shows a living week.
 */

import { db } from './schema';
import type {
  AnimalAdjustment,
  AnimalGroup,
  AppSettings,
  AvailabilityConfig,
  AvailabilityList,
  Crop,
  CropCategory,
  Cultivar,
  HarvestEvent,
  InventoryAdjustment,
  Lot,
  Observation,
  Planting,
  RitualWeek,
  UnitType,
  Zone,
} from '@/domain/contracts/types';
import { generateAvailabilityMessage } from '@/domain/rules/availability';

type Seeded<T> = Omit<T, 'createdAt' | 'updatedAt'>;

/** Never in the future: a seed opened at 3 a.m. must not hold today's 7 a.m. harvest yet */
const notAfterNow = (d: Date): string => {
  const limit = Date.now() - 10 * 60_000;
  return new Date(Math.min(d.getTime(), limit)).toISOString();
};

/** ISO date `days` ago at `hour`:`minute` local time */
const at = (days: number, hour = 7, minute = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return notAfterNow(d);
};
/** Shelf-life arithmetic: may land in the future */
const plusDays = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};
const later = (iso: string, hours: number): string => notAfterNow(new Date(new Date(iso).getTime() + hours * 3_600_000));

export const DEFAULT_CATEGORIES: Seeded<CropCategory>[] = [
  { id: 'cat-fruits', name: 'Frutas', type: 'fruits', sortOrder: 0 },
  { id: 'cat-vegetables', name: 'Hortaliças', type: 'vegetables', sortOrder: 1 },
  { id: 'cat-grains', name: 'Grãos', type: 'grains', sortOrder: 2 },
  { id: 'cat-herbs', name: 'Ervas', type: 'herbs', sortOrder: 3 },
  { id: 'cat-nuts', name: 'Castanhas', type: 'nuts', sortOrder: 4 },
  { id: 'cat-roots', name: 'Raízes', type: 'roots', sortOrder: 5 },
  { id: 'cat-eggs', name: 'Ovos', type: 'animal', sortOrder: 6 },
  { id: 'cat-dairy', name: 'Laticínios', type: 'animal', sortOrder: 7 },
  { id: 'cat-meat', name: 'Carnes', type: 'animal', sortOrder: 8 },
  { id: 'cat-honey', name: 'Mel', type: 'animal', sortOrder: 9 },
  { id: 'cat-forage', name: 'Adubo e pasto', type: 'forage', sortOrder: 10 },
];

export const SAMPLE_CROPS: Seeded<Crop>[] = [
  { id: 'crop-banana', categoryId: 'cat-fruits', name: 'Banana', defaultUnit: 'kg', shelfLifeDaysDefault: 7, pricePerUnit: 6.5, isFavorite: true, layer: 'alto', cycleDays: 365,
    guildTags: ['Matéria orgânica', 'Sombra', 'Ciclagem de nutrientes'], notes: 'Cacho maduro na linha de baixo amadurece antes. Guardar na sombra.' },
  { id: 'crop-tomate', categoryId: 'cat-vegetables', name: 'Tomate', defaultUnit: 'kg', shelfLifeDaysDefault: 7, pricePerUnit: 8, isFavorite: true, layer: 'medio', cycleDays: 75 },
  { id: 'crop-abacate', categoryId: 'cat-fruits', name: 'Abacate', defaultUnit: 'unit', shelfLifeDaysDefault: 5, pricePerUnit: 4, isFavorite: true, layer: 'emergente', guildTags: ['Sombra'] },
  { id: 'crop-mandioca', categoryId: 'cat-roots', name: 'Mandioca', defaultUnit: 'kg', shelfLifeDaysDefault: 7, pricePerUnit: 5, isFavorite: false, layer: 'baixo', cycleDays: 300 },
  { id: 'crop-cacau', categoryId: 'cat-fruits', name: 'Cacau', defaultUnit: 'kg', shelfLifeDaysDefault: 0, isFavorite: false, layer: 'medio', guildTags: ['Sombra'] },
  { id: 'crop-coentro', categoryId: 'cat-herbs', name: 'Coentro', defaultUnit: 'bunch', shelfLifeDaysDefault: 4, pricePerUnit: 4, isFavorite: false, layer: 'baixo', cycleDays: 45 },
  { id: 'crop-alface', categoryId: 'cat-vegetables', name: 'Alface', defaultUnit: 'unit', shelfLifeDaysDefault: 5, pricePerUnit: 3, isFavorite: false, layer: 'baixo', cycleDays: 50 },
  { id: 'crop-castanha', categoryId: 'cat-nuts', name: 'Castanha-do-pará', defaultUnit: 'kg', shelfLifeDaysDefault: 90, pricePerUnit: 80, isFavorite: false, layer: 'emergente' },
  { id: 'crop-manjericao', categoryId: 'cat-herbs', name: 'Manjericão', defaultUnit: 'bunch', shelfLifeDaysDefault: 5, pricePerUnit: 5, isFavorite: false, layer: 'baixo', cycleDays: 60 },
  { id: 'crop-batata-doce', categoryId: 'cat-roots', name: 'Batata-doce', defaultUnit: 'kg', shelfLifeDaysDefault: 14, pricePerUnit: 7, isFavorite: false, layer: 'rasteiro', cycleDays: 120 },
  { id: 'crop-feijao', categoryId: 'cat-grains', name: 'Feijão', defaultUnit: 'kg', shelfLifeDaysDefault: 180, pricePerUnit: 10, isFavorite: false, layer: 'baixo', cycleDays: 90, guildTags: ['Fixação de nitrogênio'] },
  { id: 'crop-abobora', categoryId: 'cat-vegetables', name: 'Abóbora', defaultUnit: 'kg', shelfLifeDaysDefault: 30, pricePerUnit: 4, isFavorite: false, layer: 'rasteiro', cycleDays: 120, guildTags: ['Cobertura de solo'] },
  { id: 'crop-inga', categoryId: 'cat-fruits', name: 'Ingá', defaultUnit: 'kg', shelfLifeDaysDefault: 4, isFavorite: false, layer: 'emergente', guildTags: ['Fixação de nitrogênio', 'Sombra'] },
  { id: 'crop-guandu', categoryId: 'cat-forage', name: 'Guandu', defaultUnit: 'kg', shelfLifeDaysDefault: 180, isFavorite: false, layer: 'medio', isForage: true, guildTags: ['Fixação de nitrogênio', 'Adubo verde'] },
  { id: 'crop-mombaca', categoryId: 'cat-forage', name: 'Capim Mombaça', defaultUnit: 'kg', shelfLifeDaysDefault: 0, isFavorite: false, layer: 'pasto', isForage: true },
  { id: 'crop-braquiaria', categoryId: 'cat-forage', name: 'Braquiária', defaultUnit: 'kg', shelfLifeDaysDefault: 0, isFavorite: false, layer: 'pasto', isForage: true },
  { id: 'crop-tifton', categoryId: 'cat-forage', name: 'Tifton 85', defaultUnit: 'kg', shelfLifeDaysDefault: 0, isFavorite: false, layer: 'pasto', isForage: true },
  { id: 'crop-capiacu', categoryId: 'cat-forage', name: 'Capiaçu', defaultUnit: 'kg', shelfLifeDaysDefault: 0, isFavorite: false, layer: 'pasto', isForage: true },
  // Livestock
  { id: 'crop-leite', categoryId: 'cat-dairy', name: 'Leite', defaultUnit: 'liter', shelfLifeDaysDefault: 3, isFavorite: true, species: 'cattle', animalYield: 'collect' },
  { id: 'crop-ovos', categoryId: 'cat-eggs', name: 'Ovos Caipiras', defaultUnit: 'dozen', shelfLifeDaysDefault: 21, isFavorite: true, species: 'poultry', animalYield: 'collect' },
  { id: 'crop-queijo', categoryId: 'cat-dairy', name: 'Queijo Minas', defaultUnit: 'kg', shelfLifeDaysDefault: 30, isFavorite: false, species: 'cattle', derivedFromCropId: 'crop-leite' },
  { id: 'crop-manteiga', categoryId: 'cat-dairy', name: 'Manteiga', defaultUnit: 'kg', shelfLifeDaysDefault: 60, isFavorite: false, species: 'cattle', derivedFromCropId: 'crop-leite' },
  { id: 'crop-iogurte', categoryId: 'cat-dairy', name: 'Iogurte', defaultUnit: 'liter', shelfLifeDaysDefault: 10, isFavorite: false, species: 'cattle', derivedFromCropId: 'crop-leite' },
  { id: 'crop-frango', categoryId: 'cat-meat', name: 'Frango Caipira', defaultUnit: 'kg', shelfLifeDaysDefault: 3, isFavorite: false, species: 'poultry', animalYield: 'slaughter' },
  { id: 'crop-suina', categoryId: 'cat-meat', name: 'Carne Suína', defaultUnit: 'kg', shelfLifeDaysDefault: 60, isFavorite: false, species: 'swine', animalYield: 'slaughter' },
  { id: 'crop-linguica', categoryId: 'cat-meat', name: 'Linguiça', defaultUnit: 'kg', shelfLifeDaysDefault: 15, isFavorite: false, species: 'swine', derivedFromCropId: 'crop-suina' },
  { id: 'crop-mel', categoryId: 'cat-honey', name: 'Mel', defaultUnit: 'kg', shelfLifeDaysDefault: 365, isFavorite: false, species: 'bees', animalYield: 'collect' },
];

const SAMPLE_CULTIVARS: Seeded<Cultivar>[] = [
  { id: 'cv-banana-prata', cropId: 'crop-banana', name: 'Prata', shelfLifeDaysOverride: 6 },
  { id: 'cv-banana-nanica', cropId: 'crop-banana', name: 'Nanica' },
  { id: 'cv-tomate-roma', cropId: 'crop-tomate', name: 'Roma' },
  { id: 'cv-mandioca-mansa', cropId: 'crop-mandioca', name: 'Mansa' },
  { id: 'cv-alface-crespa', cropId: 'crop-alface', name: 'Crespa' },
  { id: 'cv-vaca-girolando', cropId: 'crop-leite', name: 'Girolando' },
];

const SAMPLE_ZONES: Seeded<Zone>[] = [
  { id: 'zone-t1', name: 'Linha da banana', type: 'linha', size: '24 × 6 m', description: 'agrofloresta em linha', areaM2: 144, gridRows: 4, mapHeight: 172, sortOrder: 0, sun: 'full', water: 'rain' },
  { id: 'zone-t2', name: 'Agrofloresta norte', type: 'agrofloresta', size: '30 × 20 m', description: 'sistema agroflorestal', areaM2: 600, gridRows: 3, mapHeight: 206, sortOrder: 1, sun: 'partial', water: 'rain' },
  { id: 'zone-t3', name: 'Canteiro 3', type: 'canteiro', size: '3 canteiros de 1,2 × 8 m', areaM2: 29, gridRows: 3, mapHeight: 134, sortOrder: 2, sun: 'full', water: 'irrigated' },
  { id: 'zone-t4', name: 'Canteiro 4', type: 'canteiro', size: '1,2 × 10 m', areaM2: 12, gridRows: 3, mapHeight: 100, sortOrder: 3, sun: 'full', water: 'irrigated' },
  { id: 'zone-pasto', name: 'Pasto do fundo', type: 'pasto', size: '1 ha', sortOrder: 4 },
  { id: 'zone-galinheiro', name: 'Galinheiro', type: 'abrigo', sortOrder: 5 },
  { id: 'zone-chiqueiro', name: 'Chiqueiro', type: 'abrigo', sortOrder: 6 },
];

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const SAMPLE_PLANTINGS: Seeded<Planting>[] = [
  { id: 'pl-t1-banana', zoneId: 'zone-t1', cropId: 'crop-banana', cultivarId: 'cv-banana-prata', layer: 'alto', cells: [...range(0, 5), ...range(12, 17)], countUnit: 'pes', plantedAt: at(590) },
  { id: 'pl-t1-guandu', zoneId: 'zone-t1', cropId: 'crop-guandu', layer: 'medio', cells: range(6, 11), countUnit: 'pes', plantedAt: at(400) },
  { id: 'pl-t1-abobora', zoneId: 'zone-t1', cropId: 'crop-abobora', layer: 'rasteiro', cells: [18, 20, 22], countUnit: 'covas', plantedAt: at(60) },
  { id: 'pl-t2-inga', zoneId: 'zone-t2', cropId: 'crop-inga', layer: 'emergente', cells: [0, 4, 14], countUnit: 'arvores', plantedAt: at(1500) },
  { id: 'pl-t2-cacau', zoneId: 'zone-t2', cropId: 'crop-cacau', layer: 'medio', cells: [2, 7, 9, 12, 16], countUnit: 'pes', plantedAt: at(1200) },
  { id: 'pl-t2-mandioca', zoneId: 'zone-t2', cropId: 'crop-mandioca', layer: 'baixo', cells: [1, 3, 5, 6, 8, 10, 11, 13, 15, 17], count: 20, countUnit: 'pes', plantedAt: at(330) },
  { id: 'pl-t3-tomate', zoneId: 'zone-t3', cropId: 'crop-tomate', cultivarId: 'cv-tomate-roma', layer: 'medio', cells: range(0, 5), countUnit: 'mudas', plantedAt: at(65) },
  { id: 'pl-t3-alface', zoneId: 'zone-t3', cropId: 'crop-alface', cultivarId: 'cv-alface-crespa', layer: 'baixo', cells: range(6, 11), countUnit: 'pes', plantedAt: at(55) },
  { id: 'pl-t3-coentro', zoneId: 'zone-t3', cropId: 'crop-coentro', layer: 'baixo', cells: range(12, 17), countUnit: 'touceiras', plantedAt: at(50) },
  { id: 'pl-t4-feijao', zoneId: 'zone-t4', cropId: 'crop-feijao', layer: 'baixo', cells: range(0, 17), countUnit: 'covas', plantedAt: at(130), endedAt: at(38) },
  { id: 'pl-pasto-mombaca', zoneId: 'zone-pasto', cropId: 'crop-mombaca', layer: 'pasto', cells: range(0, 17), countUnit: 'touceiras', plantedAt: at(700), animalGroupId: 'animals-vacas' },
];

const SAMPLE_OBSERVATIONS: Seeded<Observation>[] = [
  { id: 'obs-t1', zoneId: 'zone-t1', observedAt: at(9, 8), phase: 'fruiting', pollinators: 2, pest: 0, disease: 0, soil: 1 },
  { id: 'obs-t2', zoneId: 'zone-t2', observedAt: at(14, 8), phase: 'flowering', pollinators: 1, pest: 0, disease: 0, soil: 1, notes: 'Cacau em floração.' },
  { id: 'obs-t3', zoneId: 'zone-t3', observedAt: at(3, 17), phase: 'flowering', pollinators: 1, pest: 1, disease: 0, soil: 0, notes: 'Terra rachando entre as mudas.' },
  { id: 'obs-t4', zoneId: 'zone-t4', observedAt: at(5, 16), phase: 'dormant', soil: 1, notes: 'Solo preparado, esperando plantio.' },
];

export const SAMPLE_ANIMAL_GROUPS: Seeded<AnimalGroup>[] = [
  { id: 'animals-vacas', name: 'Vacas em lactação', species: 'cattle', initialHeadcount: 4, headcount: 6, zoneId: 'zone-pasto', startedAt: '2024-03-12T09:00:00.000Z', notes: 'Raça Girolando, ordenha às 6h' },
  { id: 'animals-galinhas', name: 'Galinhas poedeiras', species: 'poultry', initialHeadcount: 31, headcount: 28, zoneId: 'zone-galinheiro', startedAt: at(220) },
  { id: 'animals-frangos-2', name: 'Frangos lote 2', species: 'poultry', initialHeadcount: 40, headcount: 0, zoneId: 'zone-galinheiro', startedAt: at(150) },
  { id: 'animals-porcos', name: 'Suínos de engorda', species: 'swine', initialHeadcount: 10, headcount: 8, zoneId: 'zone-chiqueiro', startedAt: at(150) },
];

const DEFAULT_FOOTER = 'Retirada sáb, 7h às 11h\nEntrega na quinta, bairros próximos\nPedidos por aqui até sexta, 18h.';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  locale: 'pt-BR',
  theme: 'system',
  farmName: '',
  contactInfo: '',
  onboardingCompleted: false,
};

/** Production with the lot it creates; `left` below `qty` writes the missing part as sold */
interface ProductionSpec {
  key: string;
  cropId: string;
  qty: number;
  unit: UnitType;
  when: string;
  left?: number;
  zoneId?: string;
  cultivarId?: string;
  animalGroupId?: string;
  shelf: number;
  outReason?: InventoryAdjustment['reason'];
  outWhen?: string;
}

function buildProductions(specs: ProductionSpec[]) {
  const harvests: Seeded<HarvestEvent>[] = [];
  const lots: Seeded<Lot>[] = [];
  const adjustments: Seeded<InventoryAdjustment>[] = [];
  for (const p of specs) {
    const lotId = `lot-${p.key}`;
    harvests.push({ id: `harvest-${p.key}`, cropId: p.cropId, cultivarId: p.cultivarId, zoneId: p.zoneId, quantity: p.qty, unit: p.unit, harvestedAt: p.when, lotId, animalGroupId: p.animalGroupId });
    const left = p.left ?? p.qty;
    lots.push({ id: lotId, cropId: p.cropId, cultivarId: p.cultivarId, zoneId: p.zoneId, harvestEventId: `harvest-${p.key}`, initialQuantity: p.qty, quantityRemaining: left, unit: p.unit, harvestedAt: p.when, expiresAtEstimate: plusDays(p.when, p.shelf) });
    if (left < p.qty) {
      adjustments.push({ id: `adj-${p.key}`, lotId, cropId: p.cropId, quantityDelta: -(p.qty - left), unit: p.unit, reason: p.outReason ?? 'sold', adjustedAt: p.outWhen ?? later(p.when, 6) });
    }
  }
  return { harvests, lots, adjustments };
}

function sampleProductions() {
  const milk = [40, 42, 41, 44, 38, 44]; // six days before today; today's milking is still missing
  const eggs = [2, 2, 3, 2, 2, 2];
  const specs: ProductionSpec[] = [
    { key: 'banana-hoje', cropId: 'crop-banana', cultivarId: 'cv-banana-prata', zoneId: 'zone-t1', qty: 12, unit: 'kg', when: at(0, 6, 40), shelf: 7 },
    { key: 'banana-26', cropId: 'crop-banana', cultivarId: 'cv-banana-prata', zoneId: 'zone-t1', qty: 10, unit: 'kg', when: at(4, 7), left: 4, shelf: 7, outWhen: at(1, 15) },
    { key: 'coentro', cropId: 'crop-coentro', zoneId: 'zone-t3', qty: 4, unit: 'bunch', when: at(4, 6), left: 3, shelf: 4, outWhen: at(2, 9) },
    { key: 'alface-27', cropId: 'crop-alface', cultivarId: 'cv-alface-crespa', zoneId: 'zone-t3', qty: 8, unit: 'unit', when: at(4, 6, 30), left: 5, shelf: 5, outWhen: at(2, 9) },
    { key: 'alface-24', cropId: 'crop-alface', cultivarId: 'cv-alface-crespa', zoneId: 'zone-t3', qty: 6, unit: 'unit', when: at(6, 6, 30), left: 2, shelf: 5, outWhen: at(4, 9) },
    { key: 'mandioca', cropId: 'crop-mandioca', cultivarId: 'cv-mandioca-mansa', zoneId: 'zone-t2', qty: 9, unit: 'kg', when: at(1, 8), shelf: 7 },
    { key: 'tomate', cropId: 'crop-tomate', cultivarId: 'cv-tomate-roma', zoneId: 'zone-t3', qty: 6, unit: 'kg', when: at(2, 7), shelf: 7 },
    { key: 'castanha', cropId: 'crop-castanha', qty: 5, unit: 'kg', when: at(20, 9), left: 2, shelf: 90, outWhen: at(13, 10) },
    { key: 'banana-s43', cropId: 'crop-banana', zoneId: 'zone-t1', qty: 8, unit: 'kg', when: at(8, 7), left: 0, shelf: 7 },
    { key: 'banana-s42', cropId: 'crop-banana', zoneId: 'zone-t1', qty: 14, unit: 'kg', when: at(15, 7), left: 0, shelf: 7 },
    { key: 'banana-s40', cropId: 'crop-banana', zoneId: 'zone-t1', qty: 9, unit: 'kg', when: at(29, 7), left: 0, shelf: 7 },
    { key: 'banana-s39', cropId: 'crop-banana', zoneId: 'zone-t1', qty: 6, unit: 'kg', when: at(36, 7), left: 0, shelf: 7 },
    { key: 'carne-suina-03', cropId: 'crop-suina', zoneId: 'zone-chiqueiro', animalGroupId: 'animals-porcos', qty: 74, unit: 'kg', when: at(27, 9), left: 12, shelf: 60, outWhen: at(20, 9) },
    { key: 'carne-suina-ago', cropId: 'crop-suina', zoneId: 'zone-chiqueiro', animalGroupId: 'animals-porcos', qty: 74, unit: 'kg', when: at(90, 9), left: 0, shelf: 60 },
    { key: 'frango-abate', cropId: 'crop-frango', zoneId: 'zone-galinheiro', animalGroupId: 'animals-galinhas', qty: 3.4, unit: 'kg', when: at(0, 6, 15), shelf: 3 },
    { key: 'queijo', cropId: 'crop-queijo', qty: 1, unit: 'kg', when: at(2, 10), shelf: 30 },
  ];
  milk.forEach((qty, i) => {
    const day = 6 - i;
    // yesterday's milking keeps 12 L, the one before keeps 6 L after the cheese; older ones were sold
    const left = day === 1 ? 12 : day === 2 ? 6 : 0;
    specs.push({ key: `leite-${day}`, cropId: 'crop-leite', zoneId: 'zone-pasto', animalGroupId: 'animals-vacas', qty, unit: 'liter', when: at(day, 6, 20), left, shelf: 3 });
  });
  eggs.forEach((qty, i) => {
    const day = 6 - i;
    specs.push({ key: `ovos-${day}`, cropId: 'crop-ovos', zoneId: 'zone-galinheiro', animalGroupId: 'animals-galinhas', qty, unit: 'dozen', when: at(day, 7, 30), left: day <= 3 ? qty : 0, shelf: 21 });
  });
  const built = buildProductions(specs);
  // 10 L of the milking two days ago became 1 kg of Queijo Minas: replace its 'sold' line with processing
  const cheeseSource = built.adjustments.find(a => a.lotId === 'lot-leite-2');
  if (cheeseSource) {
    cheeseSource.quantityDelta = -(38 - 6 - 10);
    built.adjustments.push({ id: 'adj-leite-2-queijo', lotId: 'lot-leite-2', cropId: 'crop-leite', quantityDelta: -10, unit: 'liter', reason: 'processing', adjustedAt: at(2, 10), harvestEventId: 'harvest-queijo' });
  }
  return built;
}

const SAMPLE_ANIMAL_ADJUSTMENTS: Seeded<AnimalAdjustment>[] = [
  { id: 'aadj-vacas-compra', groupId: 'animals-vacas', delta: 2, reason: 'purchase', adjustedAt: at(138, 10) },
  { id: 'aadj-vacas-venda', groupId: 'animals-vacas', delta: -1, reason: 'sale', notes: 'Vaca seca para o vizinho', adjustedAt: at(59, 10) },
  { id: 'aadj-vacas-nasc', groupId: 'animals-vacas', delta: 1, reason: 'birth', notes: 'Bezerra da Mimosa', adjustedAt: at(19, 5) },
  { id: 'aadj-galinhas-morte', groupId: 'animals-galinhas', delta: -1, reason: 'death', adjustedAt: at(10, 7) },
  { id: 'aadj-galinhas-abate', groupId: 'animals-galinhas', delta: -2, reason: 'slaughter', notes: 'Encomenda da dona Rita', harvestEventId: 'harvest-frango-abate', adjustedAt: at(0, 6, 15) },
  { id: 'aadj-frangos-venda', groupId: 'animals-frangos-2', delta: -40, reason: 'sale', adjustedAt: at(60, 9) },
  { id: 'aadj-porcos-ago', groupId: 'animals-porcos', delta: -1, reason: 'slaughter', harvestEventId: 'harvest-carne-suina-ago', adjustedAt: at(90, 9) },
  { id: 'aadj-porcos-out', groupId: 'animals-porcos', delta: -1, reason: 'slaughter', harvestEventId: 'harvest-carne-suina-03', adjustedAt: at(27, 9) },
];

/** Last week's list: generated yesterday afternoon, before today's banana came in */
function sampleAvailability(): Seeded<AvailabilityList> {
  const items = [
    ['crop-banana', 'Banana', 'cv-banana-prata', 'Prata', 4, 'kg', 6.5, true],
    ['crop-mandioca', 'Mandioca', 'cv-mandioca-mansa', 'Mansa', 9, 'kg', 5, true],
    ['crop-tomate', 'Tomate', 'cv-tomate-roma', 'Roma', 6, 'kg', 8, true],
    ['crop-ovos', 'Ovos Caipiras', undefined, undefined, 6, 'dozen', undefined, true],
    ['crop-alface', 'Alface', 'cv-alface-crespa', 'Crespa', 5, 'unit', 3, true],
    ['crop-castanha', 'Castanha-do-pará', undefined, undefined, 2, 'kg', 80, true],
    ['crop-coentro', 'Coentro', undefined, undefined, 3, 'bunch', 4, false],
  ] as const;
  const createdAt = at(1, 14, 20);
  const list: Seeded<AvailabilityList> = {
    id: 'list-seed',
    windowId: 'this',
    windowName: 'Esta semana',
    farmName: 'Sítio Pé de Serra',
    footerText: DEFAULT_FOOTER,
    items: items.map(([cropId, cropName, cultivarId, cultivarName, quantity, unit, pricePerUnit, isIncluded], i) => ({
      id: `item-${i}`, cropId, cropName, cultivarId, cultivarName, quantity, unit, pricePerUnit, isIncluded, sortOrder: i,
    })),
    isStale: false,
    inventorySnapshotAt: createdAt,
  };
  list.generatedMessage = generateAvailabilityMessage({ ...list, createdAt, updatedAt: createdAt });
  return list;
}

const SAMPLE_RITUAL_WEEKS: RitualWeek[] = [5, 4, 3, 2, 1].map(weeksAgo => {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  return { id: `seed-${weeksAgo}`, completedAt: d.toISOString() };
});

const stamp = <T,>(rows: Seeded<T>[], now: string): T[] =>
  rows.map(row => ({ ...row, createdAt: (row as { createdAt?: string }).createdAt ?? now, updatedAt: now }) as T);

/** Seeds only an empty database */
export async function seedDatabase(): Promise<boolean> {
  const now = new Date().toISOString();
  const existing = await db.categories.count();
  if (existing > 0) {
    // Defaults added in later versions must reach existing databases
    const known = new Set(await db.categories.toCollection().primaryKeys());
    const missing = DEFAULT_CATEGORIES.filter(cat => !known.has(cat.id));
    if (missing.length > 0) await db.categories.bulkAdd(stamp(missing, now));
    return false;
  }

  const productions = sampleProductions();
  const config: AvailabilityConfig = {
    id: 'availability-config', farmName: 'Sítio Pé de Serra', contactInfo: '', defaultHeaderText: '', defaultFooterText: DEFAULT_FOOTER, defaultWindowDays: 7, updatedAt: now,
  };
  await db.transaction('rw', db.tables, async () => {
    await db.categories.bulkAdd(stamp(DEFAULT_CATEGORIES, now));
    await db.crops.bulkAdd(stamp(SAMPLE_CROPS, now));
    await db.cultivars.bulkAdd(stamp(SAMPLE_CULTIVARS, now));
    await db.zones.bulkAdd(stamp(SAMPLE_ZONES.map(z => ({ ...z, createdAt: at(400) })), now));
    await db.plantings.bulkAdd(stamp(SAMPLE_PLANTINGS, now));
    await db.observations.bulkAdd(stamp(SAMPLE_OBSERVATIONS.map(o => ({ ...o, createdAt: o.observedAt })), now));
    await db.harvestEvents.bulkAdd(stamp(productions.harvests.map(h => ({ ...h, createdAt: h.harvestedAt })), now));
    await db.lots.bulkAdd(stamp(productions.lots.map(l => ({ ...l, createdAt: l.harvestedAt })), now));
    await db.inventoryAdjustments.bulkAdd(stamp(productions.adjustments.map(a => ({ ...a, createdAt: a.adjustedAt })), now));
    await db.animalGroups.bulkAdd(stamp(SAMPLE_ANIMAL_GROUPS.map(g => ({ ...g, createdAt: g.startedAt })), now));
    await db.animalAdjustments.bulkAdd(stamp(SAMPLE_ANIMAL_ADJUSTMENTS.map(a => ({ ...a, createdAt: a.adjustedAt })), now));
    const list = sampleAvailability();
    await db.availabilityLists.add({ ...list, createdAt: list.inventorySnapshotAt, updatedAt: list.inventorySnapshotAt });
    await db.availabilityConfig.put(config);
    await db.ritualWeeks.bulkAdd(SAMPLE_RITUAL_WEEKS);
    await db.appSettings.put({ ...DEFAULT_SETTINGS, farmName: 'Sítio Pé de Serra', lastExportAt: at(6, 20) });
  });
  return true;
}

/** Reset database to the demo farm (development) */
export async function resetDatabase(): Promise<void> {
  await db.delete();
  await db.open();
  await seedDatabase();
}
