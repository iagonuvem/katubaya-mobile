/**
 * Stroke icons drawn for the farm game (24 × 24, round caps), copied from the design canvas.
 * Decorative by default; pass `label` when the icon carries meaning on its own.
 */

export const ICONS = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  copy: 'M11 9h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM5 15V5a1 1 0 0 1 1-1h10',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  gear: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  box: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  grid: 'M4 4h16v16H4zM4 12h16M12 4v16',
  paw: 'M6 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM10 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM15 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM19 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 17c0-3 2-5 4.5-5s4.5 2 4.5 5-2 3-4.5 3S8 20 8 17z',
  harvest: 'M6 20c6 0 12-5 12-14C9 6 4 11 4 18M4 20l8-8',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  plant: 'M12 21v-9M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2-5-6-5 0 3 2 5 6 5z',
  stall: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6',
  pin: 'M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12zM12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  cards: 'M5 6h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM8 3h11a2 2 0 0 1 2 2v13',
  process: 'M4 4h6v6H4zM14 14h6v6h-6zM10 7h4a3 3 0 0 1 3 3v4',
  download: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  upload: 'M12 15V3M7 8l5-5 5 5M4 19h16',
  chest: 'M5 8h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM3 12h18M10 12v3h4v-3M5 8l2-4h10l2 4',
  milk: 'M8 2h8v4l2 3v13H6V9l2-3zM6 13h12',
  egg: 'M12 3c-4 0-7 6-7 11a7 7 0 0 0 14 0c0-5-3-11-7-11z',
  heads: 'M4 8h7M7.5 4.5v7M13 16h7',
  slaughter: 'M3 12h11M10 8l4 4-4 4M18 5v14',
  open: 'M4 4h16v16H4zM4 12h16M12 4v16',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  cheese: 'M3 15l9-9 9 6v6H3zM8 15h.01M13 13h.01M16 16h.01',
  money: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2',
  bowl: 'M4 11h16a8 8 0 0 1-16 0zM8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5',
  gift: 'M4 10h16v10H4zM12 10v10M4 14h16M12 10c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1',
  warn: 'M12 3l9 16H3zM12 10v4M12 17h.01',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  funnel: 'M6 3h12l-2 7H8zM8 10l-2 11h12l-2-11',
  cattle: 'M4 7l3 2h10l3-2M7 9v6a5 5 0 0 0 10 0V9M10 14h.01M14 14h.01M10 18h4',
  poultry: 'M6 18c0-5 3-9 8-9 2 0 3 1 3 3l3 1-3 1c0 3-3 5-7 5H6zM10 18v3M13 18v3M14 12h.01',
  swine: 'M4 13a7 6 0 1 0 14 0 7 6 0 1 0-14 0M18 12h3v3h-3M7 8L6 5l3 2M8 18.5V21M14 18.5V21',
  bees: 'M12 9a4 5 0 1 0 0 10 4 5 0 1 0 0-10zM8.5 12.5h7M8.5 15.5h7M10 9C8 6 4 6 4 8s3 2 5 1M14 9c2-3 6-3 6-1s-3 2-5 1',
  fish: 'M3 12c3-4 7-5 11-5 3 0 5 2 7 5-2 3-4 5-7 5-4 0-8-1-11-5zM3 12l-1 4M3 12L2 8M16 11h.01',
  zoneCanteiro: 'M3 7h18v4H3zM3 14h18v4H3z',
  zoneLinha: 'M5 20V8M12 20V5M19 20V8M5 8c0-2 1-3 2-4M12 5c0-2 1-2 2-3M19 8c0-2 1-3 2-4',
  zoneSaf: 'M8 21v-6M8 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM17 21v-4M17 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  zonePomar: 'M12 21v-7M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM9 8h.01M15 9h.01M12 11h.01',
  zonePasto: 'M3 20h18M5 20v-8M19 20v-8M5 13h14M5 16.5h14M9 9c0-2 1-3 2-4M14 9c0-2 1-3 2-4',
  zoneAbrigo: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5',
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean;
}

export function Icon({ name, size = 24, strokeWidth = 1.75, label, className, style, fill }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
