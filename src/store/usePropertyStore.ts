import { create } from 'zustand';
import { ALL_PROPERTIES, DEFAULT_PROPERTIES, LOCATIONS } from '../config/locations';
import { LocationConfig, PropertyConfig } from '../types';

const LEGACY_PROPERTY_STORAGE_KEY = 'short_let_properties_v1';
const CATALOG_STORAGE_KEY = 'short_let_property_catalog_v2';

const LOCATION_STYLES = [
  {
    headerColorClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    badgeBgClass: 'bg-emerald-900/60 text-emerald-200 border-emerald-700/60',
    borderClass: 'border-emerald-800/60',
  },
  {
    headerColorClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80',
    badgeBgClass: 'bg-cyan-900/60 text-cyan-200 border-cyan-700/60',
    borderClass: 'border-cyan-800/60',
  },
  {
    headerColorClass: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    badgeBgClass: 'bg-amber-900/60 text-amber-200 border-amber-700/60',
    borderClass: 'border-amber-800/60',
  },
  {
    headerColorClass: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
    badgeBgClass: 'bg-purple-900/60 text-purple-200 border-purple-700/60',
    borderClass: 'border-purple-800/60',
  },
  {
    headerColorClass: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
    badgeBgClass: 'bg-blue-900/60 text-blue-200 border-blue-700/60',
    borderClass: 'border-blue-800/60',
  },
  {
    headerColorClass: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    badgeBgClass: 'bg-rose-900/60 text-rose-200 border-rose-700/60',
    borderClass: 'border-rose-800/60',
  },
] as const;

const DEFAULT_LOCATIONS: LocationConfig[] = LOCATIONS.map((location) => ({
  ...location,
  properties: location.properties.map((property) => ({ ...property })),
}));

interface StoredCatalog {
  locations: LocationConfig[];
  properties: PropertyConfig[];
}

let activeCacheSource: PropertyConfig[] | null = null;
let activeCacheResult: PropertyConfig[] = [];

function slugify(value: string, fallback: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

function uniqueId(base: string, existingIds: Set<string>): string {
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function normalizeLocation(
  location: Partial<LocationConfig>,
  index: number
): LocationConfig | null {
  if (!location.id || !location.name?.trim()) return null;
  const style = LOCATION_STYLES[index % LOCATION_STYLES.length];

  return {
    id: location.id,
    name: location.name.trim().toUpperCase(),
    headerColorClass: location.headerColorClass || style.headerColorClass,
    badgeBgClass: location.badgeBgClass || style.badgeBgClass,
    borderClass: location.borderClass || style.borderClass,
    properties: [],
  };
}

function normalizeProperty(
  property: Partial<PropertyConfig>,
  validLocationIds: Set<string>
): PropertyConfig | null {
  if (!property.id || !property.name?.trim() || !property.locationId) return null;
  if (!validLocationIds.has(property.locationId)) return null;

  return {
    id: property.id,
    name: property.name.trim().toUpperCase(),
    locationId: property.locationId,
    active: property.active !== false,
  };
}

export function resolvePropertyActiveState(
  requestedActive: boolean,
  otherActiveExists: boolean
): boolean {
  return requestedActive === false && !otherActiveExists
    ? true
    : requestedActive;
}

function orderActiveProperties(
  properties: PropertyConfig[],
  locations: LocationConfig[] = LOCATIONS
): PropertyConfig[] {
  const locationOrder = new Map(
    locations.map((location, index) => [location.id, index])
  );

  return properties
    .filter((property) => property.active !== false)
    .map((property, index) => ({ property, index }))
    .sort((a, b) => {
      const locationDifference =
        (locationOrder.get(a.property.locationId) ?? 999) -
        (locationOrder.get(b.property.locationId) ?? 999);
      return locationDifference !== 0 ? locationDifference : a.index - b.index;
    })
    .map(({ property }) => property);
}

function synchronizeLegacyCatalog(
  locations: LocationConfig[],
  properties: PropertyConfig[]
) {
  const activeProperties = orderActiveProperties(properties, locations);

  LOCATIONS.splice(
    0,
    LOCATIONS.length,
    ...locations.map((location) => ({
      ...location,
      properties: activeProperties
        .filter((property) => property.locationId === location.id)
        .map((property) => ({ ...property })),
    }))
  );
  ALL_PROPERTIES.splice(0, ALL_PROPERTIES.length, ...activeProperties);
  activeCacheSource = properties;
  activeCacheResult = activeProperties;
}

function defaultCatalog(): StoredCatalog {
  return {
    locations: DEFAULT_LOCATIONS.map((location) => ({
      ...location,
      properties: [],
    })),
    properties: DEFAULT_PROPERTIES.map((property) => ({ ...property })),
  };
}

function normalizeCatalog(value: unknown): StoredCatalog | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StoredCatalog>;
  if (!Array.isArray(candidate.locations) || !Array.isArray(candidate.properties)) {
    return null;
  }

  const locations = candidate.locations
    .map((location, index) => normalizeLocation(location, index))
    .filter((location): location is LocationConfig => location !== null);
  if (locations.length === 0) return null;

  const locationIds = new Set(locations.map((location) => location.id));
  if (locationIds.size !== locations.length) return null;

  const properties = candidate.properties
    .map((property) => normalizeProperty(property, locationIds))
    .filter((property): property is PropertyConfig => property !== null);
  if (new Set(properties.map((property) => property.id)).size !== properties.length) {
    return null;
  }

  if (!properties.some((property) => property.active !== false) && properties[0]) {
    properties[0] = { ...properties[0], active: true };
  }

  return { locations, properties };
}

function loadCatalog(): StoredCatalog {
  let catalog: StoredCatalog | null = null;

  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (raw) catalog = normalizeCatalog(JSON.parse(raw));
  } catch {
    catalog = null;
  }

  if (!catalog) {
    const defaults = defaultCatalog();
    try {
      const legacyRaw = localStorage.getItem(LEGACY_PROPERTY_STORAGE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) {
          const locationIds = new Set(defaults.locations.map((location) => location.id));
          const legacyProperties = parsed
            .map((property) => normalizeProperty(property, locationIds))
            .filter((property): property is PropertyConfig => property !== null);
          if (legacyProperties.length > 0) defaults.properties = legacyProperties;
        }
      }
    } catch {
      // Keep the default catalog.
    }
    catalog = defaults;
  }

  synchronizeLegacyCatalog(catalog.locations, catalog.properties);
  return catalog;
}

