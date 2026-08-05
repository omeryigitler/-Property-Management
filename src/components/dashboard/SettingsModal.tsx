import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Database,
  Home,
  Plus,
  SlidersHorizontal,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import {
  getActiveProperties,
  usePropertyStore,
} from '../../store/usePropertyStore';
import { PropertyConfig } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { MonthlyFinanceSettings } from './settings/MonthlyFinanceSettings';

type SettingsSection = 'overview' | 'properties' | 'finance' | 'data';

const sections: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <SlidersHorizontal className="h-4 w-4" />,
  },
  {
    id: 'properties',
    label: 'Properties',
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    id: 'finance',
    label: 'Monthly Finance',
    icon: <WalletCards className="h-4 w-4" />,
  },
  {
    id: 'data',
    label: 'Data',
    icon: <Database className="h-4 w-4" />,
  },
];

export function SettingsModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const openConfirmation = useDashboardStore(
    (state) => state.openConfirmation
  );
  const clearAllData = useDashboardStore((state) => state.clearAllData);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const addToast = useDashboardStore((state) => state.addToast);

  const locations = usePropertyStore((state) => state.locations);
  const properties = usePropertyStore((state) => state.properties);
  const addLocation = usePropertyStore((state) => state.addLocation);
  const addProperty = usePropertyStore((state) => state.addProperty);
  const updateProperty = usePropertyStore((state) => state.updateProperty);

  const [section, setSection] = useState<SettingsSection>('overview');
  const [newLocationName, setNewLocationName] = useState('');
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyLocation, setNewPropertyLocation] = useState(
    locations[0]?.id ?? ''
  );

  useEffect(() => {
    if (activeModal !== 'settings') return;
    const requested = modalParams.section as SettingsSection | undefined;
    setSection(
      sections.some((item) => item.id === requested)
        ? requested!
        : 'overview'
    );
  }, [activeModal, modalParams]);

  useEffect(() => {
    if (!locations.some((location) => location.id === newPropertyLocation)) {
      setNewPropertyLocation(locations[0]?.id ?? '');
    }
  }, [locations, newPropertyLocation]);

  const activeProperties = useMemo(
    () => getActiveProperties(properties),
    [properties]
  );

  if (activeModal !== 'settings') return null;

  const locationOptions = locations.map((location) => ({
    value: location.id,
    label: location.name,
  }));

  const addNewLocation = () => {
    const cleanName = newLocationName.trim();
    if (!cleanName) {
      addToast({
        type: 'warning',
        title: 'Location name required',
        message: 'Enter a location name before adding it.',
      });
      return;
    }

    if (
      locations.some(
        (location) =>
          location.name.trim().toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      addToast({
        type: 'warning',
        title: 'Location already exists',
        message: `${cleanName} is already in the location list.`,
      });
      return;
    }

    const location = addLocation(cleanName);
    if (!location) {
      addToast({
        type: 'error',
        title: 'Location not added',
        message: 'The location could not be saved.',
      });
      return;
    }

    setNewLocationName('');
    setNewPropertyLocation(location.id);
    addToast({
      type: 'success',
      title: 'Location added',
      message: `${location.name} is ready for new properties.`,
    });
  };

  const addNewProperty = () => {
    const cleanName = newPropertyName.trim();
    if (!cleanName) {
      addToast({
        type: 'warning',
        title: 'Property name required',
        message: 'Enter a property name before adding it.',
      });
      return;
    }
    if (!newPropertyLocation) {
      addToast({
        type: 'warning',
        title: 'Location required',
        message: 'Select a location for the new property.',
      });
      return;
    }

    if (
      properties.some(
        (property) =>
          property.locationId === newPropertyLocation &&
          property.name.trim().toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      addToast({
        type: 'warning',
        title: 'Property already exists',
        message: `${cleanName} already exists in the selected location.`,
      });
      return;
    }

    const property = addProperty(cleanName, newPropertyLocation);
    if (!property) {
      addToast({
        type: 'error',
        title: 'Property not added',
        message: 'The property could not be saved.',
      });
      return;
    }

    setNewPropertyName('');
    addToast({
      type: 'success',
      title: 'Property added',
      message: `${property.name} was added to the calendar.`,
    });
  };

  const togglePropertyActive = (property: PropertyConfig) => {
    if (property.active && activeProperties.length <= 1) {
      addToast({
        type: 'warning',
        title: 'One active property required',
        message: 'Activate another property before disabling this one.',
      });
      return;
    }

    const nextActive = !property.active;
    updateProperty(property.id, {
      name: property.name,
      locationId: property.locationId,
      active: nextActive,
    });
    addToast({
      type: 'success',
      title: nextActive ? 'Property activated' : 'Property hidden',
      message: nextActive
        ? `${property.name} is visible in the calendar.`
        : `${property.name} is hidden from the calendar and reports.`,
    });
  };

  const requestPropertyDeletion = (property: PropertyConfig) => {
    if (properties.length <= 1) {
      addToast({
        type: 'warning',
        title: 'One property must remain',
        message: 'Add another property before deleting the final property.',
      });
      return;
    }

    const linkedBookings = bookings.filter(
      (booking) => booking.propertyId === property.id
    ).length;
    const linkedExpenses = expenses.filter(
      (expense) => expense.propertyId === property.id
    ).length;
    const linkedIncomes = extraIncomes.filter(
      (income) => income.propertyId === property.id
    ).length;
    const linkedRecords = linkedBookings + linkedExpenses + linkedIncomes;

    const linkedSummary = [
      linkedBookings > 0
        ? `${linkedBookings} reservation${linkedBookings === 1 ? '' : 's'}`
        : null,
      linkedExpenses > 0
        ? `${linkedExpenses} expense${linkedExpenses === 1 ? '' : 's'}`
        : null,
      linkedIncomes > 0
        ? `${linkedIncomes} additional income record${
            linkedIncomes === 1 ? '' : 's'
          }`
        : null,
    ]
      .filter(Boolean)
      .join(', ');

    openConfirmation({
      title: `Delete ${property.name}?`,
      message:
        linkedRecords > 0
          ? `This permanently removes the property and its linked data: ${linkedSummary}. This action cannot be undone.`
          : 'This permanently removes the property from the catalog and calendar. This action cannot be undone.',
      confirmText: 'Delete Property',
      variant: 'danger',
      onConfirm: () => {
        const dashboard = useDashboardStore.getState();
        useDashboardStore.setState({
          bookings: dashboard.bookings.filter(
            (booking) => booking.propertyId !== property.id
          ),
          expenses: dashboard.expenses.filter(
            (expense) => expense.propertyId !== property.id
          ),
          extraIncomes: dashboard.extraIncomes.filter(
            (income) => income.propertyId !== property.id
          ),
        });

        const catalog = usePropertyStore.getState();
        usePropertyStore.getState().replaceCatalog(
          catalog.locations,
          catalog.properties.filter((item) => item.id !== property.id)
        );

        const nextDashboard = useDashboardStore.getState();
        nextDashboard.addActivity(
          'property_saved',
          property.name,
          linkedRecords > 0
            ? `Deleted property ${property.name} with ${linkedRecords} linked record(s)`
            : `Deleted property ${property.name}`
        );
        nextDashboard.addToast({
          type: 'success',
          title: 'Property deleted',
          message: `${property.name} and its linked data were removed.`,
        });
      },
    });
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
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-[#eee8e5] bg-[#fffdfc] p-2 no-scrollbar sm:w-52 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
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

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbfaf9] p-3 no-scrollbar sm:p-5">
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
                    [
                      'Active Properties',
                      activeProperties.length,
                      'text-[#222222]',
                    ],
                    ['Data Model', 'Simplified', 'text-[#237a59]'],
                    [
                      'Financial Model',
                      'Income − Expenses',
                      'text-[#c83f45]',
                    ],
                  ].map(([label, value, valueClass]) => (
                    <div
                      key={String(label)}
                      className="rounded-2xl border border-[#eee8e5] bg-white p-4 shadow-[0_8px_26px_rgba(55,42,36,0.05)]"
                    >
                      <span className="text-xs font-semibold text-[#8a817d]">
                        {label}
                      </span>
                      <strong
                        className={`mt-2 block text-lg font-extrabold ${valueClass}`}
                      >
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'properties' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[#222222]">
                    Locations & Properties
                  </h4>
                  <p className="mt-1 text-sm text-[#717171]">
                    Add locations and manage the property catalog.
                  </p>
                </div>

                <div className="grid gap-3 rounded-2xl border border-[#eee8e5] bg-white p-3 shadow-[0_8px_26px_rgba(55,42,36,0.05)] xl:grid-cols-2">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_132px] sm:items-end">
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-[#6f6763]">
                        New Location
                      </span>
                      <input
                        value={newLocationName}
                        onChange={(event) =>
                          setNewLocationName(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addNewLocation();
                          }
                        }}
                        placeholder="Location name"
                        className="h-11 w-full rounded-xl border border-[#ded8d4] bg-white px-3.5 text-sm text-[#222222] outline-none transition-all placeholder:text-[#aaa3a0] focus:border-[#ff5a5f] focus:ring-4 focus:ring-[#ff5a5f]/10"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={addNewLocation}
                      className="flex h-11 w-full items-center justify-center gap-1 rounded-xl border border-[#ffd1ce] bg-[#fff0ef] px-3 text-xs font-bold text-[#c83f45] transition-colors hover:bg-[#ffe8e6]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Location
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_132px] sm:items-end">
                    <label className="space-y-1.5">
                      <span className="text-xs font-semibold text-[#6f6763]">
                        New Property
                      </span>
                      <input
                        value={newPropertyName}
                        onChange={(event) =>
                          setNewPropertyName(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addNewProperty();
                          }
                        }}
                        placeholder="Property name"
                        className="h-11 w-full rounded-xl border border-[#ded8d4] bg-white px-3.5 text-sm text-[#222222] outline-none transition-all placeholder:text-[#aaa3a0] focus:border-[#ff5a5f] focus:ring-4 focus:ring-[#ff5a5f]/10"
                      />
                    </label>
                    <CustomSelect
                      label="Location"
                      value={newPropertyLocation}
                      options={locationOptions}
                      onChange={setNewPropertyLocation}
                    />
                    <button
                      type="button"
                      onClick={addNewProperty}
                      className="flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-[#ff5a5f] px-3 text-xs font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.20)] transition-colors hover:bg-[#e94f54]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Property
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#e8e1dd] bg-white shadow-[0_8px_24px_rgba(55,42,36,0.04)]">
                  <div className="hidden grid-cols-[minmax(0,1.35fr)_minmax(180px,0.8fr)_104px_104px] gap-2 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#817873] md:grid">
                    <span>Property</span>
                    <span>Location</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>

                  {properties.map((property, index) => (
                    <div
                      key={property.id}
                      className={`grid grid-cols-1 gap-2 p-3 md:grid-cols-[minmax(0,1.35fr)_minmax(180px,0.8fr)_104px_104px] md:items-center ${
                        index < properties.length - 1
                          ? 'border-b border-[#eee8e5]'
                          : ''
                      } ${property.active ? 'bg-white' : 'bg-[#faf8f7]'}`}
                    >
                      <label className="space-y-1 md:space-y-0">
                        <span className="text-[11px] font-bold text-[#817873] md:hidden">
                          Property
                        </span>
                        <input
                          value={property.name}
                          onChange={(event) =>
                            updateProperty(property.id, {
                              name: event.target.value,
                              locationId: property.locationId,
                              active: property.active,
                            })
                          }
                          className="h-10 w-full rounded-xl border border-[#ded8d4] bg-white px-3 text-sm font-semibold text-[#222222] outline-none transition-all focus:border-[#ff5a5f] focus:ring-4 focus:ring-[#ff5a5f]/10"
                        />
                      </label>

                      <CustomSelect
                        label={undefined}
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

                      <button
                        type="button"
                        aria-pressed={property.active}
                        onClick={() => togglePropertyActive(property)}
                        className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-extrabold transition-colors ${
                          property.active
                            ? 'border-[#b9ddcf] bg-[#edf8f3] text-[#1f6b4e] hover:bg-[#e1f3eb]'
                            : 'border-[#ded8d4] bg-[#f7f4f2] text-[#817873] hover:bg-[#eee9e6]'
                        }`}
                      >
                        <Check className={`h-4 w-4 ${property.active ? '' : 'opacity-30'}`} />
                        {property.active ? 'Active' : 'Inactive'}
                      </button>

                      <button
                        type="button"
                        onClick={() => requestPropertyDeletion(property)}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#f1c9c6] bg-[#fff5f4] px-2 text-xs font-extrabold text-[#b13a40] transition-colors hover:bg-[#ffebe9]"
                        aria-label={`Delete ${property.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
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
                    <strong className="block text-sm font-bold text-[#222222]">
                      Import & Export
                    </strong>
                    <small className="text-[#717171]">
                      CSV reports and JSON backups
                    </small>
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
                    <strong className="block text-sm font-bold text-[#222222]">
                      Activity History
                    </strong>
                    <small className="text-[#717171]">
                      Review saved changes
                    </small>
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
