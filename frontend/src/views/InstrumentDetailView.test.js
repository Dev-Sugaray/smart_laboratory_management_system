import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import InstrumentDetailView from './InstrumentDetailView.vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';

// Mock child components
vi.mock('@/components/instrument_management/InstrumentUsageLogForm.vue', () => ({
  default: {
    name: 'InstrumentUsageLogForm',
    props: ['instrumentId'],
    emits: ['usage-logged'],
    template: '<div data-testid="mock-usage-log-form"></div>',
  },
}));
vi.mock('@/components/instrument_management/InstrumentUsageList.vue', () => ({
  default: {
    name: 'InstrumentUsageList',
    props: ['instrumentId'],
    template: '<div data-testid="mock-usage-list"></div>',
  },
}));

// Mock vue-router
const mockRouterPush = vi.fn();
const mockRouteParams = { id: '1' }; // Default mock route param

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: mockRouterPush,
    }),
    useRoute: () => ({ // Mock useRoute to provide params
      params: mockRouteParams,
    }),
  };
});

// Mock Pinia store
const mockInstrumentData = {
  id: 1,
  name: 'SpectroMax 5000',
  serial_number: 'SN-MAX-001',
  make: 'NanoProbe',
  model: '5000X',
  status: 'Available',
  calibration_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // In 10 days
  maintenance_schedule: 'Quarterly',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockStoreActions = {
  fetchInstrumentById: vi.fn(),
  clearCurrentInstrument: vi.fn(),
  clearUsageLogs: vi.fn(),
  // fetchUsageLogs is part of UsageList component, which is mocked
};
const mockStoreState = {
  currentInstrument: null,
  loading: false, // General loading for instrument CRUD
  error: null,    // General error for instrument CRUD
};

vi.mock('@/stores/instrumentManagement', () => ({
  useInstrumentManagementStore: vi.fn(() => ({
    ...mockStoreActions,
    ...mockStoreState,
    // getters
    isLoading: () => mockStoreState.loading, // if component uses store.isLoading
    getError: () => mockStoreState.error,    // if component uses store.getError
    // currentInstrument is a direct state property in the mock
  })),
}));


describe('InstrumentDetailView.vue', () => {
  let storeMock;

  beforeEach(() => {
    setActivePinia(createPinia());
    storeMock = useInstrumentManagementStore();

    // Reset mocks and store state
    mockRouterPush.mockClear();
    mockRouteParams.id = '1'; // Reset route param
    mockStoreActions.fetchInstrumentById.mockReset().mockResolvedValue(mockInstrumentData); // Default success
    mockStoreActions.clearCurrentInstrument.mockReset();
    mockStoreActions.clearUsageLogs.mockReset();
    mockStoreState.currentInstrument = null; // Reset
    mockStoreState.loading = false;
    mockStoreState.error = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches instrument details on mount based on route param', async () => {
    mount(InstrumentDetailView, { global: { stubs: { RouterLink: true } } });
    expect(mockStoreActions.fetchInstrumentById).toHaveBeenCalledTimes(1);
    expect(mockStoreActions.fetchInstrumentById).toHaveBeenCalledWith('1');
  });

  it('displays loading state while fetching instrument details', async () => {
    mockStoreState.loading = true;
    // Simulate no instrument initially, then loading
    mockStoreState.currentInstrument = null;
    // Important: Make fetchInstrumentById a pending promise for this test
    mockStoreActions.fetchInstrumentById.mockReturnValueOnce(new Promise(() => {}));


    const wrapper = mount(InstrumentDetailView, { global: { stubs: { RouterLink: true } } });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Loading instrument details...');
  });

  it('displays error message if fetching instrument fails', async () => {
    const errorMessage = 'Instrument fetch failed';
    mockStoreState.error = errorMessage;
    mockStoreActions.fetchInstrumentById.mockRejectedValueOnce(new Error(errorMessage));
    // Ensure currentInstrument is null to show error section
    mockStoreState.currentInstrument = null;

    const wrapper = mount(InstrumentDetailView, { global: { stubs: { RouterLink: true } } });
    await wrapper.vm.$nextTick(); // for fetch to "fail"
    await wrapper.vm.$nextTick(); // for error to render

    expect(wrapper.text()).toContain(`Error loading instrument: ${errorMessage}`);
  });

  it('renders instrument details when data is available', async () => {
    mockStoreState.currentInstrument = mockInstrumentData; // Set instrument data directly
    mockStoreActions.fetchInstrumentById.mockResolvedValueOnce(mockInstrumentData); // Ensure it resolves

    const wrapper = mount(InstrumentDetailView, { global: { stubs: { RouterLink: true } } });
    await wrapper.vm.$nextTick(); // Let component react to store having data
    await wrapper.vm.$nextTick();


    expect(wrapper.text()).toContain(mockInstrumentData.name);
    expect(wrapper.text()).toContain(mockInstrumentData.serial_number);
    expect(wrapper.text()).toContain(mockInstrumentData.make);
    // Check for child components
    expect(wrapper.find('[data-testid="mock-usage-log-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mock-usage-list"]').exists()).toBe(true);
  });

  it('passes correct instrumentId to child components', async () => {
    mockRouteParams.id = '789';
    mockStoreState.currentInstrument = { ...mockInstrumentData, id: 789 };
    mockStoreActions.fetchInstrumentById.mockResolvedValueOnce({ ...mockInstrumentData, id: 789 });


    const wrapper = mount(InstrumentDetailView, { global: { stubs: { RouterLink: true } } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const form = wrapper.findComponent({ name: 'InstrumentUsageLogForm' });
    const list = wrapper.findComponent({ name: 'InstrumentUsageList' });
    expect(form.props('instrumentId')).toBe('789');
    expect(list.props('instrumentId')).toBe('789');
  });

  it('displays "Instrument not found" if no instrument data and no error/loading', async () => {
    mockStoreState.currentInstrument = null;
    mockStoreActions.fetchInstrumentById.mockResolvedValueOnce(null); // Simulate API returning null

    const wrapper = mount(InstrumentDetailView, { global: { stubs: { RouterLink: true } } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Instrument not found.');
  });

  it('applies visual cues for calibration dates', async () => {
    const overdueInstrument = { ...mockInstrumentData, calibration_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }; // 5 days ago
    mockStoreState.currentInstrument = overdueInstrument;
    mockStoreActions.fetchInstrumentById.mockResolvedValueOnce(overdueInstrument);

    const wrapper = mount(InstrumentDetailView, { global: { stubs: { RouterLink: true } } });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const calibrationDateDd = wrapper.findAll('dd').filter(dd => dd.text().includes(new Date(overdueInstrument.calibration_date).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })));
    expect(calibrationDateDd.length).toBeGreaterThan(0);
    expect(calibrationDateDd[0].classes()).toContain('text-red-600');
    expect(calibrationDateDd[0].text()).toContain('Overdue by');
  });

  it('calls clearCurrentInstrument and clearUsageLogs on unmount', () => {
    const wrapper = mount(InstrumentDetailView, { global: { stubs: { RouterLink: true } } });
    wrapper.unmount();
    expect(mockStoreActions.clearCurrentInstrument).toHaveBeenCalledTimes(1);
    expect(mockStoreActions.clearUsageLogs).toHaveBeenCalledTimes(1);
  });
});
