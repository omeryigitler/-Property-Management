import React, { Suspense, lazy } from 'react';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { PropertyCalendarGrid } from './calendar/PropertyCalendarGrid';
import { FinancialGrid } from './finance/FinancialGrid';
import { useDashboardStore } from '../store/useDashboardStore';
import { usePropertyStore } from '../store/usePropertyStore';
import { BookingModal } from './booking/BookingModal';
import { SettingsModal } from './dashboard/SettingsModal';
import { ActivityHistoryModal } from './dashboard/ActivityHistoryModal';
import { ExportImportModal } from './dashboard/ExportImportModal';
import { PropertyFinanceMobileSheet } from './finance/PropertyFinanceMobileSheet';
import { ConfirmationModal } from './common/ConfirmationModal';
import { ToastContainer } from './common/ToastContainer';
import { NativeSelectEnhancer } from './common/NativeSelectEnhancer';

const ReportsDashboard = lazy(() =>
  import('./analytics/ReportsDashboard').then((module) => ({ default: module.ReportsDashboard }))
);

export function AppShell() {
  const mainViewMode = useDashboardStore((state) => state.mainViewMode);
  const propertyCatalogKey = usePropertyStore((state) =>
    state.properties.map((property) => `${property.id}:${property.name}:${property.active}`).join('|')
  );

  return (
    <div
      data-theme="airbnb"
      className="flex h-[100dvh] w-full select-none flex-col overflow-hidden bg-[#f7f7f5] font-sans text-[#222222] antialiased"
    >
      <NativeSelectEnhancer />
      <DashboardHeader />
      <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden p-3 sm:p-4">
        {mainViewMode === 'analytics' ? (
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center text-sm text-[#717171]">
                Loading reports…
              </div>
            }
          >
            <ReportsDashboard key={propertyCatalogKey} />
          </Suspense>
        ) : (
          <PropertyCalendarGrid>
            <FinancialGrid />
          </PropertyCalendarGrid>
        )}
      </main>
      <BookingModal />
      <SettingsModal />
      <ActivityHistoryModal />
      <ExportImportModal />
      <PropertyFinanceMobileSheet />
      <ConfirmationModal />
      <ToastContainer />
    </div>
  );
}
