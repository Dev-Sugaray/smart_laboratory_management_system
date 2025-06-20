import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useRouter }_from 'vue-router'; // Corrected import
import InstrumentManagementView from './InstrumentManagementView.vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';
import { useAuthStore } from '@/stores/auth'; // For permission checks if any

// Mock child components
vi.mock('@/components/instrument_management/InstrumentRegistrationForm.vue', () => ({
  default: {
    name: 'InstrumentRegistrationForm',
    props: ['instrumentToEdit'],
    emits: ['form-submitted', 'form-cancelled'],
    template: '<div data-testid="mock-registration-form"></div>',
  },
}));
vi.mock('@/components/instrument_management/InstrumentList.vue', () => ({
  default: {
    name: 'InstrumentList',
    emits: ['edit-instrument', 'view-logs', 'delete-instrument'],
    template: '<div data-testid="mock-instrument-list"></div>',
  },
}));

// Mock vue-router
const mockRouterPush = vi.fn();
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: mockRouterPush,
    }),
  };
});


// Mock Pinia stores
const mockInstrumentStoreActions = {
  fetchInstruments: vi.fn(),
  deleteInstrument: vi.fn(),
};
const mockInstrumentStoreState = {
  error: null,
  getError: null,
  isLoading: false,
};
vi.mock('@/stores/instrumentManagement', () => ({
  useInstrumentManagementStore: vi.fn(() => ({
    ...mockInstrumentStoreActions,
    ...mockInstrumentStoreState,
  })),
}));

const mockAuthStoreState = {
  hasPermission: vi.fn(() => true), // Default to having permissions
};
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState),
}));


