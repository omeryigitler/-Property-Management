import { create } from 'zustand';
import { ALL_PROPERTIES, DEFAULT_PROPERTIES, LOCATIONS } from '../config/locations';
import { PropertyConfig } from '../types';

const STORAGE_KEY = 'short_let_properties_v1';
let activeCacheSource: PropertyConfig[] | null = null;
let activeCacheResult: PropertyConfig[] = [];

function normalizeProperty(property: Partial<PropertyConfig>): PropertyConfig | null {
  if (!property.id || !property.name || !property.locationId) return null;
  if (!LOCATIONS.some((location) => location.id === property.locationId)) return null;

  return {
    id: property.id,
    name: property.name.trim().toUpperCase(),
    locationId: property.locationId,
    active: property.active !== false,
  };
}

function synchronizeLegacyCatalog(properties: PropertyConfig[]) {
  const activeProperties = properties.filter((property) => property.active !== false);
  ALL_PROPERTIES.splice(0, ALL_PROPERTIES.length, ...activeProperties);
  for (const location of LOCATIONS) {
    location.properties.splice(
      0,
      location.properties.length,
      ...activeProperties.filter((property) => property.locationId === location.id)
    );
  }
  activeCacheSource = properties;
  activeCacheResult = activeProperties;
}

function loadProperties(): PropertyConfig[] {
  let next: PropertyConfig[];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      next = DEFAULT_PROPERTIES.map((property) => ({ ...property }));
    } else {
      const parsed = JSON.parse(raw);
      const normalized = Array.isArray(parsed)
        ? parsed
            .map((property) => normalizeProperty(property))
            .filter((property): property is PropertyConfig => property !== null)
        : [];
      next = normalized.length > 0
        ? normalized
        : DEFAULT_PROPERTIES.map((property) => ({ ...property }));
    }
  } catch {
    next = DEFAULT_PROPERTIES.map((property) => ({ ...property }));
  }

  if (!next.some((property) => property.active !== false) && next[0]) {
    next[0] = { ...next[0], active: true };
  }
  synchronizeLegacyCatalog(next);
  return next;
}

function saveProperties(properties: PropertyConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
  synchronizeLegacyCatalog(properties);
}

function createPropertyId(name: string, existingIds: Set<string>): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'property';

  if (!existingIds.has(base)) return base;

  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

interface PropertyStoreState {
  properties: PropertyConfig[];
  addProperty: (name: string, locationId: string) => PropertyConfig | null;
  updateProperty: (id: string, updates: Pick<PropertyConfig, 'name' | 'locationId' | 'active'>) => void;
  replaceProperties: (properties: PropertyConfig[]) => void;
  resetProperties: () => void;
}

export const usePropertyStore = create<PropertyStoreState>((set, get) => ({
  properties: loadProperties(),

  addProperty: (name, locationId) => {
    const cleanName = name.trim();
    if (!cleanName || !LOCATIONS.some((location) => location.id === locationId)) return null;

    const current = get().properties;
    const property: PropertyConfig = {
      id: createPropertyId(cleanName, new Set(current.map((item) => item.id))),
      name: cleanName.toUpperCase(),
      locationId,
      active: true,
    };

    const updated = [...current, property];
    saveProperties(updated);
    set({ properties: updated });
    return property;
  },

  updateProperty: (id, updates) => {
    const cleanName = updates.name.trim();
    if (!cleanName || !LOCATIONS.some((location) => location.id === updates.locationId)) return;

    const current = get().properties;
    const otherActiveExists = current.some(
      (property) => property.id !== id && property.active !== false
    );
    const safeActive = updates.active || otherActiveExists;

    const updated = current.map((property) =>
      property.id === id
        ? {
            ...property,
            name: cleanName.toUpperCase(),
            locationId: updates.locationId,
            active: safeActive,
          }
        : property
    );

    saveProperties(updated);
    set({ properties: updated });
  },

  replaceProperties: (properties) => {
    const normalized = properties
      .map((property) => normalizeProperty(property))
      .filter((property): property is PropertyConfig => property !== null);
    const next = normalized.length > 0
      ? normalized
      : DEFAULT_PROPERTIES.map((property) => ({ ...property }));
    if (!next.some((property) => property.active !== false) && next[0]) {
      next[0] = { ...next[0], active: true };
    }
    saveProperties(next);
    set({ properties: next });
  },

  resetProperties: () => {
    const next = DEFAULT_PROPERTIES.map((property) => ({ ...property }));
    saveProperties(next);
    set({ properties: next });
  },
}));

export function getActiveProperties(properties: PropertyConfig[]): PropertyConfig[] {
  if (activeCacheSource === properties) return activeCacheResult;
  activeCacheSource = properties;
  activeCacheResult = properties.filter((property) => property.active !== false);
  return activeCacheResult;
}
