import React from 'react';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { TaxConfigurationGate } from './dashboard/TaxConfigurationGate';
import { PropertyCalendarGrid } from './calendar/PropertyCalendarGrid';
import { FinancialGrid } from './finance/FinancialGrid';
import { ReportsDashboard } from './analytics/ReportsDashboard';
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

export function AppShell() {
  const mainViewMode = useDashboardStore((state) => state.mainViewMode);
  usePropertyStore((state) => state.properties);
  const isReportsView = mainViewMode === 'analytics';

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none antialiased">
      <NativeSelectEnhancer />
      <DashboardHeader />

      <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden p-3 sm:p-4 space-y-3">
        <TaxConfigurationGate />

        {isReportsView ? (
          <ReportsDashboard />
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