describe('InstrumentManagementView.vue', () => {
  let instrumentStoreMock;
  // let authStoreMock; // Not strictly needed if only using default mock

  beforeEach(() => {
    setActivePinia(createPinia());
    instrumentStoreMock = useInstrumentManagementStore();
    // authStoreMock = useAuthStore(); // If needed for specific permission tests

    // Reset mocks
    mockRouterPush.mockClear();
    instrumentStoreMock.fetchInstruments.mockClear();
    instrumentStoreMock.deleteInstrument.mockClear();
    instrumentStoreMock.error = null;
    // mockAuthStoreState.hasPermission.mockReturnValue(true); // Reset permission mock
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders InstrumentList by default', () => {
    const wrapper = mount(InstrumentManagementView);
    expect(wrapper.find('[data-testid="mock-instrument-list"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mock-registration-form"]').exists()).toBe(false);
  });

  it('shows InstrumentRegistrationForm when "Register New Instrument" button is clicked', async () => {
    const wrapper = mount(InstrumentManagementView);
    const registerButton = wrapper.find('button'); // Assuming it's the first button
    await registerButton.trigger('click');
    expect(wrapper.find('[data-testid="mock-registration-form"]').exists()).toBe(true);
    expect(registerButton.text()).toContain('Cancel');
  });

  it('passes null as instrumentToEdit when registering new instrument', async () => {
    const wrapper = mount(InstrumentManagementView);
    await wrapper.find('button').trigger('click'); // Show form
    const form = wrapper.findComponent({ name: 'InstrumentRegistrationForm' });
    expect(form.props('instrumentToEdit')).toBeNull();
  });

  it('shows InstrumentRegistrationForm with instrument data when "edit-instrument" event is emitted from list', async () => {
    const wrapper = mount(InstrumentManagementView);
    const listComponent = wrapper.findComponent({ name: 'InstrumentList' });
    const instrumentData = { id: 1, name: 'Test Edit Instrument' };

    await listComponent.vm.$emit('edit-instrument', instrumentData);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="mock-registration-form"]').exists()).toBe(true);
    const form = wrapper.findComponent({ name: 'InstrumentRegistrationForm' });
    expect(form.props('instrumentToEdit')).toEqual(instrumentData);
    // expect(wrapper.find('button').text()).toContain('Cancel Edit'); // Button text changes
  });

  it('hides form and refreshes list when "form-submitted" event is emitted', async () => {
    const wrapper = mount(InstrumentManagementView);
    // Show the form first
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('[data-testid="mock-registration-form"]').exists()).toBe(true);

    const formComponent = wrapper.findComponent({ name: 'InstrumentRegistrationForm' });
    await formComponent.vm.$emit('form-submitted');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="mock-registration-form"]').exists()).toBe(false);
    expect(instrumentStoreMock.fetchInstruments).toHaveBeenCalled();
  });

  it('hides form when "form-cancelled" event is emitted', async () => {
    const wrapper = mount(InstrumentManagementView);
    await wrapper.find('button').trigger('click'); // Show form
    expect(wrapper.find('[data-testid="mock-registration-form"]').exists()).toBe(true);

    const formComponent = wrapper.findComponent({ name: 'InstrumentRegistrationForm' });
    await formComponent.vm.$emit('form-cancelled');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="mock-registration-form"]').exists()).toBe(false);
  });

  it('navigates to detail view when "view-logs" event is emitted from list', async () => {
    const wrapper = mount(InstrumentManagementView);
    const listComponent = wrapper.findComponent({ name: 'InstrumentList' });
    const instrumentId = 123;

    await listComponent.vm.$emit('view-logs', instrumentId);

    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'InstrumentDetailView', params: { id: instrumentId } });
  });

  it('shows delete confirmation modal when "delete-instrument" event is emitted', async () => {
    const wrapper = mount(InstrumentManagementView);
    const listComponent = wrapper.findComponent({ name: 'InstrumentList' });

    await listComponent.vm.$emit('delete-instrument', 1);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Confirm Deletion'); // Modal becomes visible
  });

  it('calls deleteInstrument action when deletion is confirmed', async () => {
    instrumentStoreMock.deleteInstrument.mockResolvedValueOnce({}); // Simulate successful deletion
    const wrapper = mount(InstrumentManagementView);
    const listComponent = wrapper.findComponent({ name: 'InstrumentList' });

    // Trigger modal
    await listComponent.vm.$emit('delete-instrument', 1);
    await wrapper.vm.$nextTick();

    // Find and click confirm delete button (assuming it's the one with 'Delete' text)
    const deleteButtons = wrapper.findAll('button');
    const confirmButton = deleteButtons.filter(b => b.text() === 'Delete')[0]; // Find the actual delete button
    await confirmButton.trigger('click');

    expect(instrumentStoreMock.deleteInstrument).toHaveBeenCalledWith(1);
    // Optionally check if modal hides after deletion
    // await wrapper.vm.$nextTick();
    // expect(wrapper.text()).not.toContain('Confirm Deletion');
  });

  it('does not call deleteInstrument if deletion is cancelled', async () => {
    const wrapper = mount(InstrumentManagementView);
    const listComponent = wrapper.findComponent({ name: 'InstrumentList' });

    await listComponent.vm.$emit('delete-instrument', 1);
    await wrapper.vm.$nextTick();

    const cancelButtons = wrapper.findAll('button');
    const cancelButton = cancelButtons.filter(b => b.text() === 'Cancel' && b.classes().some(c => c.includes('bg-gray-200')))[0];
    await cancelButton.trigger('click');

    expect(instrumentStoreMock.deleteInstrument).not.toHaveBeenCalled();
  });

  it('displays store error if deletion fails and modal is open', async () => {
    const deleteErrorMessage = "Failed to delete instrument.";
    instrumentStoreMock.deleteInstrument.mockRejectedValueOnce(new Error("API error"));
    // Update the getter mock for this test
    Object.defineProperty(instrumentStoreMock, 'getError', {
        get: () => deleteErrorMessage,
        configurable: true
    });


    const wrapper = mount(InstrumentManagementView);
    const listComponent = wrapper.findComponent({ name: 'InstrumentList' });

    await listComponent.vm.$emit('delete-instrument', 1);
    await wrapper.vm.$nextTick();

    const deleteButtons = wrapper.findAll('button');
    const confirmButton = deleteButtons.filter(b => b.text() === 'Delete')[0];
    await confirmButton.trigger('click'); // Attempt deletion
    await wrapper.vm.$nextTick(); // Wait for error to process


    expect(instrumentStoreMock.deleteInstrument).toHaveBeenCalled();
    expect(wrapper.text()).toContain(deleteErrorMessage); // Error shown in modal
  });

});
