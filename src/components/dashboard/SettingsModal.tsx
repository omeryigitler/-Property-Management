import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Database,
  Home,
  Plus,
  SlidersHorizontal,
  WalletCards,
  X,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { CustomSelect } from '../common/CustomSelect';
import { MonthlyFinanceSettings } from './settings/MonthlyFinanceSettings';

type SettingsSection = 'overview' | 'properties' | 'finance' | 'data';

const sections: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <SlidersHorizontal className="h-4 w-4" /> },
  { id: 'properties', label: 'Properties', icon: <Building2 className="h-4 w-4" /> },
  { id: 'finance', label: 'Monthly Finance', icon: <WalletCards className="h-4 w-4" /> },
  { id: 'data', label: 'Data', icon: <Database className="h-4 w-4" /> },
];

export function SettingsModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const openConfirmation = useDashboardStore((state) => state.openConfirmation);
  const clearAllData = useDashboardStore((state) => state.clearAllData);
  const locations = usePropertyStore((state) => state.locations);
  const properties = usePropertyStore((state) => state.properties);
  const addLocation = usePropertyStore((state) => state.addLocation);
  const addProperty = usePropertyStore((state) => state.addProperty);
  const updateProperty = usePropertyStore((state) => state.updateProperty);
  const [section, setSection] = useState<SettingsSection>('overview');
  const [newLocationName, setNewLocationName] = useState('');
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyLocation, setNewPropertyLocation] = useState(locations[0]?.id ?? '');

  useEffect(() => {
    if (activeModal !== 'settings') return;
    const requested = modalParams.section as SettingsSection | undefined;
    setSection(sections.some((item) => item.id === requested) ? requested! : 'overview');
  }, [activeModal, modalParams]);

  const activeProperties = useMemo(() => getActiveProperties(properties), [properties]);
  if (activeModal !== 'settings') return null;

  const locationOptions = locations.map((location) => ({
    value: location.id,
    label: location.name,
  }));
  const addNewLocation = () => {
    const location = addLocation(newLocationName);
    if (location) {
      setNewLocationName('');
      setNewPropertyLocation(location.id);
    }
  };
  const addNewProperty = () => {
    const property = addProperty(newPropertyName, newPropertyLocation);
    if (property) setNewPropertyName('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#352b29]/40 p-0 backdrop-blur-sm sm:p-4">
      <div className="relative flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white text-[#222222] shadow-[0_28px_90px_rgba(45,32,28,0.22)] sm:h-[92dvh] sm:rounded-3xl sm:border sm:border-[#e7e2df]">
        <header className="flex items-center justify-between border-b border-[#eee8e5] bg-[#fffaf9] px-4 py-4 sm:px-6">
          <div>
            <h3 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#222222]">
              Settings & Management
            </h3>
            <p className="mt-0.5 text-xs font-medium text-[#717171]">
              Properties, monthly finance and data management
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl p-2 text-[#717171] transition-colors hover:bg-[#f4efed] hover:text-[#222222]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-[#eee8e5] bg-[#fffdfc] p-2 no-scrollbar sm:w-60 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex h-11 flex-shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-left text-xs font-bold transition-colors ${
                  section === item.id
                    ? 'bg-[#fff0ef] text-[#c83f45]'
                    : 'text-[#717171] hover:bg-[#f8f5f3] hover:text-[#222222]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbfaf9] p-4 no-scrollbar sm:p-6">
            {section === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[#222222]">
                    System overview
                  </h4>
                  <p className="mt-1 text-sm text-[#717171]">
                    A clear summary of the active property setup.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ['Locations', locations.length, 'text-[#222222]'],
                    ['Active Properties', activeProperties.length, 'text-[#222222]'],
                    ['Data Model', 'Simplified', 'text-[#237a59]'],
                    ['Financial Model', 'Income − Expenses', 'text-[#c83f45]'],
                  ].map(([label, value, valueClass]) => (
                    <div
                      key={String(label)}
                      className="rounded-2xl border border-[#eee8e5] bg-white p-4 shadow-[0_8px_26px_rgba(55,42,36,0.05)]"
                    >
                      <span className="text-xs font-semibold text-[#8a817d]">{label}</span>
                      <strong className={`mt-2 block text-lg font-extrabold ${valueClass}`}>
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'properties' && (
              <div className="space-y-5">
                <div>
                  <h4 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[#222222]">
                    Locations & Properties
                  </h4>
                  <p className="mt-1 text-sm text-[#717171]">
                    Add locations and manage the property catalog.
                  </p>
                </div>

                <div className="grid gap-4 rounded-2xl border border-[#eee8e5] bg-white p-4 shadow-[0_8px_26px_rgba(55,42,36,0.05)] lg:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-[#4d4744]">New Location</span>
                    <div className="flex gap-2">
                      <input
                        value={newLocationName}
                        onChange={(event) => setNewLocationName(event.target.value)}
                        placeholder="Location name"
                        className="h-11 min-w-0 flex-1 rounded-xl border border-[#ded8d4] bg-white px-3.5 text-sm text-[#222222] outline-none transition-all placeholder:text-[#aaa3a0] focus:border-[#ff5a5f] focus:ring-4 focus:ring-[#ff5a5f]/10"
                      />
                      <button
                        type="button"
                        onClick={addNewLocation}
                        className="flex h-11 items-center gap-1 rounded-xl border border-[#ffd1ce] bg-[#fff0ef] px-3.5 text-xs font-bold text-[#c83f45] transition-colors hover:bg-[#ffe8e6]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-[#4d4744]">New Property</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                      <input
                        value={newPropertyName}
                        onChange={(event) => setNewPropertyName(event.target.value)}
                        placeholder="Property name"
                        className="h-11 min-w-0 rounded-xl border border-[#ded8d4] bg-white px-3.5 text-sm text-[#222222] outline-none transition-all placeholder:text-[#aaa3a0] focus:border-[#ff5a5f] focus:ring-4 focus:ring-[#ff5a5f]/10"
                      />
                      <CustomSelect
                        value={newPropertyLocation}
                        options={locationOptions}
                        onChange={setNewPropertyLocation}
                      />
                      <button
                        type="button"
                        onClick={addNewProperty}
                        className="flex h-11 items-center justify-center gap-1 rounded-xl bg-[#ff5a5f] px-3.5 text-xs font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.20)] transition-colors hover:bg-[#e94f54]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {properties.map((property) => (
                    <div
                      key={property.id}
                      className="grid grid-cols-1 gap-3 rounded-2xl border border-[#eee8e5] bg-white p-4 shadow-[0_6px_20px_rgba(55,42,36,0.04)] sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-center"
                    >
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-[#8a817d]">Property</span>
                        <input
                          value={property.name}
                          onChange={(event) =>
                            updateProperty(property.id, {
                              name: event.target.value,
                              locationId: property.locationId,
                              active: property.active,
                            })
                          }
                          className="h-11 w-full rounded-xl border border-[#ded8d4] bg-white px-3.5 text-sm font-semibold text-[#222222] outline-none transition-all focus:border-[#ff5a5f] focus:ring-4 focus:ring-[#ff5a5f]/10"
                        />
                      </label>
                      <CustomSelect
                        label="Location"
                        value={property.locationId}
                        options={locationOptions}
                        onChange={(value) =>
                          updateProperty(property.id, {
                            name: property.name,
                            locationId: String(value),
                            active: property.active,
                          })
                        }
                      />
                      <label className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#ded8d4] bg-[#fffdfc] px-3 text-xs font-bold text-[#4f4f4f]">
                        <input
                          type="checkbox"
                          checked={property.active}
                          onChange={(event) =>
                            updateProperty(property.id, {
                              name: property.name,
                              locationId: property.locationId,
                              active: event.target.checked,
                            })
                          }
                        />
                        Active
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'finance' && <MonthlyFinanceSettings />}

            {section === 'data' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[#222222]">
                    Data
                  </h4>
                  <p className="mt-1 text-sm text-[#717171]">
                    Back up, restore or review saved activity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openModal('export_import', {
                      returnToSettings: true,
                      returnSection: 'data',
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-2xl border border-[#ffd1ce] bg-[#fff8f7] p-4 text-left transition-colors hover:bg-[#fff0ef]"
                >
                  <Database className="h-5 w-5 text-[#d9474d]" />
                  <span>
                    <strong className="block text-sm font-bold text-[#222222]">Import & Export</strong>
                    <small className="text-[#717171]">CSV reports and JSON backups</small>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openModal('history', {
                      returnToSettings: true,
                      returnSection: 'data',
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-2xl border border-[#eee8e5] bg-white p-4 text-left transition-colors hover:bg-[#fffdfc]"
                >
                  <Home className="h-5 w-5 text-[#717171]" />
                  <span>
                    <strong className="block text-sm font-bold text-[#222222]">Activity History</strong>
                    <small className="text-[#717171]">Review saved changes</small>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openConfirmation({
                      title: 'Reset All Data?',
                      message:
                        'This replaces bookings, finance and the property catalog with demo data.',
                      confirmText: 'Reset Data',
                      variant: 'danger',
                      onConfirm: () => void clearAllData(),
                    })
                  }
                  className="w-full rounded-2xl border border-[#f1c9c6] bg-[#fff5f4] p-4 text-left text-sm font-bold text-[#b13a40] transition-colors hover:bg-[#ffebe9]"
                >
                  Reset All Data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
