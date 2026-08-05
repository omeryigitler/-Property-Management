import React, { useEffect, useMemo, useState } from 'react';
import { Home, Plus, Save, Trash2 } from 'lucide-react';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../../store/usePropertyStore';
import { LOCATIONS } from '../../../config/locations';
import { Expense, ExtraIncome } from '../../../types';
import { MONTH_NAMES } from '../../../utils/dateUtilities';
import { centsToEuros, eurosToCents, formatCents } from '../../../utils/currency';
import { isRentExpense } from '../../../utils/expenseUtilities';

interface LineDraft {
  id: string;
  label: string;
  amount: string;
  category?: string;
  createdAt?: string;
}

interface PropertyDraft {
  rent: string;
  incomes: LineDraft[];
  expenses: LineDraft[];
}

function createDraftId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function amountInput(cents: number): string {
  return centsToEuros(cents).toString();
}

function totalDraftLines(lines: LineDraft[]): number {
  return lines.reduce(
    (sum, line) => sum + Math.max(0, eurosToCents(line.amount)),
    0
  );
}

export function MonthlyFinanceSettings() {
  const modalParams = useDashboardStore((state) => state.modalParams);
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const addToast = useDashboardStore((state) => state.addToast);
  const addActivity = useDashboardStore((state) => state.addActivity);
  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = useMemo(
    () => getActiveProperties(properties),
    [properties]
  );
  const focusedPropertyId = modalParams.propertyId as string | undefined;
  const [drafts, setDrafts] = useState<Record<string, PropertyDraft>>({});

  const orderedProperties = useMemo(() => {
    if (!focusedPropertyId) return activeProperties;
    const focused = activeProperties.find(
      (property) => property.id === focusedPropertyId
    );
    return focused
      ? [
          focused,
          ...activeProperties.filter(
            (property) => property.id !== focusedPropertyId
          ),
        ]
      : activeProperties;
  }, [activeProperties, focusedPropertyId]);

  useEffect(() => {
    const next: Record<string, PropertyDraft> = {};

    for (const property of activeProperties) {
      const periodExpenses = expenses.filter(
        (item) =>
          item.propertyId === property.id &&
          item.year === selectedYear &&
          item.month === selectedMonth
      );
      const periodIncomes = extraIncomes.filter(
        (item) =>
          item.propertyId === property.id &&
          item.year === selectedYear &&
          item.month === selectedMonth
      );

      next[property.id] = {
        rent: amountInput(
          periodExpenses
            .filter(isRentExpense)
            .reduce((sum, item) => sum + item.amountCents, 0)
        ),
        incomes: periodIncomes.map((item) => ({
          id: item.id,
          label: item.label,
          amount: amountInput(item.amountCents),
          createdAt: item.createdAt,
        })),
        expenses: periodExpenses
          .filter((item) => !isRentExpense(item))
          .map((item) => ({
            id: item.id,
            label: item.label,
            amount: amountInput(item.amountCents),
            category: item.category,
            createdAt: item.createdAt,
          })),
      };
    }

    setDrafts(next);
  }, [activeProperties, expenses, extraIncomes, selectedYear, selectedMonth]);

  const updateDraft = (
    propertyId: string,
    updater: (draft: PropertyDraft) => PropertyDraft
  ) => {
    setDrafts((current) => ({
      ...current,
      [propertyId]: updater(
        current[propertyId] ?? { rent: '0', incomes: [], expenses: [] }
      ),
    }));
  };

  const save = () => {
    const now = new Date().toISOString();
    const activeIds = new Set(activeProperties.map((property) => property.id));
    const currentState = useDashboardStore.getState();
    const untouchedExpenses = currentState.expenses.filter(
      (item) =>
        !(
          activeIds.has(item.propertyId) &&
          item.year === selectedYear &&
          item.month === selectedMonth
        )
    );
    const untouchedIncomes = currentState.extraIncomes.filter(
      (item) =>
        !(
          activeIds.has(item.propertyId) &&
          item.year === selectedYear &&
          item.month === selectedMonth
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
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const item of draft.incomes) {
        const label = item.label.trim();
        const amountCents = Math.max(0, eurosToCents(item.amount));
        if (!label || amountCents <= 0) continue;

        savedIncomes.push({
          id: item.id.startsWith('draft-income-')
            ? createDraftId('ext')
            : item.id,
          propertyId: property.id,
          year: selectedYear,
          month: selectedMonth,
          label,
          amountCents,
          createdAt: item.createdAt || now,
          updatedAt: now,
        });
      }

      for (const item of draft.expenses) {
        const label = item.label.trim();
        const amountCents = Math.max(0, eurosToCents(item.amount));
        if (!label || amountCents <= 0) continue;

        savedExpenses.push({
          id: item.id.startsWith('draft-expense-')
            ? createDraftId('exp')
            : item.id,
          propertyId: property.id,
          year: selectedYear,
          month: selectedMonth,
          label,
          amountCents,
          category: item.category?.trim() || 'General',
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
      `Updated monthly finance for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
    );
    addToast({ type: 'success', title: 'Monthly Finance Saved' });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-900 bg-cyan-950/15 p-4">
        <h4 className="font-display text-sm font-black uppercase">
          Monthly Finance
        </h4>
        <p className="mt-1 text-xs text-slate-400">
          Rent, additional income and operating expenses.
        </p>
        <span className="mt-2 inline-flex rounded border border-cyan-800 px-2 py-1 text-[10px] font-black uppercase text-cyan-300">
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {orderedProperties.map((property) => {
          const draft = drafts[property.id] ?? {
            rent: '0',
            incomes: [],
            expenses: [],
          };
          const balance =
            totalDraftLines(draft.incomes) -
            Math.max(0, eurosToCents(draft.rent)) -
            totalDraftLines(draft.expenses);

          return (
            <section
              key={property.id}
              className={`rounded-2xl border bg-slate-950/75 p-4 ${
                property.id === focusedPropertyId
                  ? 'border-cyan-500 ring-1 ring-cyan-500/30'
                  : 'border-slate-800'
              }`}
            >
              <div className="mb-3 flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <Home className="h-4 w-4 text-cyan-300" />
                <div className="min-w-0">
                  <h5 className="truncate text-xs font-black uppercase">
                    {property.name}
                  </h5>
                  <p className="text-[9px] uppercase text-slate-500">
                    {
                      LOCATIONS.find(
                        (location) => location.id === property.locationId
                      )?.name
                    }
                  </p>
                </div>
                <strong
                  className={`ml-auto font-mono text-sm ${
                    balance >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {formatCents(balance)}
                </strong>
              </div>

              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-violet-300">
                  Monthly Rent (€)
                </span>
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
                  className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3"
                />
              </label>

              <div className="mt-4 rounded-xl border border-emerald-900/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h6 className="text-[10px] font-black uppercase text-emerald-300">
                    Additional Income
                  </h6>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft(property.id, (current) => ({
                        ...current,
                        incomes: [
                          ...current.incomes,
                          {
                            id: createDraftId('draft-income'),
                            label: '',
                            amount: '0',
                          },
                        ],
                      }))
                    }
                    className="flex h-8 items-center gap-1 rounded border border-emerald-800 px-2 text-[9px] font-black uppercase text-emerald-300"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>

                <div className="space-y-2">
                  {draft.incomes.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[minmax(0,1fr)_100px_34px] gap-2"
                    >
                      <input
                        value={item.label}
                        placeholder="Income label"
                        onChange={(event) =>
                          updateDraft(property.id, (current) => ({
                            ...current,
                            incomes: current.incomes.map((value, itemIndex) =>
                              itemIndex === index
                                ? { ...value, label: event.target.value }
                                : value
                            ),
                          }))
                        }
                        className="h-9 min-w-0 rounded border border-slate-700 bg-slate-900 px-2 text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(event) =>
                          updateDraft(property.id, (current) => ({
                            ...current,
                            incomes: current.incomes.map((value, itemIndex) =>
                              itemIndex === index
                                ? { ...value, amount: event.target.value }
                                : value
                            ),
                          }))
                        }
                        className="h-9 min-w-0 rounded border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-emerald-300"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft(property.id, (current) => ({
                            ...current,
                            incomes: current.incomes.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                          }))
                        }
                        className="flex h-9 items-center justify-center rounded border border-rose-900 text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {draft.incomes.length === 0 && (
                    <div className="py-3 text-center text-[10px] text-slate-600">
                      No additional income
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-rose-900/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h6 className="text-[10px] font-black uppercase text-rose-300">
                    Other Expenses
                  </h6>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft(property.id, (current) => ({
                        ...current,
                        expenses: [
                          ...current.expenses,
                          {
                            id: createDraftId('draft-expense'),
                            label: '',
                            amount: '0',
                            category: 'General',
                          },
                        ],
                      }))
                    }
                    className="flex h-8 items-center gap-1 rounded border border-rose-800 px-2 text-[9px] font-black uppercase text-rose-300"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>

                <div className="space-y-2">
                  {draft.expenses.map((item, index) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-lg border border-slate-800 p-2"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_100px_34px] gap-2">
                        <input
                          value={item.label}
                          placeholder="Expense label"
                          onChange={(event) =>
                            updateDraft(property.id, (current) => ({
                              ...current,
                              expenses: current.expenses.map(
                                (value, itemIndex) =>
                                  itemIndex === index
                                    ? { ...value, label: event.target.value }
                                    : value
                              ),
                            }))
                          }
                          className="h-9 min-w-0 rounded border border-slate-700 bg-slate-900 px-2 text-xs"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(event) =>
                            updateDraft(property.id, (current) => ({
                              ...current,
                              expenses: current.expenses.map(
                                (value, itemIndex) =>
                                  itemIndex === index
                                    ? { ...value, amount: event.target.value }
                                    : value
                              ),
                            }))
                          }
                          className="h-9 min-w-0 rounded border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-rose-300"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(property.id, (current) => ({
                              ...current,
                              expenses: current.expenses.filter(
                                (_, itemIndex) => itemIndex !== index
                              ),
                            }))
                          }
                          className="flex h-9 items-center justify-center rounded border border-rose-900 text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        value={item.category || ''}
                        placeholder="Category"
                        onChange={(event) =>
                          updateDraft(property.id, (current) => ({
                            ...current,
                            expenses: current.expenses.map(
                              (value, itemIndex) =>
                                itemIndex === index
                                  ? { ...value, category: event.target.value }
                                  : value
                            ),
                          }))
                        }
                        className="h-9 w-full min-w-0 rounded border border-slate-700 bg-slate-900 px-2 text-xs"
                      />
                    </div>
                  ))}
                  {draft.expenses.length === 0 && (
                    <div className="py-3 text-center text-[10px] text-slate-600">
                      No other expenses
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <button
        type="button"
        onClick={save}
        className="sticky bottom-0 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff3e00] text-xs font-black uppercase text-white shadow-xl"
      >
        <Save className="h-4 w-4" /> Save Monthly Finance
      </button>
    </div>
  );
}
