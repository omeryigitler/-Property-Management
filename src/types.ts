export type Channel = 'airbnb' | 'booking_com' | 'direct' | 'vrbo';

export type BookingStatus = 'confirmed' | 'provisional' | 'cancelled' | 'checked_in' | 'checked_out';

export type CommissionMode = 'percentage' | 'fixed' | 'none';

export type TurnoverStatus = 'sufficient' | 'tight' | 'insufficient' | 'not_applicable';

export type BookingSource = 'manual' | 'ical' | 'airbnb_api' | 'booking_api' | 'vrbo_api';

export type SyncStatus = 
  | 'not_synced' 
  | 'pending' 
  | 'synced' 
  | 'updated' 
  | 'conflict' 
  | 'missing_external_record' 
  | 'error';

export interface Booking {
  id: string;
  propertyId: string;
  guestName: string;
  channel: Channel;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  nightlyRateCents: number; // Integer cents
  adults: number;
  children: number;
  status: BookingStatus;
  discountCents: number; // Integer cents
  cleaningFeeCents: number; // Integer cents
  notes?: string;
  bookingRef?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  identificationDetails?: string;

  // OTA Channel Commission Fields
  commissionMode: CommissionMode;
  commissionPercentage: number; // e.g. 15 for 15%
  commissionFixedAmountCents: number; // Cents if fixed
  suggestedCommissionPercentage: number;
  commissionOverrideEnabled: boolean;
  commissionNotes?: string;

  // Operational Times & Turnover
  checkInTime: string; // e.g. "15:00"
  checkOutTime: string; // e.g. "10:00"
  timezone: string; // e.g. "Europe/Malta"
  earlyCheckIn: boolean;
  lateCheckOut: boolean;
  requiredTurnoverMinutes: number; // e.g. 240
  turnoverStatus: TurnoverStatus;

  // External Sync & iCal Fields
  source: BookingSource;
  externalUid?: string;
  externalCalendarId?: string;
  externalPropertyId?: string;
  externalSourceName?: string;
  importedAt?: string;
  lastSyncedAt?: string;
  externalCreatedAt?: string;
  externalUpdatedAt?: string;
  syncStatus: SyncStatus;
  syncError?: string;
  etag?: string;
  sequence?: number;
  rawExternalStatus?: string;
  isExternalReadOnly?: boolean;
  externalUrlHash?: string;
  manuallyModifiedAfterSync?: boolean;

  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export type TaxTreatment = 'accommodation_vat' | 'standard_vat' | 'vat_exempt';

export type EcoTaxBasis = 'per_occupied_night' | 'per_booking' | 'per_guest_per_night';

export type IncomeTaxBasis = 'gross_revenue' | 'net_after_vat' | 'net_after_commission' | 'taxable_profit';

export type VatInclusivity = 'inclusive' | 'exclusive';

export type VatBasis = 'gross' | 'net_after_commission' | 'excluding_vat';

export type CommissionBasis = 'accommodation_only' | 'accommodation_plus_fees' | 'gross_after_discounts' | 'manual';

export type FixedCommissionAllocationRule = 'check_in_date' | 'proportional_nights' | 'payout_date';

export type InsufficientTurnoverAction = 'warning_allow' | 'require_confirmation' | 'block_submission';

export interface TaxConfiguration {
  accommodationVatRate: number | null; // e.g. 7 for 7%
  standardVatRate: number | null; // e.g. 18 for 18%
  incomeTaxRate: number | null; // e.g. 15 for 15%
  ecoContributionCents: number | null; // Cents per night/booking/guest
  
  // Advanced Rules
  vatInclusivity: VatInclusivity;
  vatBasis: VatBasis;
  ecoTaxBasis: EcoTaxBasis;
  incomeTaxBasis: IncomeTaxBasis;
  defaultExtraIncomeTaxTreatment: TaxTreatment;

  // Commission Basis & Rules
  commissionBasis: CommissionBasis;
  fixedCommissionAllocationRule: FixedCommissionAllocationRule;

