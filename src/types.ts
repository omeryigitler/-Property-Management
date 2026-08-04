export type Channel = 'airbnb' | 'booking_com' | 'direct' | 'vrbo';

export type BookingStatus =
  | 'confirmed'
  | 'provisional'
  | 'cancelled'
  | 'checked_in'
  | 'checked_out';

export interface Booking {
  id: string;
  propertyId: string;
  guestName: string;
  channel: Channel;
  checkInDate: string;
  checkOutDate: string;
  nightlyRateCents: number;
  status: BookingStatus;
  externalUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  propertyId: string;
  month: number;
  year: number;
  label: string;
  amountCents: number;
  category: string;
  notes?: string;
  isRecurring?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtraIncome {
  id: string;
  propertyId: string;
  month: number;
  year: number;
  label: string;
  amountCents: number;
  notes?: string;
  createdAt: string;
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
    | 'property_saved'
    | 'location_saved'
    | 'backup_imported'
    | 'ical_imported'
    | 'pii_anonymized'
    | 'data_cleared';
  entity: string;
  description: string;
}

export interface PropertyFinancials {
  propertyId: string;
  bookingIncomeCents: number;
  extraIncomeCents: number;
  totalExpensesCents: number;
  netBalanceCents: number;
}

export interface AggregatedFinancials {
  combinedBookingIncomeCents: number;
  combinedExtraIncomeCents: number;
  combinedExpenseCents: number;
  combinedNetBalanceCents: number;
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
  active: boolean;
}

export interface UserPreferences {
  stickyDailyTotal: boolean;
  showProvisionalBlock: boolean;
  compactGridRows: boolean;
  currencySymbol: string;
  privacyMode: boolean;
  dataRetentionMonths: number;
}

export type MainViewMode = 'calendar' | 'analytics';

export interface BackupData {
  version: number;
  exportedAt: string;
  containsPii: boolean;
  locations?: LocationConfig[];
  properties?: PropertyConfig[];
  bookings: Booking[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
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
  locations?: LocationConfig[];
  properties?: PropertyConfig[];
  bookings: Booking[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  userPreferences: UserPreferences;
  activityHistory: ActivityRecord[];
}
