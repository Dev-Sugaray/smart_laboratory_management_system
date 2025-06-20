import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import InstrumentUsageLogForm from './InstrumentUsageLogForm.vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';

// Mock the store
const mockStoreActions = {
  logInstrumentUsage: vi.fn(),
};
const mockStoreGetters = {
  isUsageLogLoading: false,
  getUsageLogError: null,
};

vi.mock('@/stores/instrumentManagement', () => ({
  useInstrumentManagementStore: vi.fn(() => ({
    ...mockStoreActions,
    ...mockStoreGetters,
    // Writable error property for testing error display
    usageLogError: null,
  })),
}));

describe('InstrumentUsageLogForm.vue', () => {
  let storeMock;
  const instrumentId = 123; // Example instrument ID

  beforeEach(() => {
    setActivePinia(createPinia());
    storeMock = useInstrumentManagementStore();
    // Reset mocks and reactive properties
    storeMock.logInstrumentUsage.mockReset();
    storeMock.usageLogError = null; // Reset store error state
    // Reset getters if they are mutable in the mock (they are from mockStoreGetters here)
    mockStoreGetters.isUsageLogLoading = false;
    mockStoreGetters.getUsageLogError = null;

  });

  it('renders form fields correctly', () => {
    const wrapper = mount(InstrumentUsageLogForm, {
      props: { instrumentId }
    });
    expect(wrapper.find('input#start_time[type="datetime-local"]').exists()).toBe(true);
    expect(wrapper.find('input#end_time[type="datetime-local"]').exists()).toBe(true);
    expect(wrapper.find('textarea#notes').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toContain('Log Usage');
  });

  it('requires start_time for submission', async () => {
    const wrapper = mount(InstrumentUsageLogForm, {
      props: { instrumentId }
    });
    await wrapper.find('form').trigger('submit.prevent');
    expect(storeMock.logInstrumentUsage).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Start time is required.'); // Check for local submissionError message
  });

  it('validates that end_time is not before start_time', async () => {
    const wrapper = mount(InstrumentUsageLogForm, {
      props: { instrumentId }
    });
    const startTime = '2023-01-01T12:00';
    const endTimeBeforeStart = '2023-01-01T10:00';

    await wrapper.find('input#start_time').setValue(startTime);
    await wrapper.find('input#end_time').setValue(endTimeBeforeStart);
    await wrapper.find('form').trigger('submit.prevent');

    expect(storeMock.logInstrumentUsage).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('End time cannot be before start time.');
  });

  it('calls logInstrumentUsage action on valid submission', async () => {
    storeMock.logInstrumentUsage.mockResolvedValueOnce({ id: 1, notes: 'Test log' });
    const wrapper = mount(InstrumentUsageLogForm, {
      props: { instrumentId }
    });

    const usageData = {
      start_time: '2023-01-01T10:00',
      end_time: '2023-01-01T11:00',
      notes: 'Routine check',
    };

    await wrapper.find('input#start_time').setValue(usageData.start_time);
    await wrapper.find('input#end_time').setValue(usageData.end_time);
    await wrapper.find('textarea#notes').setValue(usageData.notes);
    await wrapper.find('form').trigger('submit.prevent');

    expect(storeMock.logInstrumentUsage).toHaveBeenCalledTimes(1);
    expect(storeMock.logInstrumentUsage).toHaveBeenCalledWith({
      instrument_id: instrumentId,
      ...usageData,
    });
    expect(wrapper.emitted('usage-logged')).toBeTruthy();
    // Check if form resets (example: notes field)
    expect(wrapper.find('textarea#notes').element.value).toBe('');
  });

  it('displays an error message from the store if submission fails', async () => {
    const errorMessage = 'Network Error logging usage';
    // Update the mock for this specific test case to simulate an error
    useInstrumentManagementStore.mockImplementationOnce(() => ({
        ...mockStoreActions,
        isUsageLogLoading: false,
        getUsageLogError: errorMessage, // Getter returns error
        usageLogError: errorMessage, // State itself
        logInstrumentUsage: vi.fn().mockRejectedValue(new Error(errorMessage)) // Action rejects
    }));

    const wrapper = mount(InstrumentUsageLogForm, {
      props: { instrumentId }
    });

    await wrapper.find('input#start_time').setValue('2023-01-01T10:00');
    await wrapper.find('form').trigger('submit.prevent');

    // Wait for error to be processed and displayed
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();


    expect(wrapper.text()).toContain(`Error logging usage: ${errorMessage}`);
  });
});
