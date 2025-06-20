import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import InstrumentUsageList from './InstrumentUsageList.vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';

const mockUsageLogs = [
  { id: 1, user_id: 1, user_full_name: 'Admin User', start_time: '2023-01-01T10:00:00Z', end_time: '2023-01-01T11:00:00Z', notes: 'Log 1', created_at: '2023-01-01T11:00:00Z' },
  { id: 2, user_id: 2, user_full_name: 'Researcher Roo', start_time: '2023-01-02T14:00:00Z', end_time: '2023-01-02T14:30:00Z', notes: 'Log 2', created_at: '2023-01-02T14:30:00Z' },
  { id: 3, user_id: 1, user_full_name: 'Admin User', start_time: '2023-01-03T09:00:00Z', end_time: null, notes: 'Ongoing', created_at: '2023-01-03T09:00:00Z' },
];

// Mock store setup
const mockStoreState = {
  instrumentUsageLogs: [],
  usageLogLoading: false,
  usageLogError: null,
};

const mockStoreActions = {
  fetchUsageLogs: vi.fn(),
  clearUsageLogs: vi.fn(),
};

const mockStoreGetters = {
  getUsageLogs: () => mockStoreState.instrumentUsageLogs,
  isUsageLogLoading: () => mockStoreState.usageLogLoading,
  getUsageLogError: () => mockStoreState.usageLogError,
};

vi.mock('@/stores/instrumentManagement', () => ({
  useInstrumentManagementStore: vi.fn(() => ({
    ...mockStoreState, // direct state access for modification in tests
    ...mockStoreActions,
    // getters need to be functions
    getUsageLogs: mockStoreGetters.getUsageLogs,
    isUsageLogLoading: mockStoreGetters.isUsageLogLoading,
    getUsageLogError: mockStoreGetters.getUsageLogError,
  })),
}));

describe('InstrumentUsageList.vue', () => {
  const instrumentId = 1;

  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset mocks and store state
    mockStoreActions.fetchUsageLogs.mockClear();
    mockStoreActions.clearUsageLogs.mockClear();
    mockStoreState.instrumentUsageLogs = []; // Default to empty
    mockStoreState.usageLogLoading = false;
    mockStoreState.usageLogError = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches usage logs when instrumentId prop is provided', async () => {
    mount(InstrumentUsageList, { props: { instrumentId } });
    expect(mockStoreActions.fetchUsageLogs).toHaveBeenCalledTimes(1);
    expect(mockStoreActions.fetchUsageLogs).toHaveBeenCalledWith(instrumentId);
  });

  it('renders a list of usage logs', async () => {
    mockStoreState.instrumentUsageLogs = [...mockUsageLogs];
    const wrapper = mount(InstrumentUsageList, { props: { instrumentId } });
    await wrapper.vm.$nextTick(); // allow list rendering

    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(mockUsageLogs.length);
    expect(wrapper.text()).toContain('Admin User');
    expect(wrapper.text()).toContain('Log 1');
    expect(wrapper.text()).toContain('Researcher Roo');
    expect(wrapper.text()).toContain('Log 2');
  });

  it('displays loading state correctly', async () => {
    mockStoreState.usageLogLoading = true;
    const wrapper = mount(InstrumentUsageList, { props: { instrumentId } });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Loading usage logs...');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('displays error state correctly', async () => {
    const errorMessage = 'Failed to fetch logs';
    mockStoreState.usageLogError = errorMessage;
    const wrapper = mount(InstrumentUsageList, { props: { instrumentId } });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(`Error loading usage logs: ${errorMessage}`);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('displays "No usage logs found" when list is empty', async () => {
    mockStoreState.instrumentUsageLogs = []; // Ensure it's empty
    const wrapper = mount(InstrumentUsageList, { props: { instrumentId } });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('No usage logs found for this instrument.');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('calculates and displays duration correctly', async () => {
    mockStoreState.instrumentUsageLogs = [mockUsageLogs[0]]; // Log with 1 hour duration
    const wrapper = mount(InstrumentUsageList, { props: { instrumentId } });
    await wrapper.vm.$nextTick();

    const durationCell = wrapper.find('tbody tr td:nth-child(4)');
    expect(durationCell.text()).toBe('1h 0m 0s');
  });

  it('displays "-" for duration if end_time is null', async () => {
    mockStoreState.instrumentUsageLogs = [mockUsageLogs[2]]; // Log with null end_time
    const wrapper = mount(InstrumentUsageList, { props: { instrumentId } });
    await wrapper.vm.$nextTick();

    const durationCell = wrapper.find('tbody tr td:nth-child(4)');
    expect(durationCell.text()).toBe('-');
  });

  it('formats dates correctly', async () => {
    mockStoreState.instrumentUsageLogs = [mockUsageLogs[0]];
    const wrapper = mount(InstrumentUsageList, { props: { instrumentId } });
    await wrapper.vm.$nextTick();

    const startTimeCell = wrapper.find('tbody tr td:nth-child(2)');
    // Example format check, depends on toLocaleString's output in test env (often defaults to US-like)
    // For '2023-01-01T10:00:00Z' this might be '1/1/2023, 10:00 AM' or '01/01/2023, 10:00'
    // We set hour12: false, so it should be 24-hour format.
    expect(startTimeCell.text()).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}, \d{2}:\d{2}/);
  });

  it('calls clearUsageLogs on unmount', () => {
    const wrapper = mount(InstrumentUsageList, { props: { instrumentId } });
    wrapper.unmount();
    expect(mockStoreActions.clearUsageLogs).toHaveBeenCalledTimes(1);
  });
});