  // Default Operational Settings
  defaultCheckInTime: string; // "15:00"
  defaultCheckOutTime: string; // "10:00"
  defaultTurnoverMinutes: number; // 240 (4 hours)
  insufficientTurnoverAction: InsufficientTurnoverAction;
}

export interface Expense {
  id: string;
  propertyId: string;
  month: number; // 1-12
  year: number;
  label: string;
  amountCents: number;
  category: string;
  isDeductible: boolean;
  notes?: string;
  isRecurring?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtraIncome {
  id: string;
  propertyId: string;
  month: number; // 1-12
  year: number;
  label: string;
  amountCents: number;
  taxTreatment: TaxTreatment;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CleaningStatus = 'not_scheduled' | 'scheduled' | 'in_progress' | 'completed' | 'issue_reported';

export interface TurnoverTask {
  id: string;
  propertyId: string;
  date: string; // YYYY-MM-DD
  departingBookingId?: string;
  incomingBookingId?: string;
  checkOutTime: string;
  checkInTime: string;
  availableMinutes: number;
  requiredMinutes: number;
  status: CleaningStatus;
  assignedCleaner?: string;
  notes?: string;
  updatedAt: string;
}

export interface ActivityRecord {
  id: string;
  timestamp: string;
  action: 
    | 'booking_created' 
    | 'booking_updated' 
    | 'booking_cancelled' 
    | 'booking_deleted' 
    | 'expense_saved' 
    | 'expense_deleted' 
    | 'extra_income_saved' 
    | 'extra_income_deleted' 
    | 'tax_config_updated' 
    | 'backup_imported'
    | 'ical_imported'
    | 'pii_anonymized'
    | 'data_cleared';
  entity: string;
  description: string;
}

export interface PropertyFinancials {
  propertyId: string;
  grossBookingIncomeCents: number;
  otaCommissionCents: number;
  netBookingIncomeCents: number;
  extraIncomeCents: number;
  totalExpensesCents: number;
  accommodationVatCents: number | null;
  standardVatCents: number | null;
  ecoContributionCents: number | null;
  incomeTaxCents: number | null;
  calculatedTaxesCents: number | null;
  netBalanceCents: number | null;
  isTaxConfigured: boolean;
}

export interface AggregatedFinancials {
  combinedGrossBookingIncomeCents: number;
  combinedOtaCommissionCents: number;
  combinedNetBookingIncomeCents: number;
  combinedExtraIncomeCents: number;
  combinedExpenseCents: number;
  combinedAccommodationVatCents: number | null;
  combinedStandardVatCents: number | null;
  combinedEcoContributionCents: number | null;
  combinedIncomeTaxCents: number | null;
  combinedCalculatedTaxesCents: number | null;
  combinedNetBalanceCents: number | null;
  isTaxConfigured: boolean;
}

export interface LocationConfig {
  id: string;
  name: string;
  headerColorClass: string;
  badgeBgClass: string;
  borderClass: string;
  properties: PropertyConfig[];
}

export interface PropertyConfig {
  id: string;
  name: string;
  locationId: string;
}

export interface UserPreferences {
  stickyDailyTotal: boolean;
  showProvisionalBlock: boolean;
  compactGridRows: boolean;
  currencySymbol: string;
  privacyMode: boolean;
  dataRetentionMonths: number;
}

export type MainViewMode = 'calendar' | 'analytics' | 'operations' | 'finance_config';

export interface BackupData {
  version: number;
  exportedAt: string;
  containsPii: boolean;
  taxConfiguration: TaxConfiguration;
  bookings: Booking[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  turnoverTasks?: TurnoverTask[];
  userPreferences: UserPreferences;
  activityHistory: ActivityRecord[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  undoAction?: () => void;
  duration?: number;
}

export interface PersistedState {
  version: number;
  selectedMonth: number;
  selectedYear: number;
  taxConfiguration: TaxConfiguration;
  bookings: Booking[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  userPreferences: UserPreferences;
  activityHistory: ActivityRecord[];
}


