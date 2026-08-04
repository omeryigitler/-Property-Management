import React from 'react';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { TaxConfigurationGate } from './dashboard/TaxConfigurationGate';
import { PropertyCalendarGrid } from './calendar/PropertyCalendarGrid';
import { FinancialGrid } from './finance/FinancialGrid';
import { ReportsDashboard } from './analytics/ReportsDashboard';
import { useDashboardStore } from '../store/useDashboardStore';

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
  const isReportsView = mainViewMode === 'analytics';

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none antialiased">
      <NativeSelectEnhancer />

      {/* Top Header Controls & Month Navigator */}
      <DashboardHeader />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden p-3 sm:p-4 space-y-3">
        {/* Tax Warning Gate Banner */}
        <TaxConfigurationGate />

        {isReportsView ? (
          <ReportsDashboard />
        ) : (
          <PropertyCalendarGrid>
            <FinancialGrid />
          </PropertyCalendarGrid>
        )}
      </main>

      {/* Global Application Modals & Sheets */}
      <BookingModal />
      <TaxConfigurationModal />
      <SettingsModal />
      <ActivityHistoryModal />
      <ExportImportModal />
      <CalculationDetailsModal />
      <PropertyFinanceMobileSheet />

      {/* Global Feedback Overlays */}
      <ConfirmationModal />
      <ToastContainer />
    </div>
  );
}