function saveCatalog(locations: LocationConfig[], properties: PropertyConfig[]) {
  const storedLocations = locations.map((location) => ({
    ...location,
    properties: [],
  }));
  localStorage.setItem(
    CATALOG_STORAGE_KEY,
    JSON.stringify({ locations: storedLocations, properties })
  );
  localStorage.setItem(LEGACY_PROPERTY_STORAGE_KEY, JSON.stringify(properties));
  synchronizeLegacyCatalog(storedLocations, properties);
}

interface PropertyStoreState {
  locations: LocationConfig[];
  properties: PropertyConfig[];
  addLocation: (name: string) => LocationConfig | null;
  addProperty: (name: string, locationId: string) => PropertyConfig | null;
  updateProperty: (
    id: string,
    updates: Pick<PropertyConfig, 'name' | 'locationId' | 'active'>
  ) => void;
  replaceCatalog: (
    locations: LocationConfig[] | undefined,
    properties: PropertyConfig[]
  ) => void;
  replaceProperties: (properties: PropertyConfig[]) => void;
  resetProperties: () => void;
}

const loadedCatalog = loadCatalog();

export const usePropertyStore = create<PropertyStoreState>((set, get) => ({
  locations: loadedCatalog.locations,
  properties: loadedCatalog.properties,

  addLocation: (name) => {
    const cleanName = name.trim();
    if (!cleanName) return null;

    const current = get();
    if (
      current.locations.some(
        (location) => location.name.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      return null;
    }

    const id = uniqueId(
      slugify(cleanName, 'location'),
      new Set(current.locations.map((location) => location.id))
    );
    const style = LOCATION_STYLES[current.locations.length % LOCATION_STYLES.length];
    const location: LocationConfig = {
      id,
      name: cleanName.toUpperCase(),
      ...style,
      properties: [],
    };
    const locations = [...current.locations, location];
    saveCatalog(locations, current.properties);
    set({ locations });
    return location;
  },

  addProperty: (name, locationId) => {
    const cleanName = name.trim();
    const current = get();
    if (
      !cleanName ||
      !current.locations.some((location) => location.id === locationId)
    ) {
      return null;
    }

    const property: PropertyConfig = {
      id: uniqueId(
        slugify(cleanName, 'property'),
        new Set(current.properties.map((item) => item.id))
      ),
      name: cleanName.toUpperCase(),
      locationId,
      active: true,
    };

    const properties = [...current.properties, property];
    saveCatalog(current.locations, properties);
    set({ properties });
    return property;
  },

  updateProperty: (id, updates) => {
    const cleanName = updates.name.trim();
    const current = get();
    if (
      !cleanName ||
      !current.locations.some((location) => location.id === updates.locationId)
    ) {
      return;
    }

    const otherActiveExists = current.properties.some(
      (property) => property.id !== id && property.active !== false
    );
    const safeActive = resolvePropertyActiveState(
      updates.active,
      otherActiveExists
    );
    const properties = current.properties.map((property) =>
      property.id === id
        ? {
            ...property,
            name: cleanName.toUpperCase(),
            locationId: updates.locationId,
            active: safeActive,
          }
        : property
    );

    saveCatalog(current.locations, properties);
    set({ properties });
  },

  replaceCatalog: (locationsInput, propertiesInput) => {
    const current = get();
    const candidate = normalizeCatalog({
      locations: locationsInput ?? current.locations,
      properties: propertiesInput,
    });
    const next = candidate ?? defaultCatalog();
    saveCatalog(next.locations, next.properties);
    set(next);
  },

  replaceProperties: (propertiesInput) => {
    const current = get();
    const locationIds = new Set(current.locations.map((location) => location.id));
    const properties = propertiesInput
      .map((property) => normalizeProperty(property, locationIds))
      .filter((property): property is PropertyConfig => property !== null);
    const nextProperties = properties.length > 0
      ? properties
      : DEFAULT_PROPERTIES.map((property) => ({ ...property }));
    if (!nextProperties.some((property) => property.active !== false) && nextProperties[0]) {
      nextProperties[0] = { ...nextProperties[0], active: true };
    }
    saveCatalog(current.locations, nextProperties);
    set({ properties: nextProperties });
  },

  resetProperties: () => {
    const next = defaultCatalog();
    saveCatalog(next.locations, next.properties);
    set(next);
  },
}));

export function getActiveProperties(properties: PropertyConfig[]): PropertyConfig[] {
  if (activeCacheSource === properties) return activeCacheResult;
  activeCacheSource = properties;
  activeCacheResult = orderActiveProperties(properties, LOCATIONS);
  return activeCacheResult;
}
