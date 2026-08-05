import { LocationConfig, PropertyConfig } from '../types';

export const LOCATIONS: LocationConfig[] = [
  {
    id: 'st-julians',
    name: "ST JULIAN'S",
    headerColorClass: 'bg-[#eaf6f1] text-[#176246] border-[#b9ddcf]',
    badgeBgClass: 'bg-[#edf8f3] text-[#1f6b4e] border-[#bfe3d3]',
    borderClass: 'border-[#c8e2d8]',
    properties: [
      { id: '1-the-olive', name: '1 THE OLIVE', locationId: 'st-julians', active: true },
      { id: '8-the-olive', name: '8 THE OLIVE', locationId: 'st-julians', active: true },
      { id: 'the-hollies', name: 'THE HOLLIES', locationId: 'st-julians', active: true },
    ],
  },
  {
    id: 'gzira',
    name: 'GZIRA',
    headerColorClass: 'bg-[#eaf4fb] text-[#245a78] border-[#c6ddeb]',
    badgeBgClass: 'bg-[#eef6fb] text-[#285f7d] border-[#c6ddeb]',
    borderClass: 'border-[#cedfe9]',
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
    headerColorClass: 'bg-[#fff3df] text-[#85570b] border-[#f0d3a4]',
    badgeBgClass: 'bg-[#fff7e8] text-[#85570b] border-[#edd4aa]',
    borderClass: 'border-[#ead7b6]',
    properties: [
      { id: '1-penthouse', name: '1 PENTHOUSE', locationId: 'msida', active: true },
      { id: '2-penthouse', name: '2 PENTHOUSE', locationId: 'msida', active: true },
    ],
  },
  {
    id: 'sliema',
    name: 'SLIEMA',
    headerColorClass: 'bg-[#f4ecfb] text-[#704696] border-[#dbc6eb]',
    badgeBgClass: 'bg-[#f6f0fb] text-[#704696] border-[#dbc6eb]',
    borderClass: 'border-[#ded0e9]',
    properties: [{ id: 'sky', name: 'SKY', locationId: 'sliema', active: true }],
  },
];

export const ALL_PROPERTIES: PropertyConfig[] = LOCATIONS.flatMap(
  (location) => location.properties
);

export const DEFAULT_PROPERTIES: PropertyConfig[] = ALL_PROPERTIES.map((property) => ({
  ...property,
  active: property.active !== false,
}));

export const DAILY_TOTAL_COLUMN_CONFIG = {
  id: 'daily-total',
  name: 'DAILY TOTAL',
  headerColorClass: 'bg-[#fff7dd] text-[#735b11] border-[#e8d59d]',
  badgeBgClass: 'bg-[#fff8e8] text-[#735b11] border-[#ead8a9]',
};

export const CHANNEL_CONFIG = {
  airbnb: {
    id: 'airbnb',
    name: 'Airbnb',
    colorClass: 'bg-[#fff0ef] text-[#5c292c] border-[#ffb9b5] hover:bg-[#ffe7e5]',
    badgeClass: 'bg-white/80 text-[#a93439] border border-[#f0aaa6]',
    dotColor: 'bg-[#ff385c]',
    hex: '#ff5a5f',
  },
  booking_com: {
    id: 'booking_com',
    name: 'Booking.com',
    colorClass: 'bg-[#eef5ff] text-[#254d77] border-[#bdd4ed] hover:bg-[#e3effd]',
    badgeClass: 'bg-white/80 text-[#1f5f9f] border border-[#b9d2eb]',
    dotColor: 'bg-[#3478d4]',
    hex: '#3478d4',
  },
  direct: {
    id: 'direct',
    name: 'Direct',
    colorClass: 'bg-[#edf8f3] text-[#245b47] border-[#b7dfce] hover:bg-[#e1f3eb]',
    badgeClass: 'bg-white/80 text-[#1f6b4e] border border-[#add9c6]',
    dotColor: 'bg-[#18a875]',
    hex: '#18a875',
  },
  vrbo: {
    id: 'vrbo',
    name: 'VRBO',
    colorClass: 'bg-[#f5effc] text-[#5d4475] border-[#d5c1e7] hover:bg-[#eee4f8]',
    badgeClass: 'bg-white/80 text-[#65468b] border border-[#ceb8e1]',
    dotColor: 'bg-[#8b5bd1]',
    hex: '#8b5bd1',
  },
} as const;
