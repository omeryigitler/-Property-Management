import React, { useState } from 'react';
import { Trash2, Check, Edit2 } from 'lucide-react';
import { eurosToCents, centsToEuros, formatCents } from '../../utils/currency';

interface FinanceLineItemProps {
  key?: string;
  id: string;
  label: string;
  amountCents: number;
  isDeductible?: boolean;
  taxTreatment?: string;
  onUpdate: (id: string, label: string, amountCents: number, isDeductible?: boolean) => void;
  onDelete: (id: string) => void;
  type: 'expense' | 'extra_income';
}

export function FinanceLineItem({
  id,
  label,
  amountCents,
  isDeductible = true,
  onUpdate,
  onDelete,
  type,
}: FinanceLineItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editAmount, setEditAmount] = useState(centsToEuros(amountCents).toString());
  const [editDeductible, setEditDeductible] = useState(isDeductible);

  const handleSave = () => {
    const parsedCents = eurosToCents(editAmount);
    if (!editLabel.trim()) return;
    onUpdate(id, editLabel.trim(), parsedCents, editDeductible);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 space-y-2 text-xs animate-fade-in">
        <input
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-medium"
          placeholder="Item name..."
        />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-mono">€</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono"
          />
        </div>
        {type === 'expense' && (
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={editDeductible}
              onChange={(e) => setEditDeductible(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500"
            />
            <span>Tax Deductible</span>
          </label>
        )}
        <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onDelete(id)}
            className="p-1 rounded text-rose-400 hover:bg-rose-950/80 transition-colors"
            title="Delete Item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="p-1 px-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
          >
            <Check className="w-3 h-3" />
            <span>Save</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between gap-1 py-1 px-1.5 rounded hover:bg-slate-800/60 transition-colors text-xs">
      <div className="flex items-center gap-1 truncate">
        <span className="truncate font-medium text-slate-200">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 font-mono">
        <span className={type === 'expense' ? 'text-rose-300 font-semibold' : 'text-emerald-300 font-semibold'}>
          {formatCents(amountCents)}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-100 rounded transition-opacity"
          title="Edit Item"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
