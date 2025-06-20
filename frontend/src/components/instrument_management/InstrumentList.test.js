import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import InstrumentList from './InstrumentList.vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';

// Mock the store
const mockInstruments = [
  { id: 1, name: 'Spectrometer A', serial_number: 'SN001', make: 'MakeA', model: 'ModelA', status: 'Available', calibration_date: '2024-12-01', maintenance_schedule: 'Annual' },
  { id: 2, name: 'Microscope B', serial_number: 'SN002', make: 'MakeB', model: 'ModelB', status: 'In Use', calibration_date: '2023-11-01', maintenance_schedule: 'Bi-Annual' },
];

// Mock store setup
const mockStore = {
  instruments: [],
  allInstruments: mockInstruments, // Use a computed-like structure if component uses store.allInstruments directly
  loading: false,
  isLoading: false, // Getter
  error: null,
  getError: null, // Getter
  fetchInstruments: vi.fn(),
  deleteInstrument: vi.fn(),
  // Provide default implementations for calibration date helpers if they are called directly from template
  // For this component, they are in <script setup> so they are part of the component itself.
};

vi.mock('@/stores/instrumentManagement', () => ({
  useInstrumentManagementStore: vi.fn(() => mockStore),
}));


describe('InstrumentList.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset mocks and store state before each test
    mockStore.fetchInstruments.mockClear();
    mockStore.deleteInstrument.mockClear();
    mockStore.instruments = [...mockInstruments]; // Reset to full list
    mockStore.allInstruments = [...mockInstruments];
    mockStore.loading = false;
    mockStore.isLoading = false;
    mockStore.error = null;
    mockStore.getError = null;
  });

  it('renders a list of instruments', async () => {
    const wrapper = mount(InstrumentList);

    // Wait for onMounted hook (fetchInstruments) and subsequent rendering
    await wrapper.vm.$nextTick(); // Allow computed properties to update
    await wrapper.vm.$nextTick(); // Allow template to re-render

    expect(mockStore.fetchInstruments).toHaveBeenCalledTimes(1);
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(mockInstruments.length);
    expect(wrapper.text()).toContain('Spectrometer A');
    expect(wrapper.text()).toContain('SN001');
    expect(wrapper.text()).toContain('Microscope B');
    expect(wrapper.text()).toContain('SN002');
  });

  it('displays loading state', async () => {
    mockStore.isLoading = true;
    mockStore.allInstruments = []; // No data while loading initially

    const wrapper = mount(InstrumentList);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Loading instruments...');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('displays error state', async () => {
    const errorMessage = 'Failed to fetch instruments';
    mockStore.getError = errorMessage;
    mockStore.allInstruments = [];

    const wrapper = mount(InstrumentList);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(`Error loading instruments: ${errorMessage}`);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('displays "No instruments found" when list is empty and not loading/error', async () => {
    mockStore.allInstruments = [];

    const wrapper = mount(InstrumentList);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('No instruments found.');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('emits "edit-instrument" event with instrument data when Edit button is clicked', async () => {
    const wrapper = mount(InstrumentList);
    await wrapper.vm.$nextTick(); // for list to render

    const editButton = wrapper.findAll('tbody tr')[0].findAll('button')[0]; // First instrument, first button
    await editButton.trigger('click');

    expect(wrapper.emitted('edit-instrument')).toBeTruthy();
    expect(wrapper.emitted('edit-instrument')[0][0]).toEqual(mockInstruments[0]);
  });

  it('emits "view-logs" event with instrument ID when Logs button is clicked', async () => {
    const wrapper = mount(InstrumentList);
    await wrapper.vm.$nextTick();

    const logsButton = wrapper.findAll('tbody tr')[0].findAll('button')[1]; // First instrument, second button
    await logsButton.trigger('click');

    expect(wrapper.emitted('view-logs')).toBeTruthy();
    expect(wrapper.emitted('view-logs')[0][0]).toBe(mockInstruments[0].id);
  });

  it('emits "delete-instrument" event with instrument ID after confirmation when Delete button is clicked', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    const wrapper = mount(InstrumentList);
    await wrapper.vm.$nextTick();

    const deleteButton = wrapper.findAll('tbody tr')[0].findAll('button')[2]; // First instrument, third button
    await deleteButton.trigger('click');

    expect(confirmSpy).toHaveBeenCalled();
    expect(wrapper.emitted('delete-instrument')).toBeTruthy();
    expect(wrapper.emitted('delete-instrument')[0][0]).toBe(mockInstruments[0].id);

    confirmSpy.mockRestore();
  });

  it('does not emit "delete-instrument" if confirmation is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

    const wrapper = mount(InstrumentList);
    await wrapper.vm.$nextTick();

    const deleteButton = wrapper.findAll('tbody tr')[0].findAll('button')[2];
    await deleteButton.trigger('click');

    expect(confirmSpy).toHaveBeenCalled();
    expect(wrapper.emitted('delete-instrument')).toBeFalsy();

    confirmSpy.mockRestore();
  });

  it('correctly formats calibration dates and applies classes', async () => {
    const instrumentsWithSpecificDates = [
      { id: 1, name: 'Overdue Cal', serial_number: 'SN_O', status: 'Available', calibration_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }, // 5 days ago
      { id: 2, name: 'Warning Cal', serial_number: 'SN_W', status: 'Available', calibration_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }, // In 3 days
      { id: 3, name: 'OK Cal', serial_number: 'SN_OK', status: 'Available', calibration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }, // In 30 days
      { id: 4, name: 'No Cal Date', serial_number: 'SN_ND', status: 'Available', calibration_date: null },
    ];
    mockStore.allInstruments = instrumentsWithSpecificDates;

    const wrapper = mount(InstrumentList);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();


    const rows = wrapper.findAll('tbody tr');

    // Overdue
    const overdueCell = rows[0].findAll('td')[5]; // Calibration date column
    expect(overdueCell.text()).toContain('Overdue by');
    expect(overdueCell.classes()).toContain('text-red-600');

    // Warning
    const warningCell = rows[1].findAll('td')[5];
    expect(warningCell.text()).toContain('Due in');
    expect(warningCell.classes()).toContain('text-yellow-600');

    // OK
    const okCell = rows[2].findAll('td')[5];
    expect(okCell.classes()).toContain('text-gray-500'); // Default color
    expect(okCell.text()).not.toContain('('); // No hint

    // No Date
    const noDateCell = rows[3].findAll('td')[5];
    expect(noDateCell.text()).toBe('-');
    expect(noDateCell.classes()).toContain('text-gray-500');
  });
});
