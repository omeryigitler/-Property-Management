import { Expense } from '../types';

export function isRentExpense(expense: Expense): boolean {
  const category = expense.category.trim().toLocaleLowerCase('en');
  const label = expense.label.trim().toLocaleLowerCase('en');
  return category === 'rent' || label === 'rent';
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + expense.amountCents, 0);
}
