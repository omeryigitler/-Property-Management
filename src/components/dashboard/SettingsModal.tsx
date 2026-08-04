import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Database, Eye, Home, Plus, SlidersHorizontal, WalletCards, X } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { CustomSelect } from '../common/CustomSelect';
import { MonthlyFinanceSettings } from './settings/MonthlyFinanceSettings';

type SettingsSection = 'overview' | 'properties' | 'finance' | 'display' | 'data';

const sections: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <SlidersHorizontal className="h-4 w-4" /> },
  { id: 'properties', label: 'Properties', icon: <Building2 className="h-4 w-4" /> },
  { id: 'finance', label: 'Monthly Finance', icon: <WalletCards className="h-4 w-4" /> },
  { id: 'display', label: 'Display', icon: <Eye className="h-4 w-4" /> },
  { id: 'data', label: 'Data', icon: <Database className="h-4 w-4" /> },
];

export function SettingsModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const openConfirmation = useDashboardStore((state) => state.openConfirmation);
  const clearAllData = useDashboardStore((state) => state.clearAllData);
  const preferences = useDashboardStore((state) => state.userPreferences);
  const updatePreferences = useDashboardStore((state) => state.updateUserPreferences);
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
  const togglePreference = (key: 'stickyDailyTotal' | 'showProvisionalBlock' | 'compactGridRows' | 'privacyMode', value: boolean) => {
    updatePreferences({ [key]: value });
  };
  if (activeModal !== 'settings') return null;

  const locationOptions = locations.map((location) => ({ value: location.id, label: location.name }));
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:p-4">
      <div className="relative flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl sm:h-[92dvh] sm:rounded-2xl sm:border sm:border-slate-700">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-4 sm:px-6">
          <div><h3 className="font-display text-lg font-black uppercase">Settings & Management</h3><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Properties, finance, display and data</p></div>
          <button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950 p-2 no-scrollbar sm:w-56 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
            {sections.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`flex h-10 flex-shrink-0 items-center gap-2 rounded-lg px-3 text-left text-[10px] font-black uppercase tracking-wider ${section === item.id ? 'bg-[#ff3e00] text-white' : 'text-slate-400 hover:bg-slate-900'}`}>{item.icon}{item.label}</button>)}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 no-scrollbar sm:p-6">
            {section === 'overview' && (
              <div className="space-y-4"><h4 className="font-display text-base font-black uppercase">System Overview</h4><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><span className="text-[10px] font-black uppercase text-slate-500">Locations</span><strong className="mt-1 block font-mono text-2xl">{locations.length}</strong></div><div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><span className="text-[10px] font-black uppercase text-slate-500">Active Properties</span><strong className="mt-1 block font-mono text-2xl">{activeProperties.length}</strong></div><div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><span className="text-[10px] font-black uppercase text-slate-500">Data Model</span><strong className="mt-1 block text-sm text-emerald-300">Simplified</strong></div><div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><span className="text-[10px] font-black uppercase text-slate-500">Financial Model</span><strong className="mt-1 block text-sm text-cyan-300">Income − Expenses</strong></div></div></div>
            )}

            {section === 'properties' && (
              <div className="space-y-5">
                <div><h4 className="font-display text-base font-black uppercase">Locations & Properties</h4><p className="mt-1 text-xs text-slate-400">Add locations and manage the property catalog.</p></div>
                <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 lg:grid-cols-2"><div className="space-y-2"><span className="text-[10px] font-black uppercase text-slate-400">New Location</span><div className="flex gap-2"><input value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} placeholder="Location name" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs" /><button type="button" onClick={addNewLocation} className="flex h-10 items-center gap-1 rounded-lg bg-cyan-600 px-3 text-xs font-black uppercase"><Plus className="h-3.5 w-3.5" /> Add</button></div></div><div className="space-y-2"><span className="text-[10px] font-black uppercase text-slate-400">New Property</span><div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]"><input value={newPropertyName} onChange={(event) => setNewPropertyName(event.target.value)} placeholder="Property name" className="h-10 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs" /><CustomSelect value={newPropertyLocation} options={locationOptions} onChange={setNewPropertyLocation} /><button type="button" onClick={addNewProperty} className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#ff3e00] px-3 text-xs font-black uppercase"><Plus className="h-3.5 w-3.5" /> Add</button></div></div></div>
                <div className="space-y-3">{properties.map((property) => <div key={property.id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-center"><label className="space-y-1"><span className="text-[9px] font-black uppercase text-slate-500">Property</span><input value={property.name} onChange={(event) => updateProperty(property.id, { name: event.target.value, locationId: property.locationId, active: property.active })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-bold" /></label><CustomSelect label="Location" value={property.locationId} options={locationOptions} onChange={(value) => updateProperty(property.id, { name: property.name, locationId: String(value), active: property.active })} /><label className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 text-[10px] font-black uppercase text-slate-300"><input type="checkbox" checked={property.active} onChange={(event) => updateProperty(property.id, { name: property.name, locationId: property.locationId, active: event.target.checked })} /> Active</label></div>)}</div>
              </div>
            )}

            {section === 'finance' && <MonthlyFinanceSettings />}

            {section === 'display' && (
              <div className="space-y-4"><h4 className="font-display text-base font-black uppercase">Display</h4>{[
                ['stickyDailyTotal', 'Sticky daily total column'],
                ['showProvisionalBlock', 'Show provisional pattern'],
                ['compactGridRows', 'Compact calendar rows'],
                ['privacyMode', 'Privacy mode'],
              ].map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-semibold"><span>{label}</span><input type="checkbox" checked={Boolean(preferences[key as 'stickyDailyTotal' | 'showProvisionalBlock' | 'compactGridRows' | 'privacyMode'])} onChange={(event) => togglePreference(key as 'stickyDailyTotal' | 'showProvisionalBlock' | 'compactGridRows' | 'privacyMode', event.target.checked)} /></label>)}</div>
            )}

            {section === 'data' && (
              <div className="space-y-4"><h4 className="font-display text-base font-black uppercase">Data</h4><button type="button" onClick={() => openModal('export_import', { returnToSettings: true, returnSection: 'data' })} className="flex w-full items-center gap-3 rounded-xl border border-cyan-900 bg-cyan-950/20 p-4 text-left"><Database className="h-5 w-5 text-cyan-300" /><span><strong className="block text-xs uppercase">Import & Export</strong><small className="text-slate-500">CSV reports and JSON backups</small></span></button><button type="button" onClick={() => openModal('history', { returnToSettings: true, returnSection: 'data' })} className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-left"><Home className="h-5 w-5 text-slate-300" /><span><strong className="block text-xs uppercase">Activity History</strong><small className="text-slate-500">Review saved changes</small></span></button><button type="button" onClick={() => openConfirmation({ title: 'Reset All Data?', message: 'This replaces bookings, finance and the property catalog with demo data.', confirmText: 'Reset Data', variant: 'danger', onConfirm: () => void clearAllData() })} className="w-full rounded-xl border border-rose-900 bg-rose-950/20 p-4 text-left text-xs font-black uppercase text-rose-300">Reset All Data</button></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
