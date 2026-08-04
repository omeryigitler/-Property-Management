import { LocationConfig, PropertyConfig } from '../types';

export const LOCATIONS: LocationConfig[] = [
  {
    id: 'st-julians',
    name: "ST JULIAN'S",
    headerColorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    badgeBgClass: 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60',
    borderClass: 'border-emerald-800/60',
    properties: [
      { id: '1-the-olive', name: '1 THE OLIVE', locationId: 'st-julians', active: true },
      { id: '8-the-olive', name: '8 THE OLIVE', locationId: 'st-julians', active: true },
      { id: 'the-hollies', name: 'THE HOLLIES', locationId: 'st-julians', active: true },
    ],
  },
  {
    id: 'gzira',
    name: 'GZIRA',
    headerColorClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80',
    badgeBgClass: 'bg-cyan-900/60 text-cyan-200 border-cyan-700/60',
    borderClass: 'border-cyan-800/60',
    properties: [
      { id: '1-meridian', name: '1 MERIDIAN', locationId: 'gzira', active: true },
      { id: '2-meridian', name: '2 MERIDIAN', locationId: 'gzira', active: true },
      { id: 'mariott', name: 'MARIOTT', locationId: 'gzira', active: true },
      { id: 'albert', name: 'ALBERT', locationId: 'gzira', active: true },
    ],
  },
  {
    id: 'msida',
    name: 'MSIDA',
    headerColorClass: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    badgeBgClass: 'bg-amber-900/60 text-amber-200 border-amber-700/60',
    borderClass: 'border-amber-800/60',
    properties: [
      { id: '1-penthouse', name: '1 PENTHOUSE', locationId: 'msida', active: true },
      { id: '2-penthouse', name: '2 PENTHOUSE', locationId: 'msida', active: true },
    ],
  },
  {
    id: 'sliema',
    name: 'SLIEMA',
    headerColorClass: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
    badgeBgClass: 'bg-purple-900/60 text-purple-200 border-purple-700/60',
    borderClass: 'border-purple-800/60',
    properties: [
      { id: 'sky', name: 'SKY', locationId: 'sliema', active: true },
    ],
  },
];

export const ALL_PROPERTIES: PropertyConfig[] = LOCATIONS.flatMap((loc) => loc.properties);

export const DEFAULT_PROPERTIES: PropertyConfig[] = ALL_PROPERTIES.map((property) => ({
  ...property,
  active: property.active !== false,
}));

export const DAILY_TOTAL_COLUMN_CONFIG = {
  id: 'daily-total',
  name: 'DAILY TOTAL',
  headerColorClass: 'bg-yellow-950/80 text-yellow-300 border-yellow-700/80',
  badgeBgClass: 'bg-yellow-900/60 text-yellow-200 border-yellow-700/60',
};

export const CHANNEL_CONFIG = {
  airbnb: {
    id: 'airbnb',
    name: 'Airbnb',
    colorClass: 'bg-rose-950/80 text-rose-200 border-rose-700/80 hover:bg-rose-900',
    badgeClass: 'bg-rose-900/90 text-rose-100 border border-rose-500/50',
    dotColor: 'bg-rose-500',
    hex: '#f43f5e',
  },
  booking_com: {
    id: 'booking_com',
    name: 'Booking.com',
    colorClass: 'bg-blue-950/80 text-blue-200 border-blue-700/80 hover:bg-blue-900',
    badgeClass: 'bg-blue-900/90 text-blue-100 border border-blue-500/50',
    dotColor: 'bg-blue-500',
    hex: '#3b82f6',
  },
  direct: {
    id: 'direct',
    name: 'Direct',
    colorClass: 'bg-emerald-950/80 text-emerald-200 border-emerald-700/80 hover:bg-emerald-900',
    badgeClass: 'bg-emerald-900/90 text-emerald-100 border border-emerald-500/50',
    dotColor: 'bg-emerald-500',
    hex: '#10b981',
  },
  vrbo: {
    id: 'vrbo',
    name: 'VRBO',
    colorClass: 'bg-violet-950/80 text-violet-200 border-violet-700/80 hover:bg-violet-900',
    badgeClass: 'bg-violet-900/90 text-violet-100 border border-violet-500/50',
    dotColor: 'bg-violet-500',
    hex: '#8b5cf6',
  },
} as const;
