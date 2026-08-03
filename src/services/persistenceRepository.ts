import {
  Booking,
  Expense,
  ExtraIncome,
  TaxConfiguration,
  UserPreferences,
  ActivityRecord,
  BackupData,
} from '../types';
import { ALL_PROPERTIES } from '../config/locations';

const STORAGE_KEY = 'short_let_dashboard_v1';
const CURRENT_SCHEMA_VERSION = 1;

export interface PersistedState {
  version: number;
  taxConfiguration: TaxConfiguration;
  bookings: Booking[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  selectedMonth: number; // 1-12
  selectedYear: number;
  userPreferences: UserPreferences;
  activityHistory: ActivityRecord[];
}

export const DEFAULT_TAX_CONFIG: TaxConfiguration = {
  accommodationVatRate: 7.0, // 7% Malta short-let VAT
  standardVatRate: 18.0, // 18% Standard VAT
  incomeTaxRate: 15.0, // 15% Short-let income tax
  ecoContributionCents: 50, // €0.50 per night
  vatInclusivity: 'inclusive',
  ecoTaxBasis: 'per_occupied_night',
  incomeTaxBasis: 'taxable_profit',
  defaultExtraIncomeTaxTreatment: 'standard_vat',
  vatBasis: 'gross',
  commissionBasis: 'accommodation_only',
  fixedCommissionAllocationRule: 'check_in_date',
  defaultCheckInTime: '15:00',
  defaultCheckOutTime: '10:00',
  defaultTurnoverMinutes: 240,
  insufficientTurnoverAction: 'warning_allow',
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  stickyDailyTotal: true,
  showProvisionalBlock: true,
  compactGridRows: false,
  currencySymbol: '€',
  privacyMode: false,
  dataRetentionMonths: 24,
};

export function createDefaultExpenses(year: number, month: number): Expense[] {
  const expenses: Expense[] = [];
  const now = new Date().toISOString();

  // Create Rent & Cleaning default expenses for each property for the current month
  for (const property of ALL_PROPERTIES) {
    expenses.push({
      id: `exp-rent-${property.id}-${year}-${month}`,
      propertyId: property.id,
      month,
      year,
      label: 'Rent',
      amountCents: 65000, // €650.00
      category: 'Rent',
      isDeductible: true,
      notes: 'Monthly property lease',
      isRecurring: true,
      createdAt: now,
      updatedAt: now,
    });
    expenses.push({
      id: `exp-clean-${property.id}-${year}-${month}`,
      propertyId: property.id,
      month,
      year,
      label: 'Cleaning',
      amountCents: 12000, // €120.00
      category: 'Cleaning',
      isDeductible: true,
      notes: 'Turnover cleaning & linen change',
      isRecurring: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  return expenses;
}

export function createSeedBookings(currentYear: number, currentMonth: number): Booking[] {
  const now = new Date().toISOString();
  
  // Create 14 realistic bookings across properties including cross-month bookings
  const yearStr = currentYear.toString();
  const mStr = currentMonth.toString().padStart(2, '0');
  const prevMStr = (currentMonth === 1 ? 12 : currentMonth - 1).toString().padStart(2, '0');
  const prevYearStr = (currentMonth === 1 ? currentYear - 1 : currentYear).toString();

  const nextMStr = (currentMonth === 12 ? 1 : currentMonth + 1).toString().padStart(2, '0');
  const nextYearStr = (currentMonth === 12 ? currentYear + 1 : currentYear).toString();

  return [
    // Cross-month booking: Previous month 28 to Current month 3
    {
      id: 'b-seed-1',
      propertyId: '1-the-olive',
      guestName: 'Alexander Wright',
      channel: 'airbnb',
      checkInDate: `${prevYearStr}-${prevMStr}-28`,
      checkOutDate: `${yearStr}-${mStr}-03`,
      nightlyRateCents: 12000, // €120
      adults: 2,
      children: 0,
      status: 'confirmed',
      discountCents: 0,
      cleaningFeeCents: 4000, // €40
      bookingRef: 'HM-AB1029',
      notes: 'Guest requested early check-in',
      createdAt: now,
      updatedAt: now,
    },
    // Mid month booking on 1-the-olive
    {
      id: 'b-seed-2',
      propertyId: '1-the-olive',
      guestName: 'Sophia Martinez',
      channel: 'booking_com',
      checkInDate: `${yearStr}-${mStr}-05`,
      checkOutDate: `${yearStr}-${mStr}-12`,
      nightlyRateCents: 13500, // €135
      adults: 2,
      children: 1,
      status: 'checked_in',
      discountCents: 2000, // €20
      cleaningFeeCents: 4500, // €45
      bookingRef: 'BK-99812',
      contactEmail: 'sophia@example.com',
      createdAt: now,
      updatedAt: now,
    },
    // Same day turnover on 1-the-olive (starts on 12th)
    {
      id: 'b-seed-3',
      propertyId: '1-the-olive',
      guestName: 'Lucas Bauer',
      channel: 'direct',
      checkInDate: `${yearStr}-${mStr}-12`,
      checkOutDate: `${yearStr}-${mStr}-18`,
      nightlyRateCents: 14000,
      adults: 3,
      children: 0,
      status: 'confirmed',
      discountCents: 0,
      cleaningFeeCents: 5000,
      bookingRef: 'DIR-7721',
      createdAt: now,
      updatedAt: now,
    },
    // 8 THE OLIVE
    {
      id: 'b-seed-4',
      propertyId: '8-the-olive',
      guestName: 'Emma Watson',
      channel: 'vrbo',
      checkInDate: `${yearStr}-${mStr}-02`,
      checkOutDate: `${yearStr}-${mStr}-09`,
      nightlyRateCents: 15000,
      adults: 2,
      children: 2,
      status: 'confirmed',
      discountCents: 0,
      cleaningFeeCents: 6000,
      bookingRef: 'VRBO-44812',
      createdAt: now,
      updatedAt: now,
    },
    // THE HOLLIES
    {
      id: 'b-seed-5',
      propertyId: 'the-hollies',
      guestName: 'David Miller',
      channel: 'airbnb',
      checkInDate: `${yearStr}-${mStr}-10`,
      checkOutDate: `${yearStr}-${mStr}-16`,
      nightlyRateCents: 11000,
      adults: 2,
      children: 0,
      status: 'provisional',
      discountCents: 0,
      cleaningFeeCents: 3500,
      bookingRef: 'HM-PRV091',
      notes: 'Pending bank deposit verification',
      createdAt: now,
      updatedAt: now,
    },
    // 1 MERIDIAN (Gzira)
    {
      id: 'b-seed-6',
      propertyId: '1-meridian',
      guestName: 'Matteo Rossi',
      channel: 'booking_com',
      checkInDate: `${yearStr}-${mStr}-04`,
      checkOutDate: `${yearStr}-${mStr}-11`,
      nightlyRateCents: 16500,
      adults: 4,
      children: 0,
      status: 'confirmed',
      discountCents: 3000,
      cleaningFeeCents: 5000,
      bookingRef: 'BK-33921',
      createdAt: now,
      updatedAt: now,
    },
    // 2 MERIDIAN
    {
      id: 'b-seed-7',
      propertyId: '2-meridian',
      guestName: 'Sarah Jenkins',
      channel: 'airbnb',
      checkInDate: `${yearStr}-${mStr}-14`,
      checkOutDate: `${yearStr}-${mStr}-20`,
      nightlyRateCents: 17500,
      adults: 2,
      children: 1,
      status: 'confirmed',
      discountCents: 0,
      cleaningFeeCents: 5000,
      createdAt: now,
      updatedAt: now,
    },
    // MARIOTT
    {
      id: 'b-seed-8',
      propertyId: 'mariott',
      guestName: 'Oliver Smith',
      channel: 'direct',
      checkInDate: `${yearStr}-${mStr}-08`,
      checkOutDate: `${yearStr}-${mStr}-15`,
      nightlyRateCents: 19000,
      adults: 2,
      children: 0,
      status: 'confirmed',
      discountCents: 5000,
      cleaningFeeCents: 6000,
      bookingRef: 'DIR-8812',
      createdAt: now,
      updatedAt: now,
    },
    // ALBERT
    {
      id: 'b-seed-9',
      propertyId: 'albert',
      guestName: 'Camille Laurent',
      channel: 'booking_com',
      checkInDate: `${yearStr}-${mStr}-18`,
      checkOutDate: `${yearStr}-${mStr}-25`,
      nightlyRateCents: 14500,
      adults: 2,
      children: 0,
      status: 'confirmed',
      discountCents: 0,
      cleaningFeeCents: 4000,
      createdAt: now,
      updatedAt: now,
    },
    // 1 PENTHOUSE (Msida)
    {
      id: 'b-seed-10',
      propertyId: '1-penthouse',
      guestName: 'Jan Kowalski',
      channel: 'airbnb',
      checkInDate: `${yearStr}-${mStr}-01`,
      checkOutDate: `${yearStr}-${mStr}-08`,
      nightlyRateCents: 21000,
      adults: 4,
      children: 2,
      status: 'confirmed',
      discountCents: 0,
      cleaningFeeCents: 7500,
      createdAt: now,
      updatedAt: now,
    },
    // 2 PENTHOUSE
    {
      id: 'b-seed-11',
      propertyId: '2-penthouse',
      guestName: 'Elena Rostova',
      channel: 'vrbo',
      checkInDate: `${yearStr}-${mStr}-15`,
      checkOutDate: `${yearStr}-${mStr}-22`,
      nightlyRateCents: 22500,
      adults: 3,
      children: 1,
      status: 'confirmed',
      discountCents: 0,
      cleaningFeeCents: 8000,
      createdAt: now,
      updatedAt: now,
    },
    // SKY (Sliema) - Cross month booking into next month!
    {
      id: 'b-seed-12',
      propertyId: 'sky',
      guestName: 'Henrik Lindqvist',
      channel: 'direct',
      checkInDate: `${yearStr}-${mStr}-27`,
      checkOutDate: `${nextYearStr}-${nextMStr}-04`,
      nightlyRateCents: 26000,
      adults: 2,
      children: 0,
      status: 'confirmed',
      discountCents: 10000,
      cleaningFeeCents: 9000,
      bookingRef: 'DIR-SKY99',
      notes: 'VIP guest - champagne welcome basket',
      createdAt: now,
      updatedAt: now,
    },
  ].map((b) => ({
    commissionMode: 'percentage' as const,
    commissionPercentage: b.channel === 'vrbo' ? 10 : b.channel === 'direct' ? 0 : 15,
    commissionFixedAmountCents: 0,
    suggestedCommissionPercentage: b.channel === 'vrbo' ? 10 : b.channel === 'direct' ? 0 : 15,
    commissionOverrideEnabled: false,
    checkInTime: '15:00',
    checkOutTime: '10:00',
    timezone: 'Europe/Malta',
    earlyCheckIn: false,
    lateCheckOut: false,
    requiredTurnoverMinutes: 240,
    turnoverStatus: 'sufficient' as const,
    source: 'manual' as const,
    syncStatus: 'not_synced' as const,
    ...b,
    channel: b.channel as any,
    status: b.status as any,
  }));
}

export function createSeedExtraIncome(year: number, month: number): ExtraIncome[] {
  const now = new Date().toISOString();
  return [
    {
      id: `ext-1`,
      propertyId: '1-the-olive',
      month,
      year,
      label: 'Late Checkout Fee',
      amountCents: 3500, // €35.00
      taxTreatment: 'standard_vat',
      notes: 'Check-out extended to 16:00',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `ext-2`,
      propertyId: 'mariott',
      month,
      year,
      label: 'Airport Transfer',
      amountCents: 4500, // €45.00
      taxTreatment: 'standard_vat',
      notes: 'Private taxi service provided',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `ext-3`,
      propertyId: 'sky',
      month,
      year,
      label: 'Extra Cleaning',
      amountCents: 5000, // €50.00
      taxTreatment: 'accommodation_vat',
      notes: 'Mid-stay deep linen refreshment',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export class PersistenceRepository {
  public static load(): PersistedState {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.version === CURRENT_SCHEMA_VERSION) {
          return {
            version: CURRENT_SCHEMA_VERSION,
            taxConfiguration: parsed.taxConfiguration || DEFAULT_TAX_CONFIG,
            bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
            expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
            extraIncomes: Array.isArray(parsed.extraIncomes) ? parsed.extraIncomes : [],
            selectedMonth: parsed.selectedMonth || currentMonth,
            selectedYear: parsed.selectedYear || currentYear,
            userPreferences: parsed.userPreferences || DEFAULT_USER_PREFERENCES,
            activityHistory: Array.isArray(parsed.activityHistory) ? parsed.activityHistory : [],
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse persisted state from localStorage:', e);
    }

    // Seed default state when no valid persisted data exists
    const seedExpenses = createDefaultExpenses(currentYear, currentMonth);
    const seedBookings = createSeedBookings(currentYear, currentMonth);
    const seedExtraIncome = createSeedExtraIncome(currentYear, currentMonth);

    const initialState: PersistedState = {
      version: CURRENT_SCHEMA_VERSION,
      taxConfiguration: DEFAULT_TAX_CONFIG,
      bookings: seedBookings,
      expenses: seedExpenses,
      extraIncomes: seedExtraIncome,
      selectedMonth: currentMonth,
      selectedYear: currentYear,
      userPreferences: DEFAULT_USER_PREFERENCES,
      activityHistory: [
        {
          id: 'act-init',
          timestamp: new Date().toISOString(),
          action: 'tax_config_updated',
          entity: 'System',
          description: 'Initial system seed state loaded',
        },
      ],
    };

    PersistenceRepository.save(initialState);
    return initialState;
  }

  public static save(state: PersistedState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save dashboard state to localStorage:', e);
    }
  }

  public static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear dashboard state:', e);
    }
  }
}
