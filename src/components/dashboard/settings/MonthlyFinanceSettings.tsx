import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Home,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../../store/usePropertyStore';
import { LOCATIONS } from '../../../config/locations';
import { Expense, ExtraIncome, TaxTreatment } from '../../../types';
import { MONTH_NAMES } from '../../../utils/dateUtilities';
import { centsToEuros, eurosToCents, formatCents } from '../../../utils/currency';
import { isRentExpense } from '../../../utils/expenseUtilities';
import { CustomSelect } from '../../common/CustomSelect';

interface IncomeDraft {
  id: string;
  label: string;
  amount: string;
  taxTreatment: TaxTreatment;
  notes?: string;
  createdAt?: string;
}

interface ExpenseDraft {
  id: string;
  label: string;
  amount: string;
  category: string;
  isDeductible: boolean;
  isRecurring: boolean;
  notes?: string;
  createdAt?: string;
}

interface PropertyFinanceDraft {
  rent: string;
  incomes: IncomeDraft[];
  expenses: ExpenseDraft[];
}

const taxTreatmentOptions = [
  { value: 'standard_vat' as const, label: 'Standard VAT' },
  { value: 'accommodation_vat' as const, label: 'Accommodation VAT' },
  { value: 'vat_exempt' as const, label: 'VAT Exempt' },
];

function createDraftId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toAmountString(amountCents: number) {
  return centsToEuros(amountCents).toString();
}

function draftTotal(items: Array<{ amount: string }>) {
  return items.reduce(
    (sum, item) => sum + Math.max(0, eurosToCents(item.amount)),
    0
  );
}

