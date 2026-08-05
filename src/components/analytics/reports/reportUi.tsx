import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatCents } from '../../../utils/currency';
import { PropertyAnnualPerformance } from '../../../services/reportingService';

export interface AnnualPropertyRow extends PropertyAnnualPerformance {
  extraIncomeCents: number;
  totalIncomeCents: number;
}

export function compactCurrency(cents: number): string {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format((cents || 0) / 100);
}

export function shortDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-MT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function signedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function comparisonNote(
  current: number,
  previous: number,
  previousYear: number
): string {
  if (previous === 0) return `No ${previousYear} data`;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${previousYear}: ${formatCents(previous)} · ${signedPercent(pct)}`;
}

export function ChangeValue({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-[#8a827d]">No previous data</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold ${
        positive ? 'text-[#1f7a58]' : 'text-[#b13a40]'
      }`}
    >
      {positive ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" />
      )}
      {signedPercent(value)}
    </span>
  );
}

interface MetricTone {
  surface: string;
  border: string;
  accent: string;
}

export function MetricCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  tone: MetricTone;
}) {
  return (
    <article
      className="min-w-0 rounded-2xl border p-4 shadow-[0_8px_24px_rgba(52,42,37,0.07)]"
      style={{ backgroundColor: tone.surface, borderColor: tone.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#625b57]">
            {label}
          </p>
          <p className="mt-1 break-words text-xl font-extrabold tabular-nums tracking-[-0.02em] text-[#211e1d]">
            {value}
          </p>
        </div>
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm"
          style={{ borderColor: tone.border, color: tone.accent }}
        >
          {icon}
        </div>
      </div>
      <p className="mt-2 text-[11px] font-medium leading-4 text-[#756e69]">
        {note}
      </p>
    </article>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#e7e1dd] bg-white p-4 shadow-[0_10px_28px_rgba(52,42,37,0.06)]">
      <div className="mb-4 flex flex-col gap-3 border-b border-[#eee8e5] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold tracking-[-0.01em] text-[#262220]">
            {title}
          </h3>
          <p className="mt-1 text-[11px] font-medium text-[#756e69]">
            {subtitle}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #ded7d3',
  borderRadius: 12,
  boxShadow: '0 10px 28px rgba(52, 42, 37, 0.12)',
  color: '#272321',
};
