import React, { Suspense, lazy } from 'react';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { TaxConfigurationGate } from './dashboard/TaxConfigurationGate';
import { PropertyCalendarGrid } from './calendar/PropertyCalendarGrid';
import { FinancialGrid } from './finance/FinancialGrid';
import { useDashboardStore } from '../store/useDashboardStore';
import { usePropertyStore } from '../store/usePropertyStore';

import { BookingModal } from './booking/BookingModal';
import { TaxConfigurationModal } from './dashboard/TaxConfigurationModal';
import { SettingsModal } from './dashboard/SettingsModal';
import { ActivityHistoryModal } from './dashboard/ActivityHistoryModal';
import { ExportImportModal } from './dashboard/ExportImportModal';
import { CalculationDetailsModal } from './finance/CalculationDetailsModal';
import { PropertyFinanceMobileSheet } from './finance/PropertyFinanceMobileSheet';

import { ConfirmationModal } from './common/ConfirmationModal';
import { ToastContainer } from './common/ToastContainer';
import { NativeSelectEnhancer } from './common/NativeSelectEnhancer';

const ReportsDashboard = lazy(() =>
  import('./analytics/ReportsDashboard').then((module) => ({
    default: module.ReportsDashboard,
  }))
);

function ReportsLoadingState() {
  return (
    <div className="flex min-h-64 flex-1 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-center">
      <div>
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
        <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">
          Loading reports
        </p>
      </div>
    </div>
  );
}

export function AppShell() {
  const mainViewMode = useDashboardStore((state) => state.mainViewMode);
  const propertyCatalogKey = usePropertyStore((state) =>
    state.properties
      .map((property) => `${property.id}:${property.name}:${property.locationId}:${property.active}`)
      .join('|')
  );
  const isReportsView = mainViewMode === 'analytics';

  return (
    <div className="flex h-[100dvh] w-full select-none flex-col overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased">
      <NativeSelectEnhancer />
      <DashboardHeader />

      <main className="flex min-h-0 w-full flex-1 flex-col space-y-3 overflow-hidden p-3 sm:p-4">
        <TaxConfigurationGate />

        {isReportsView ? (
          <Suspense fallback={<ReportsLoadingState />}>
            <ReportsDashboard key={propertyCatalogKey} />
          </Suspense>
        ) : (
          <PropertyCalendarGrid>
            <FinancialGrid />
          </PropertyCalendarGrid>
        )}
      </main>

      <BookingModal />
      <TaxConfigurationModal />
      <SettingsModal />
      <ActivityHistoryModal />
      <ExportImportModal />
      <CalculationDetailsModal />
      <PropertyFinanceMobileSheet />

      <ConfirmationModal />
      <ToastContainer />
    </div>
  );
}
