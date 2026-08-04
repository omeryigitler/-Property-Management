import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  Database,
  Download,
  Home,
  LayoutDashboard,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  WalletCards,
  X,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { LOCATIONS } from '../../config/locations';
import { PropertyConfig } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { centsToEuros, eurosToCents, formatCents } from '../../utils/currency';
import { isRentExpense } from '../../utils/expenseUtilities';
import { isTaxConfigured } from '../../utils/taxCalculations';
import { MONTH_NAMES } from '../../utils/dateUtilities';

const MANAGED_INCOME_NOTE = 'Managed from Settings · Monthly Additional Income';

type SettingsSection = 'overview' | 'properties' | 'finance' | 'display' | 'data';

interface FinanceDraft {
  rent: string;
  income: string;
}

const sectionOptions: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'finance', label: 'Monthly Finance', icon: WalletCards },
  { id: 'display', label: 'Display', icon: SlidersHorizontal },
  { id: 'data', label: 'Tax & Data', icon: Database },
];

function PropertyEditorCard({
  property,
  onSaved,
}: {
  property: PropertyConfig;
  onSaved: (property: PropertyConfig) => void;
}) {
  const updateProperty = usePropertyStore((state) => state.updateProperty);
  const [name, setName] = useState(property.name);
  const [locationId, setLocationId] = useState(property.locationId);
  const [active, setActive] = useState(property.active !== false);

  useEffect(() => {
    setName(property.name);
    setLocationId(property.locationId);
    setActive(property.active !== false);
  }, [property]);

  const locationOptions = LOCATIONS.map((location) => ({
    value: location.id,
    label: location.name,
  }));

  const handleSave = () => {
    if (!name.trim()) return;
    const updated = {
      ...property,
      name: name.trim().toUpperCase(),
      locationId,
      active,
    };
    updateProperty(property.id, updated);
    onSaved(updated);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-3.5">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_auto] lg:items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Property Name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-bold text-slate-100 outline-none focus:border-cyan-500"
          />
        </div>

        <CustomSelect
          label="Location"
          value={locationId}
          onChange={(value) => setLocationId(String(value))}
          options={locationOptions}
        />

        <div className="flex items-center gap-2">
          <label className="flex h-10 min-w-28 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-200 lg:flex-none">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="themed-checkbox"
            />
            Active
          </label>
          <button
            type="button"
            onClick={handleSave}
            className="flex h-10 min-w-24 flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-xs font-black uppercase tracking-wider text-white hover:bg-cyan-500 lg:flex-none"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const openConfirmation = useDashboardStore((state) => state.openConfirmation);
  const addToast = useDashboardStore((state) => state.addToast);
  const addActivity = useDashboardStore((state) => state.addActivity);
  const resetDefaultSeedData = useDashboardStore((state) => state.resetDefaultSeedData);

  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const taxConfiguration = useDashboardStore((state) => state.taxConfiguration);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const preferences = useDashboardStore((state) => state.userPreferences);
  const updateUserPreferences = useDashboardStore((state) => state.updateUserPreferences);

  const properties = usePropertyStore((state) => state.properties);
  const addProperty = usePropertyStore((state) => state.addProperty);
  const resetProperties = usePropertyStore((state) => state.resetProperties);
  const activeProperties = getActiveProperties(properties);

  const requestedSection = modalParams.section as SettingsSection | undefined;
  const [section, setSection] = useState<SettingsSection>('overview');
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newLocationId, setNewLocationId] = useState(LOCATIONS[0]?.id ?? '');
  const [newPropertyRent, setNewPropertyRent] = useState('0');
  const [financeDrafts, setFinanceDrafts] = useState<Record<string, FinanceDraft>>({});

  const taxesConfigured = isTaxConfigured(taxConfiguration);

  const locationOptions = useMemo(
    () => LOCATIONS.map((location) => ({ value: location.id, label: location.name })),
    []
  );

  useEffect(() => {
    if (activeModal === 'settings') {
      setSection(requestedSection ?? 'overview');
    }
  }, [activeModal, requestedSection]);

  useEffect(() => {
    if (activeModal !== 'settings') return;

    const nextDrafts: Record<string, FinanceDraft> = {};
    for (const property of activeProperties) {
      const rentCents = expenses
        .filter(
          (expense) =>
            expense.propertyId === property.id &&
            expense.year === selectedYear &&
            expense.month === selectedMonth &&
            isRentExpense(expense)
        )
        .reduce((sum, expense) => sum + expense.amountCents, 0);
      const managedIncomeCents = extraIncomes
        .filter(
          (income) =>
            income.propertyId === property.id &&
            income.year === selectedYear &&
            income.month === selectedMonth &&
            income.notes === MANAGED_INCOME_NOTE
        )
        .reduce((sum, income) => sum + income.amountCents, 0);

      nextDrafts[property.id] = {
        rent: centsToEuros(rentCents).toString(),
        income: centsToEuros(managedIncomeCents).toString(),
      };
    }
    setFinanceDrafts(nextDrafts);
  }, [activeModal, activeProperties, expenses, extraIncomes, selectedMonth, selectedYear]);

  if (activeModal !== 'settings') return null;

  const handleAddProperty = () => {
    const property = addProperty(newPropertyName, newLocationId);
    if (!property) {
      addToast({
        type: 'error',
        title: 'Property Not Added',
        message: 'Enter a property name and select a valid location.',
      });
      return;
    }

    const rentCents = eurosToCents(newPropertyRent);
    if (rentCents > 0) {
      const now = new Date().toISOString();
      useDashboardStore.setState((state) => ({
        expenses: [
          ...state.expenses,
          {
            id: `exp-rent-${property.id}-${selectedYear}-${selectedMonth}-${Date.now()}`,
            propertyId: property.id,
            year: selectedYear,
            month: selectedMonth,
            label: 'Rent',
            amountCents: rentCents,
            category: 'Rent',
            isDeductible: true,
            isRecurring: true,
            notes: 'Monthly property rent',
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
      useDashboardStore.getState()._persist();
    }

    addActivity('property_saved', property.name, `Added property in ${property.locationId}`);
    addToast({ type: 'success', title: 'Property Added', message: `${property.name} is now active.` });
    setNewPropertyName('');
    setNewPropertyRent('0');
  };

  const handlePropertySaved = (property: PropertyConfig) => {
    addActivity(
      'property_saved',
      property.name,
      `${property.active ? 'Updated' : 'Deactivated'} property configuration`
    );
    addToast({
      type: 'success',
      title: 'Property Saved',
      message: `${property.name} settings updated.`,
    });
  };

  const handleSaveMonthlyFinance = () => {
    const now = new Date().toISOString();
    let nextExpenses = [...useDashboardStore.getState().expenses];
    let nextExtraIncomes = [...useDashboardStore.getState().extraIncomes];

    for (const property of activeProperties) {
      const draft = financeDrafts[property.id] ?? { rent: '0', income: '0' };
      const rentCents = Math.max(0, eurosToCents(draft.rent));
      const incomeCents = Math.max(0, eurosToCents(draft.income));

      const rentIndexes = nextExpenses
        .map((expense, index) => ({ expense, index }))
        .filter(
          ({ expense }) =>
            expense.propertyId === property.id &&
            expense.year === selectedYear &&
            expense.month === selectedMonth &&
            isRentExpense(expense)
        );

      if (rentIndexes.length > 0) {
        const [first, ...duplicates] = rentIndexes;
        nextExpenses[first.index] = {
          ...nextExpenses[first.index],
          amountCents: rentCents,
          isRecurring: true,
          updatedAt: now,
        };
        const duplicateIds = new Set(duplicates.map(({ expense }) => expense.id));
        nextExpenses = nextExpenses.filter((expense) => !duplicateIds.has(expense.id));
      } else {
        nextExpenses.push({
          id: `exp-rent-${property.id}-${selectedYear}-${selectedMonth}-${Date.now()}`,
          propertyId: property.id,
          year: selectedYear,
          month: selectedMonth,
          label: 'Rent',
          amountCents: rentCents,
          category: 'Rent',
          isDeductible: true,
          isRecurring: true,
          notes: 'Monthly property rent',
          createdAt: now,
          updatedAt: now,
        });
      }

      const managedIncomeIndexes = nextExtraIncomes
        .map((income, index) => ({ income, index }))
        .filter(
          ({ income }) =>
            income.propertyId === property.id &&
            income.year === selectedYear &&
            income.month === selectedMonth &&
            income.notes === MANAGED_INCOME_NOTE
        );

      if (managedIncomeIndexes.length > 0) {
        const [first, ...duplicates] = managedIncomeIndexes;
        nextExtraIncomes[first.index] = {
          ...nextExtraIncomes[first.index],
          amountCents: incomeCents,
          updatedAt: now,
        };
        const duplicateIds = new Set(duplicates.map(({ income }) => income.id));
        nextExtraIncomes = nextExtraIncomes.filter((income) => !duplicateIds.has(income.id));
      } else if (incomeCents > 0) {
        nextExtraIncomes.push({
          id: `ext-managed-${property.id}-${selectedYear}-${selectedMonth}-${Date.now()}`,
          propertyId: property.id,
          year: selectedYear,
          month: selectedMonth,
          label: 'Additional Income',
          amountCents: incomeCents,
          taxTreatment: taxConfiguration.defaultExtraIncomeTaxTreatment || 'standard_vat',
          notes: MANAGED_INCOME_NOTE,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    useDashboardStore.setState({ expenses: nextExpenses, extraIncomes: nextExtraIncomes });
    useDashboardStore.getState()._persist();
    addActivity(
      'expense_saved',
      'Monthly Finance',
      `Updated rent and additional income for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
    );
    addToast({
      type: 'success',
      title: 'Monthly Finance Saved',
      message: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} values updated.`,
    });
  };

  const handleCopyPreviousMonth = () => {
    const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const now = new Date().toISOString();
    const state = useDashboardStore.getState();
    let nextExpenses = [...state.expenses];
    let nextExtraIncomes = [...state.extraIncomes];
    let copied = 0;

    for (const property of activeProperties) {
      const previousRecurring = state.expenses.filter(
        (expense) =>
          expense.propertyId === property.id &&
          expense.year === previousYear &&
          expense.month === previousMonth &&
          expense.isRecurring
      );

      for (const source of previousRecurring) {
        const exists = nextExpenses.some(
          (expense) =>
            expense.propertyId === property.id &&
            expense.year === selectedYear &&
            expense.month === selectedMonth &&
            expense.category === source.category &&
            expense.label === source.label
        );
        if (exists) continue;

        nextExpenses.push({
          ...source,
          id: `exp-copy-${property.id}-${selectedYear}-${selectedMonth}-${Date.now()}-${copied}`,
          year: selectedYear,
          month: selectedMonth,
          createdAt: now,
          updatedAt: now,
        });
        copied += 1;
      }

      const previousManagedIncome = state.extraIncomes.find(
        (income) =>
          income.propertyId === property.id &&
          income.year === previousYear &&
          income.month === previousMonth &&
          income.notes === MANAGED_INCOME_NOTE
      );
      const currentManagedIncome = nextExtraIncomes.some(
        (income) =>
          income.propertyId === property.id &&
          income.year === selectedYear &&
          income.month === selectedMonth &&
          income.notes === MANAGED_INCOME_NOTE
      );

      if (previousManagedIncome && !currentManagedIncome) {
        nextExtraIncomes.push({
          ...previousManagedIncome,
          id: `ext-copy-${property.id}-${selectedYear}-${selectedMonth}-${Date.now()}`,
          year: selectedYear,
          month: selectedMonth,
          createdAt: now,
          updatedAt: now,
        });
        copied += 1;
      }
    }

    useDashboardStore.setState({ expenses: nextExpenses, extraIncomes: nextExtraIncomes });
    useDashboardStore.getState()._persist();
    addToast({
      type: copied > 0 ? 'success' : 'info',
      title: copied > 0 ? 'Previous Month Copied' : 'Nothing to Copy',
      message:
        copied > 0
          ? `${copied} recurring value${copied === 1 ? '' : 's'} added.`
          : 'Current month already contains the recurring values.',
    });
  };

  const handleReset = () => {
    openConfirmation({
      title: 'Reset Application Data?',
      message:
        'This restores default properties, sample bookings, expenses and tax configuration. Current custom data will be overwritten.',
      confirmText: 'Reset All Data',
      variant: 'danger',
      onConfirm: () => {
        resetProperties();
        resetDefaultSeedData();
        closeModal();
      },
    });
  };

  const navButton = (item: (typeof sectionOptions)[number]) => {
    const Icon = item.icon;
    const selected = section === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setSection(item.id)}
        className={`flex min-h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-[10px] font-black uppercase tracking-wider transition-colors sm:w-full sm:justify-start ${
          selected
            ? 'border-cyan-600 bg-cyan-950/80 text-cyan-200'
            : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        {item.label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-0 backdrop-blur-md sm:p-4">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden border-slate-700/90 bg-slate-900 text-slate-100 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-6xl sm:rounded-2xl sm:border">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg border border-cyan-800 bg-cyan-950/70 p-2 text-cyan-300">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-black uppercase tracking-tight sm:text-lg">
                Settings & Management
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Properties, monthly finance, tax, backup and display
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="flex flex-shrink-0 gap-2 overflow-x-auto border-b border-slate-800 bg-slate-900 px-3 py-2.5 no-scrollbar sm:w-48 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3">
            {sectionOptions.map(navButton)}
          </nav>

          <main className="min-h-0 flex-1 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))] no-scrollbar sm:p-5">
            {section === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-display text-sm font-black uppercase tracking-wide text-slate-100">
                    Management Overview
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    All operational settings are grouped here so the calendar remains clean.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setSection('properties')}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-cyan-700"
                  >
                    <Building2 className="h-5 w-5 text-cyan-400" />
                    <p className="mt-3 text-sm font-black text-slate-100">Properties</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activeProperties.length} active of {properties.length} total
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSection('finance')}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-violet-700"
                  >
                    <WalletCards className="h-5 w-5 text-violet-400" />
                    <p className="mt-3 text-sm font-black text-slate-100">Monthly Finance</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Rent and additional income · {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSection('data')}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-emerald-700"
                  >
                    {taxesConfigured ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-amber-400" />
                    )}
                    <p className="mt-3 text-sm font-black text-slate-100">Tax & Data</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {taxesConfigured ? 'Taxes configured' : 'Tax setup required'} · backup and history
                    </p>
                  </button>
                </div>
              </div>
            )}

            {section === 'properties' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-display text-sm font-black uppercase tracking-wide text-slate-100">
                    Property Management
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Deactivate instead of deleting so historic reservations remain intact.
                  </p>
                </div>

                <div className="rounded-xl border border-cyan-900/70 bg-cyan-950/15 p-3.5">
                  <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-300">
                    <Plus className="h-4 w-4" /> Add Property
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_150px_auto] lg:items-end">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Property Name
                      </label>
                      <input
                        value={newPropertyName}
                        onChange={(event) => setNewPropertyName(event.target.value)}
                        placeholder="e.g. 3 Meridian"
                        className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-500"
                      />
                    </div>
                    <CustomSelect
                      label="Location"
                      value={newLocationId}
                      onChange={(value) => setNewLocationId(String(value))}
                      options={locationOptions}
                    />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Current Rent (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newPropertyRent}
                        onChange={(event) => setNewPropertyRent(event.target.value)}
                        className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddProperty}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#ff3e00] px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-[#e03700]"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {properties.map((property) => (
                    <PropertyEditorCard
                      key={property.id}
                      property={property}
                      onSaved={handlePropertySaved}
                    />
                  ))}
                </div>
              </div>
            )}

            {section === 'finance' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="font-display text-sm font-black uppercase tracking-wide text-slate-100">
                      Monthly Finance
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear} · rent and settings-managed additional income
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPreviousMonth}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Copy Previous Month
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {activeProperties.map((property) => {
                    const draft = financeDrafts[property.id] ?? { rent: '0', income: '0' };
                    return (
                      <div key={property.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                        <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <Home className="h-4 w-4 flex-shrink-0 text-cyan-400" />
                            <span className="truncate text-xs font-black uppercase tracking-wider text-slate-100">
                              {property.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-slate-500">
                            {LOCATIONS.find((location) => location.id === property.locationId)?.name}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-violet-300">
                              Monthly Rent (€)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draft.rent}
                              onChange={(event) =>
                                setFinanceDrafts((current) => ({
                                  ...current,
                                  [property.id]: { ...draft, rent: event.target.value },
                                }))
                              }
                              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-mono text-slate-100 outline-none focus:border-violet-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                              Additional Income (€)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draft.income}
                              onChange={(event) =>
                                setFinanceDrafts((current) => ({
                                  ...current,
                                  [property.id]: { ...draft, income: event.target.value },
                                }))
                              }
                              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-mono text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="sticky bottom-0 flex justify-end border-t border-slate-800 bg-slate-900/95 py-3 backdrop-blur">
                  <button
                    type="button"
                    onClick={handleSaveMonthlyFinance}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-500 sm:w-auto"
                  >
                    <Save className="h-4 w-4" /> Save Monthly Finance
                  </button>
                </div>
              </div>
            )}

            {section === 'display' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-display text-sm font-black uppercase tracking-wide text-slate-100">
                    Display Preferences
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">Keep the working view compact and readable.</p>
                </div>

                {[
                  {
                    key: 'stickyDailyTotal' as const,
                    title: 'Sticky Daily Total Column',
                    description: "Keep 'DAILY TOTAL' pinned on the right of the grid.",
                  },
                  {
                    key: 'showProvisionalBlock' as const,
                    title: 'Highlight Provisional Bookings',
                    description: 'Use a striped pattern for unconfirmed reservations.',
                  },
                  {
                    key: 'compactGridRows' as const,
                    title: 'Compact Density Rows',
                    description: 'Reduce row height on high-density screens.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-slate-700"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-200">{item.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(preferences[item.key])}
                      onChange={(event) =>
                        updateUserPreferences({ [item.key]: event.target.checked })
                      }
                      className="themed-checkbox"
                    />
                  </label>
                ))}
              </div>
            )}

            {section === 'data' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-display text-sm font-black uppercase tracking-wide text-slate-100">
                    Tax, Backup & History
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Advanced actions are kept out of the main header.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => openModal('tax_config', { returnToSettings: true, returnSection: 'data' })}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-emerald-700"
                  >
                    {taxesConfigured ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-amber-400" />
                    )}
                    <p className="mt-3 text-sm font-black text-slate-100">Tax Configuration</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {taxesConfigured
                        ? `${taxConfiguration.accommodationVatRate}% accommodation VAT · ${taxConfiguration.incomeTaxRate}% income tax`
                        : 'Required before final net balance calculation'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => openModal('export_import', { returnToSettings: true, returnSection: 'data' })}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-cyan-700"
                  >
                    <Download className="h-5 w-5 text-cyan-400" />
                    <p className="mt-3 text-sm font-black text-slate-100">Export & Backup</p>
                    <p className="mt-1 text-xs text-slate-500">
                      CSV exports, complete JSON backup and restore.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => openModal('history', { returnToSettings: true, returnSection: 'data' })}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-violet-700"
                  >
                    <Activity className="h-5 w-5 text-violet-400" />
                    <p className="mt-3 text-sm font-black text-slate-100">Activity History</p>
                    <p className="mt-1 text-xs text-slate-500">Review recent booking and finance changes.</p>
                  </button>
                </div>

                <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-300">
                        <RotateCcw className="h-4 w-4" /> Reset Demo Data
                      </div>
                      <p className="mt-1 text-xs text-rose-200/60">
                        Restores default properties, bookings, expenses and tax values.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-700 bg-rose-900 px-4 text-xs font-black uppercase tracking-wider text-rose-100 hover:bg-rose-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