export function MonthlyFinanceSettings() {
  const modalParams = useDashboardStore((state) => state.modalParams);
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const taxConfiguration = useDashboardStore((state) => state.taxConfiguration);
  const addToast = useDashboardStore((state) => state.addToast);
  const addActivity = useDashboardStore((state) => state.addActivity);

  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = useMemo(
    () => getActiveProperties(properties),
    [properties]
  );
  const focusedPropertyId = modalParams.propertyId as string | undefined;
  const [drafts, setDrafts] = useState<Record<string, PropertyFinanceDraft>>({});

  const orderedProperties = useMemo(() => {
    if (!focusedPropertyId) return activeProperties;
    const focused = activeProperties.find(
      (property) => property.id === focusedPropertyId
    );
    if (!focused) return activeProperties;
    return [
      focused,
      ...activeProperties.filter((property) => property.id !== focusedPropertyId),
    ];
  }, [activeProperties, focusedPropertyId]);

  useEffect(() => {
    const nextDrafts: Record<string, PropertyFinanceDraft> = {};

    for (const property of activeProperties) {
      const periodExpenses = expenses.filter(
        (expense) =>
          expense.propertyId === property.id &&
          expense.year === selectedYear &&
          expense.month === selectedMonth
      );
      const periodIncomes = extraIncomes.filter(
        (income) =>
          income.propertyId === property.id &&
          income.year === selectedYear &&
          income.month === selectedMonth
      );
      const rentCents = periodExpenses
        .filter(isRentExpense)
        .reduce((sum, expense) => sum + expense.amountCents, 0);

      nextDrafts[property.id] = {
        rent: toAmountString(rentCents),
        incomes: periodIncomes.map((income) => ({
          id: income.id,
          label: income.label,
          amount: toAmountString(income.amountCents),
          taxTreatment: income.taxTreatment,
          notes: income.notes,
          createdAt: income.createdAt,
        })),
        expenses: periodExpenses
          .filter((expense) => !isRentExpense(expense))
          .map((expense) => ({
            id: expense.id,
            label: expense.label,
            amount: toAmountString(expense.amountCents),
            category: expense.category,
            isDeductible: expense.isDeductible,
            isRecurring: Boolean(expense.isRecurring),
            notes: expense.notes,
            createdAt: expense.createdAt,
          })),
      };
    }

    setDrafts(nextDrafts);
  }, [activeProperties, expenses, extraIncomes, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!focusedPropertyId) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`monthly-finance-${focusedPropertyId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusedPropertyId]);

  const updateDraft = (
    propertyId: string,
    updater: (current: PropertyFinanceDraft) => PropertyFinanceDraft
  ) => {
    setDrafts((current) => {
      const existing = current[propertyId] ?? {
        rent: '0',
        incomes: [],
        expenses: [],
      };
      return { ...current, [propertyId]: updater(existing) };
    });
  };

  const addIncome = (propertyId: string) => {
    updateDraft(propertyId, (current) => ({
      ...current,
      incomes: [
        ...current.incomes,
        {
          id: createDraftId('income'),
          label: '',
          amount: '0',
          taxTreatment:
            taxConfiguration.defaultExtraIncomeTaxTreatment || 'standard_vat',
        },
      ],
    }));
  };

  const addExpense = (propertyId: string) => {
    updateDraft(propertyId, (current) => ({
      ...current,
      expenses: [
        ...current.expenses,
        {
          id: createDraftId('expense'),
          label: '',
          amount: '0',
          category: 'General',
          isDeductible: true,
          isRecurring: false,
        },
      ],
    }));
  };

  const saveMonthlyFinance = () => {
    const now = new Date().toISOString();
    const propertyIds = new Set(activeProperties.map((property) => property.id));
    const state = useDashboardStore.getState();
    const untouchedExpenses = state.expenses.filter(
      (expense) =>
        !(
          propertyIds.has(expense.propertyId) &&
          expense.year === selectedYear &&
          expense.month === selectedMonth
        )
    );
    const untouchedIncomes = state.extraIncomes.filter(
      (income) =>
        !(
          propertyIds.has(income.propertyId) &&
          income.year === selectedYear &&
          income.month === selectedMonth
        )
    );
    const savedExpenses: Expense[] = [];
    const savedIncomes: ExtraIncome[] = [];

    for (const property of activeProperties) {
      const draft = drafts[property.id] ?? {
        rent: '0',
        incomes: [],
        expenses: [],
      };
      const rentCents = Math.max(0, eurosToCents(draft.rent));

      if (rentCents > 0) {
        savedExpenses.push({
          id: `exp-rent-${property.id}-${selectedYear}-${selectedMonth}`,
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

      for (const item of draft.incomes) {
        const label = item.label.trim();
        const amountCents = Math.max(0, eurosToCents(item.amount));
        if (!label || amountCents <= 0) continue;

        savedIncomes.push({
          id: item.id.startsWith('income-') ? createDraftId('ext') : item.id,
          propertyId: property.id,
          year: selectedYear,
          month: selectedMonth,
          label,
          amountCents,
          taxTreatment: item.taxTreatment,
          notes: item.notes,
          createdAt: item.createdAt || now,
          updatedAt: now,
        });
      }

      for (const item of draft.expenses) {
        const label = item.label.trim();
        const category = item.category.trim() || 'General';
        const amountCents = Math.max(0, eurosToCents(item.amount));
        if (!label || amountCents <= 0) continue;

        savedExpenses.push({
          id: item.id.startsWith('expense-') ? createDraftId('exp') : item.id,
          propertyId: property.id,
          year: selectedYear,
          month: selectedMonth,
          label,
          amountCents,
          category,
          isDeductible: item.isDeductible,
          isRecurring: item.isRecurring,
          notes: item.notes,
          createdAt: item.createdAt || now,
          updatedAt: now,
        });
      }
    }

    useDashboardStore.setState({
      expenses: [...untouchedExpenses, ...savedExpenses],
      extraIncomes: [...untouchedIncomes, ...savedIncomes],
    });
    useDashboardStore.getState()._persist();
    addActivity(
      'expense_saved',
      'Monthly Finance',
      `Updated rent, additional income and expenses for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
    );
    addToast({
      type: 'success',
      title: 'Monthly Finance Saved',
      message: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} values are now visible in the ledger.`,
    });
  };

  const copyPreviousMonth = () => {
    const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    let copied = 0;

    setDrafts((current) => {
      const next = { ...current };

      for (const property of activeProperties) {
        const existing = next[property.id] ?? {
          rent: '0',
          incomes: [],
          expenses: [],
        };
        const previousExpenses = expenses.filter(
          (expense) =>
            expense.propertyId === property.id &&
            expense.year === previousYear &&
            expense.month === previousMonth
        );
        const previousRent = previousExpenses
          .filter(isRentExpense)
          .reduce((sum, expense) => sum + expense.amountCents, 0);
        const previousRecurring = previousExpenses.filter(
          (expense) => !isRentExpense(expense) && expense.isRecurring
        );
        const currentLabels = new Set(
          existing.expenses.map((expense) =>
            `${expense.category}:${expense.label}`.toLowerCase()
          )
        );
        const copiedExpenses = previousRecurring
          .filter(
            (expense) =>
              !currentLabels.has(
                `${expense.category}:${expense.label}`.toLowerCase()
              )
          )
          .map((expense) => ({
            id: createDraftId('expense'),
            label: expense.label,
            amount: toAmountString(expense.amountCents),
            category: expense.category,
            isDeductible: expense.isDeductible,
            isRecurring: true,
            notes: expense.notes,
          }));
        const shouldCopyRent =
          eurosToCents(existing.rent) <= 0 && previousRent > 0;
        copied += copiedExpenses.length + (shouldCopyRent ? 1 : 0);

        next[property.id] = {
          ...existing,
          rent: shouldCopyRent ? toAmountString(previousRent) : existing.rent,
          expenses: [...existing.expenses, ...copiedExpenses],
        };
      }

      return next;
    });

    addToast({
      type: copied > 0 ? 'success' : 'info',
      title: copied > 0 ? 'Previous Month Prepared' : 'Nothing to Copy',
      message:
        copied > 0
          ? `${copied} recurring value${copied === 1 ? '' : 's'} added to the form. Save to apply.`
          : 'The current month already contains the recurring values.',
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-900/70 bg-cyan-950/15 p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="font-display text-sm font-black uppercase tracking-wide text-slate-100">
              Monthly Finance
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Manage rent, every additional income item and every operating expense here. Saved values appear automatically in the calendar ledger.
            </p>
            <div className="mt-2 inline-flex rounded-md border border-cyan-800/70 bg-slate-950/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </div>
          </div>
          <button
            type="button"
            onClick={copyPreviousMonth}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800 lg:w-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Copy Previous Month
          </button>
        </div>
      </div>

      {orderedProperties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center text-xs text-slate-500">
          Add or activate a property before configuring monthly finance.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {orderedProperties.map((property) => {
            const draft = drafts[property.id] ?? {
              rent: '0',
              incomes: [],
              expenses: [],
            };
            const rentCents = Math.max(0, eurosToCents(draft.rent));
            const incomeCents = draftTotal(draft.incomes);
            const otherExpenseCents = draftTotal(draft.expenses);
            const configuredResult = incomeCents - rentCents - otherExpenseCents;
            const focused = property.id === focusedPropertyId;

            return (
              <section
                key={property.id}
                id={`monthly-finance-${property.id}`}
                className={`scroll-mt-3 rounded-2xl border bg-slate-950/75 p-3.5 transition-all sm:p-4 ${
                  focused
                    ? 'border-cyan-500/80 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                    : 'border-slate-800'
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="rounded-lg border border-cyan-800 bg-cyan-950/60 p-2 text-cyan-300">
                      <Home className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="truncate text-xs font-black uppercase tracking-wider text-slate-100">
                        {property.name}
                      </h5>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        {LOCATIONS.find(
                          (location) => location.id === property.locationId
                        )?.name || 'Unknown location'}
                      </p>
                    </div>
                  </div>
                  {focused && (
                    <span className="flex-shrink-0 rounded-full border border-cyan-700 bg-cyan-950 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-300">
                      Selected
                    </span>
                  )}
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-violet-900/70 bg-violet-950/20 p-2.5">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-violet-300">Rent</span>
                    <span className="mt-1 block font-mono text-xs font-black text-slate-100">-{formatCents(rentCents)}</span>
                  </div>
                  <div className="rounded-lg border border-emerald-900/70 bg-emerald-950/20 p-2.5">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-emerald-300">Income</span>
                    <span className="mt-1 block font-mono text-xs font-black text-emerald-300">+{formatCents(incomeCents)}</span>
                  </div>
                  <div className="rounded-lg border border-rose-900/70 bg-rose-950/20 p-2.5">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-rose-300">Other Costs</span>
                    <span className="mt-1 block font-mono text-xs font-black text-rose-300">-{formatCents(otherExpenseCents)}</span>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-2.5">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Configured Result</span>
                    <span
                      className={`mt-1 flex items-center gap-1 font-mono text-xs font-black ${
                        configuredResult >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {configuredResult >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {formatCents(configuredResult)}
                    </span>
                  </div>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-violet-300">Monthly Rent (€)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.rent}
                    onChange={(event) =>
                      updateDraft(property.id, (current) => ({
                        ...current,
                        rent: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm font-bold text-slate-100 outline-none focus:border-violet-500"
                  />
                </label>

                <div className="mt-4 rounded-xl border border-emerald-900/60 bg-emerald-950/10 p-3">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div>
                      <h6 className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Additional Income</h6>
                      <p className="mt-0.5 text-[9px] text-slate-500">Set the amount and VAT treatment for each item.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addIncome(property.id)}
                      className="flex h-8 flex-shrink-0 items-center gap-1 rounded-md border border-emerald-800 bg-emerald-950/50 px-2.5 text-[9px] font-black uppercase text-emerald-300 hover:bg-emerald-900/60"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {draft.incomes.length === 0 && (
                      <div className="rounded-lg border border-dashed border-emerald-900/60 px-3 py-3 text-center text-[10px] font-semibold text-slate-600">No additional income for this month</div>
                    )}
                    {draft.incomes.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-2 sm:grid-cols-[minmax(0,1fr)_100px_160px_34px]"
                      >
                        <input
                          value={item.label}
                          onChange={(event) =>
                            updateDraft(property.id, (current) => ({
                              ...current,
                              incomes: current.incomes.map((income, incomeIndex) =>
                                incomeIndex === index
                                  ? { ...income, label: event.target.value }
                                  : income
                              ),
                            }))
                          }
                          placeholder="Income label"
                          className="h-10 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(event) =>
                            updateDraft(property.id, (current) => ({
                              ...current,
                              incomes: current.incomes.map((income, incomeIndex) =>
                                incomeIndex === index
                                  ? { ...income, amount: event.target.value }
                                  : income
                              ),
                            }))
                          }
                          className="h-10 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-emerald-300 outline-none focus:border-emerald-500"
                        />
                        <CustomSelect
                          value={item.taxTreatment}
                          options={taxTreatmentOptions}
                          onChange={(value) =>
                            updateDraft(property.id, (current) => ({
                              ...current,
                              incomes: current.incomes.map((income, incomeIndex) =>
                                incomeIndex === index
                                  ? { ...income, taxTreatment: value }
                                  : income
                              ),
                            }))
                          }
                          className="min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(property.id, (current) => ({
                              ...current,
                              incomes: current.incomes.filter(
                                (_, incomeIndex) => incomeIndex !== index
                              ),
                            }))
                          }
                          className="flex h-10 items-center justify-center rounded-lg border border-rose-900 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50"
                          aria-label="Remove income"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-rose-900/60 bg-rose-950/10 p-3">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div>
                      <h6 className="text-[10px] font-black uppercase tracking-wider text-rose-300">Other Expenses</h6>
                      <p className="mt-0.5 text-[9px] text-slate-500">Set category, deductibility and recurrence for each cost.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addExpense(property.id)}
                      className="flex h-8 flex-shrink-0 items-center gap-1 rounded-md border border-rose-800 bg-rose-950/50 px-2.5 text-[9px] font-black uppercase text-rose-300 hover:bg-rose-900/60"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {draft.expenses.length === 0 && (
                      <div className="rounded-lg border border-dashed border-rose-900/60 px-3 py-3 text-center text-[10px] font-semibold text-slate-600">No other expenses for this month</div>
                    )}
                    {draft.expenses.map((item, index) => (
                      <div
                        key={item.id}
                        className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2"
                      >
                        <div className="grid grid-cols-[minmax(0,1fr)_100px_34px] gap-2">
                          <input
                            value={item.label}
                            onChange={(event) =>
                              updateDraft(property.id, (current) => ({
                                ...current,
                                expenses: current.expenses.map((expense, expenseIndex) =>
                                  expenseIndex === index
                                    ? { ...expense, label: event.target.value }
                                    : expense
                                ),
                              }))
                            }
                            placeholder="Expense label"
                            className="h-9 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-100 outline-none focus:border-rose-500"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.amount}
                            onChange={(event) =>
                              updateDraft(property.id, (current) => ({
                                ...current,
                                expenses: current.expenses.map((expense, expenseIndex) =>
                                  expenseIndex === index
                                    ? { ...expense, amount: event.target.value }
                                    : expense
                                ),
                              }))
                            }
                            className="h-9 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-rose-300 outline-none focus:border-rose-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(property.id, (current) => ({
                                ...current,
                                expenses: current.expenses.filter(
                                  (_, expenseIndex) => expenseIndex !== index
                                ),
                              }))
                            }
                            className="flex h-9 items-center justify-center rounded-lg border border-rose-900 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50"
                            aria-label="Remove expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                          <input
                            value={item.category}
                            onChange={(event) =>
                              updateDraft(property.id, (current) => ({
                                ...current,
                                expenses: current.expenses.map((expense, expenseIndex) =>
                                  expenseIndex === index
                                    ? { ...expense, category: event.target.value }
                                    : expense
                                ),
                              }))
                            }
                            placeholder="Category"
                            className="h-9 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-300 outline-none focus:border-rose-500"
                          />
                          <label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-800 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <input
                              type="checkbox"
                              checked={item.isDeductible}
                              onChange={(event) =>
                                updateDraft(property.id, (current) => ({
                                  ...current,
                                  expenses: current.expenses.map((expense, expenseIndex) =>
                                    expenseIndex === index
                                      ? { ...expense, isDeductible: event.target.checked }
                                      : expense
                                  ),
                                }))
                              }
                              className="themed-checkbox"
                            />
                            Deductible
                          </label>
                          <label className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-800 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <input
                              type="checkbox"
                              checked={item.isRecurring}
                              onChange={(event) =>
                                updateDraft(property.id, (current) => ({
                                  ...current,
                                  expenses: current.expenses.map((expense, expenseIndex) =>
                                    expenseIndex === index
                                      ? { ...expense, isRecurring: event.target.checked }
                                      : expense
                                  ),
                                }))
                              }
                              className="themed-checkbox"
                            />
                            Repeat
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/95 py-3 backdrop-blur">
        <div className="hidden items-center gap-2 text-[10px] font-semibold text-slate-500 sm:flex">
          <ReceiptText className="h-3.5 w-3.5" /> Changes apply to the selected month only.
        </div>
        <button
          type="button"
          onClick={saveMonthlyFinance}
          disabled={activeProperties.length === 0}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Save className="h-4 w-4" /> Save Monthly Finance
        </button>
      </div>
    </div>
  );
}
