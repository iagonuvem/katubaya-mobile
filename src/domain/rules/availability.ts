/**
 * Availability message generation rules
 * Deterministic, no randomness
 */

import type { 
  AvailabilityList, 
  AvailabilityItem, 
  InventorySnapshot,
  InventorySnapshotItem,
  UnitType 
} from '../contracts/types';

/**
 * Map crop names to emojis for WhatsApp message
 */
const CROP_EMOJIS: Record<string, string> = {
  // Fruits
  'banana': '🍌',
  'abacate': '🥑',
  'laranja': '🍊',
  'limão': '🍋',
  'maçã': '🍎',
  'manga': '🥭',
  'mamão': '🍈',
  'abacaxi': '🍍',
  'melancia': '🍉',
  'uva': '🍇',
  'morango': '🍓',
  'coco': '🥥',
  'goiaba': '🍐',
  // Vegetables
  'tomate': '🍅',
  'cenoura': '🥕',
  'batata': '🥔',
  'cebola': '🧅',
  'alho': '🧄',
  'pepino': '🥒',
  'pimentão': '🫑',
  'pimenta': '🌶️',
  'milho': '🌽',
  'brócolis': '🥦',
  'alface': '🥬',
  'berinjela': '🍆',
  'abóbora': '🎃',
  // Herbs
  'manjericão': '🌿',
  'hortelã': '🌿',
  'coentro': '🌿',
  'salsinha': '🌿',
  // Grains
  'feijão': '🫘',
  'arroz': '🍚',
  // Nuts
  'castanha': '🌰',
  'amendoim': '🥜',
  // Livestock
  'leite': '🥛',
  'queijo': '🧀',
  'manteiga': '🧈',
  'iogurte': '🥛',
  'ovo': '🥚',
  'frango': '🍗',
  'carne': '🥩',
  'mel': '🍯',
  // Default
  'default': '🌱'
};

/**
 * Get emoji for a crop name (case-insensitive partial match)
 */
export function getCropEmoji(cropName: string): string {
  const normalized = cropName.toLowerCase().trim();
  
  for (const [key, emoji] of Object.entries(CROP_EMOJIS)) {
    if (normalized.includes(key)) {
      return emoji;
    }
  }
  
  return CROP_EMOJIS.default;
}

/**
 * Format unit for display
 */
export function formatUnit(unit: UnitType, quantity: number): string {
  const unitLabels: Record<UnitType, { singular: string; plural: string }> = {
    kg: { singular: 'kg', plural: 'kg' },
    g: { singular: 'g', plural: 'g' },
    unit: { singular: 'unid', plural: 'unid' },
    bunch: { singular: 'maço', plural: 'maços' },
    liter: { singular: 'L', plural: 'L' },
    ml: { singular: 'ml', plural: 'ml' },
    box: { singular: 'cx', plural: 'cx' },
    bag: { singular: 'saco', plural: 'sacos' },
    dozen: { singular: 'dz', plural: 'dz' }
  };
  
  const label = unitLabels[unit];
  return quantity === 1 ? label.singular : label.plural;
}

/**
 * Format quantity with proper decimal handling
 */
export function formatQuantity(quantity: number): string {
  if (Number.isInteger(quantity)) {
    return quantity.toString();
  }
  return quantity.toFixed(1).replace('.0', '');
}

/**
 * Format price for display in WhatsApp message
 */
export function formatPrice(price: number): string {
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
}

const PRICE_SUFFIX: Record<UnitType, string> = {
  kg: '/kg', g: '/g', liter: '/L', ml: '/ml', unit: ' a unid', bunch: ' o maço', dozen: ' a dúzia', box: ' a caixa', bag: ' o saco'
};

/** Display name of a stock line: crop plus variety ("Banana Prata") */
export function itemDisplayName(item: Pick<AvailabilityItem, 'cropName' | 'cultivarName'>): string {
  return item.cultivarName ? `${item.cropName} ${item.cultivarName}` : item.cropName;
}

/**
 * Deterministic WhatsApp message for a market list ("feira").
 * The message is content for pt-BR customers, so it stays in Portuguese whatever the UI locale.
 */
export function generateAvailabilityMessage(list: AvailabilityList): string {
  const when = list.windowId === 'next' ? 'da próxima semana' : 'desta semana';
  const header = list.headerText?.trim()
    || (list.farmName ? `*${list.farmName}* · Feira ${when}` : `Feira ${when}`);

  const lines = list.items
    .filter(item => item.isIncluded && item.quantity > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(item => {
      const qty = `${formatQuantity(item.quantity).replace('.', ',')} ${formatUnit(item.unit, item.quantity)}`;
      const price = item.pricePerUnit ? ` · ${formatPrice(item.pricePerUnit)}${PRICE_SUFFIX[item.unit]}` : '';
      return `• ${itemDisplayName(item)}: ${qty}${price}`;
    });

  const parts = [header, lines.length ? lines.join('\n') : 'Nada na barraca esta semana.'];
  const footer = [list.footerText?.trim(), list.contactInfo ? `Contato: ${list.contactInfo}` : '']
    .filter(Boolean)
    .join('\n');
  if (footer) parts.push(footer);
  return parts.join('\n\n');
}

/**
 * Create availability items from inventory snapshot
 */
export function createAvailabilityItemsFromSnapshot(
  snapshot: InventorySnapshot
): AvailabilityItem[] {
  return snapshot.items
    .filter(item => item.totalQuantity > 0)
    .map((item, index) => ({
      id: crypto.randomUUID(),
      cropId: item.cropId,
      cropName: item.cropName,
      cultivarId: item.cultivarId,
      cultivarName: item.cultivarName,
      quantity: item.totalQuantity,
      unit: item.unit,
      pricePerUnit: item.pricePerUnit,
      isIncluded: true,
      sortOrder: index
    }));
}

/**
 * Check if availability list is stale (inventory changed since generation)
 */
export function isAvailabilityStale(
  list: AvailabilityList,
  currentSnapshot: InventorySnapshot
): boolean {
  // Simple staleness check: compare snapshot timestamps
  return new Date(list.inventorySnapshotAt) < new Date(currentSnapshot.generatedAt);
}
