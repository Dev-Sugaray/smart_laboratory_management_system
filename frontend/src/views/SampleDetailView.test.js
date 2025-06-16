import { mount, shallowMount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import SampleDetailView from './SampleDetailView.vue';
import { useSampleManagementStore } from '@/stores/sampleManagement';
import { useRoute } from 'vue-router'; // To mock if needed, or rely on props

// Mock vue-router's useRoute if props are not solely relied upon
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRoute: vi.fn(() => ({ params: { id: '1' } })), // Default mock
  };
});

// Mock child component
const SampleTrackingHistoryStub = {
  name: 'SampleTrackingHistory',
  template: '<div class="sample-tracking-history-stub">History Events Here</div>',
  props: ['historyEvents', 'isLoading']
};

describe('SampleDetailView.vue', () => {
  let storeMock;

  beforeEach(() => {
    // Reset mocks for useRoute if needed for specific tests
    useRoute.mockReturnValue({ params: { id: '1' } });

    // Setup Pinia testing state for each test
    // setActivePinia(createPinia()); // This is done globally by createTestingPinia usually

    // Initialize the specific store we are testing against
    // storeMock = useSampleManagementStore(); // Not yet, this will call the actual store.
                                          // We need to configure it via createTestingPinia.
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mountComponent = (props = { id: '1' }, piniaState = {}) => {
    return mount(SampleDetailView, {
      props,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn, // Important for spying on actions
            initialState: {
              sampleManagement: { // Store ID
                currentSample: null,
                currentSampleCoC: [],
                isLoadingDetails: false,
                isLoadingCoC: false,
                error: null,
                storageLocations: [], // Needed by openUpdateStatusForm
                ...piniaState?.sampleManagement, // Allow overriding initial state
              },
            },
            stubActions: false, // We want to spy on actions, not stub them by default
          }),
        ],
        stubs: {
          SampleTrackingHistory: SampleTrackingHistoryStub,
          RouterLink: { template: '<a><slot/></a>' } // Stub router-link
        },
      },
    });
  };


  it('renders loading state initially for sample details and CoC', async () => {
    const wrapper = mountComponent({ id: '1' }, {
        sampleManagement: { isLoadingDetails: true, isLoadingCoC: true }
    });

    // Access store after component is mounted and Pinia is initialized for it
    storeMock = useSampleManagementStore();
    expect(storeMock.fetchSampleDetails).toHaveBeenCalledWith('1');
    expect(storeMock.fetchSampleChainOfCustody).toHaveBeenCalledWith('1');
    // Also fetches storage locations
    expect(storeMock.fetchStorageLocations).toHaveBeenCalled();


    expect(wrapper.find('.loading-indicator.section').text()).toContain('Loading sample details...');
    // Assuming SampleTrackingHistory also shows a loading state via its prop
  });

  it('renders sample details and CoC when data is loaded', async () => {
    const mockSample = {
      id: 1, unique_sample_id: 'SAMP001', sample_type_name: 'Blood', source_name: 'Clinical Trial A',
      collection_date: '2023-01-15T00:00:00Z', registration_date: '2023-01-16T10:00:00Z',
      current_status: 'In Storage', storage_location_name: 'Freezer A1', barcode_qr_code: 'QR-SAMP001',
      notes: 'Initial sample', updated_at: '2023-01-16T10:00:00Z'
    };
    const mockCoC = [{ id: 1, action: 'Registered', timestamp: '2023-01-16T10:00:00Z', user_full_name: 'Admin' }];

    const wrapper = mountComponent({ id: '1' }, {
      sampleManagement: {
        currentSample: mockSample,
        currentSampleCoC: mockCoC,
        isLoadingDetails: false,
        isLoadingCoC: false,
      }
    });
    storeMock = useSampleManagementStore(); // Get the mocked store instance

    await wrapper.vm.$nextTick(); // Wait for DOM updates

    expect(wrapper.find('h1.title.is-3').text()).toContain(mockSample.unique_sample_id);
    expect(wrapper.find('p.subtitle.is-5').text()).toContain(mockSample.current_status);
    expect(wrapper.find('table').html()).toContain(mockSample.sample_type_name);
    expect(wrapper.findComponent(SampleTrackingHistoryStub).exists()).toBe(true);
    expect(wrapper.findComponent(SampleTrackingHistoryStub).props('historyEvents')).toEqual(mockCoC);
  });

  it('renders "Sample not found" message if sampleDetails is null after loading', async () => {
    const wrapper = mountComponent({ id: '1' }, {
      sampleManagement: { currentSample: null, isLoadingDetails: false }
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.no-data-message.section').text()).toContain('Sample not found');
  });

  it('renders error message if fetchError is set', async () => {
    const wrapper = mountComponent({ id: '1' }, {
      sampleManagement: { error: 'Network Error Occurred', isLoadingDetails: false }
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.notification.is-danger').text()).toContain('Error loading sample details: Network Error Occurred');
  });

  it('calls store actions on mount and when id prop changes', async () => {
    const wrapper = mountComponent({ id: '1' });
    storeMock = useSampleManagementStore();

    expect(storeMock.fetchSampleDetails).toHaveBeenCalledTimes(1);
    expect(storeMock.fetchSampleDetails).toHaveBeenCalledWith('1');
    expect(storeMock.fetchSampleChainOfCustody).toHaveBeenCalledTimes(1);
    expect(storeMock.fetchSampleChainOfCustody).toHaveBeenCalledWith('1');
    expect(storeMock.fetchStorageLocations).toHaveBeenCalledTimes(1);


    // Test route prop change
    await wrapper.setProps({ id: '2' });
    await wrapper.vm.$nextTick();

    expect(storeMock.fetchSampleDetails).toHaveBeenCalledTimes(2);
    expect(storeMock.fetchSampleDetails).toHaveBeenCalledWith('2');
    expect(storeMock.fetchSampleChainOfCustody).toHaveBeenCalledTimes(2);
    expect(storeMock.fetchSampleChainOfCustody).toHaveBeenCalledWith('2');
    // fetchStorageLocations might be called again or might have a guard in the component
    // Current implementation calls it again, which is fine.
    expect(storeMock.fetchStorageLocations).toHaveBeenCalledTimes(2);
  });

  it('opens the update status form when "Update Status" button is clicked', async () => {
    const mockSample = { id: 1, current_status: 'Registered', storage_location_id: null };
    const wrapper = mountComponent({ id: '1' }, {
      sampleManagement: { currentSample: mockSample, storageLocations: [{id:1, name: "Freezer"}] }
    });
    storeMock = useSampleManagementStore(); // Get instance

    await wrapper.vm.$nextTick(); // Ensure sampleDetails is loaded

    expect(wrapper.find('.modal.is-active').exists()).toBe(false); // Modal initially hidden

    const updateStatusButton = wrapper.find('button.is-info'); // Assuming it's the only .is-info button
    expect(updateStatusButton.text()).toContain('Update Status / Location');
    await updateStatusButton.trigger('click');

    expect(wrapper.vm.showUpdateStatusForm).toBe(true); // Check internal state if needed
    await wrapper.vm.$nextTick(); // Wait for modal to render
    expect(wrapper.find('.modal.is-active').exists()).toBe(true);
    expect(wrapper.find('.modal.is-active h3.title.is-4').text()).toBe('Update Sample Status');

    // Check if storage locations were fetched if they weren't there initially
    // (This is implicitly tested by the onMounted call in the main component,
    // but if we wanted to ensure it's called by openUpdateStatusForm specifically)
    // if (storeMock.storageLocations.length === 0) {
    //   expect(storeMock.fetchStorageLocations).toHaveBeenCalled();
    // }
  });

  // Further tests could cover form submission within the modal,
  // but that would require more complex mocking of the form component itself
  // or deeper interaction testing.
});
