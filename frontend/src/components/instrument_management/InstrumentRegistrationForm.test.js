import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import InstrumentRegistrationForm from './InstrumentRegistrationForm.vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement'; // Adjust path as needed

// Mock the store
vi.mock('@/stores/instrumentManagement', () => ({
  useInstrumentManagementStore: vi.fn(() => ({
    registerInstrument: vi.fn(),
    updateInstrument: vi.fn(),
    isLoading: false,
    getError: null,
    error: null, // Writable error for testing
  })),
}));

describe('InstrumentRegistrationForm.vue', () => {
  let storeMock;

  beforeEach(() => {
    setActivePinia(createPinia());
    // Get the mocked store instance for each test
    storeMock = useInstrumentManagementStore();
    // Reset mocks for each test if they were called
    storeMock.registerInstrument.mockReset();
    storeMock.updateInstrument.mockReset();
    storeMock.error = null; // Reset error state
  });

  it('renders form fields correctly', () => {
    const wrapper = mount(InstrumentRegistrationForm);
    expect(wrapper.find('input#name').exists()).toBe(true);
    expect(wrapper.find('input#serial_number').exists()).toBe(true);
    expect(wrapper.find('input#make').exists()).toBe(true);
    expect(wrapper.find('input#model').exists()).toBe(true);
    expect(wrapper.find('input#calibration_date').exists()).toBe(true);
    expect(wrapper.find('input#maintenance_schedule').exists()).toBe(true);
    expect(wrapper.find('select#status').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toContain('Register Instrument');
  });

  it('requires name and serial_number for submission', async () => {
    const wrapper = mount(InstrumentRegistrationForm);
    // Spy on window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await wrapper.find('form').trigger('submit.prevent');
    expect(storeMock.registerInstrument).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Name and Serial Number are required.');

    await wrapper.find('input#name').setValue('Test Instrument');
    await wrapper.find('form').trigger('submit.prevent');
    expect(storeMock.registerInstrument).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Name and Serial Number are required.');

    alertSpy.mockRestore();
  });

  it('calls registerInstrument action on valid submission (new instrument)', async () => {
    storeMock.registerInstrument.mockResolvedValueOnce({ id: 1, name: 'Test Instrument' });
    const wrapper = mount(InstrumentRegistrationForm);

    await wrapper.find('input#name').setValue('Test Instrument');
    await wrapper.find('input#serial_number').setValue('SN001');
    await wrapper.find('input#make').setValue('TestMake');
    // Fill other fields as needed or ensure they have defaults

    await wrapper.find('form').trigger('submit.prevent');

    expect(storeMock.registerInstrument).toHaveBeenCalledTimes(1);
    expect(storeMock.registerInstrument).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Instrument',
      serial_number: 'SN001',
      make: 'TestMake',
    }));
    expect(wrapper.emitted('form-submitted')).toBeTruthy();
  });

  it('pre-fills form when instrumentToEdit prop is passed and calls updateInstrument', async () => {
    const instrumentData = {
      id: 1,
      name: 'Edit Spec',
      serial_number: 'SN-EDIT-001',
      make: 'EditMake',
      model: 'EditModel',
      calibration_date: '2023-01-01T00:00:00.000Z', // Ensure date format matches what backend provides if needed
      maintenance_schedule: 'Annual',
      status: 'In Use',
    };
    storeMock.updateInstrument.mockResolvedValueOnce({ ...instrumentData, name: 'Updated Spec' });

    const wrapper = mount(InstrumentRegistrationForm, {
      props: {
        instrumentToEdit: instrumentData,
      },
    });

    expect(wrapper.find('input#name').element.value).toBe('Edit Spec');
    expect(wrapper.find('input#serial_number').element.value).toBe('SN-EDIT-001');
    // Check formatted date for calibration_date input
    expect(wrapper.find('input#calibration_date').element.value).toBe('2023-01-01');
    expect(wrapper.find('button[type="submit"]').text()).toContain('Update Instrument');

    // Modify a field
    await wrapper.find('input#name').setValue('Updated Spec');
    await wrapper.find('form').trigger('submit.prevent');

    expect(storeMock.updateInstrument).toHaveBeenCalledTimes(1);
    expect(storeMock.updateInstrument).toHaveBeenCalledWith(instrumentData.id, expect.objectContaining({
      name: 'Updated Spec',
      serial_number: 'SN-EDIT-001', // original SN unless changed
    }));
    expect(wrapper.emitted('form-submitted')).toBeTruthy();
  });

  it('displays an error message from the store', async () => {
    const errorMessage = 'Failed to register instrument due to network error.';
    // Simulate an error by setting it in the store mock, as if an action failed
    // This requires making `error` on the store mock writable or using a more complete mock
    useInstrumentManagementStore.mockImplementationOnce(() => ({ // Re-mock for this test
        ...storeMock, // spread existing mocks
        getError: errorMessage, // Simulate error getter
        error: errorMessage, // Simulate error state if component reads it directly
    }));

    const wrapper = mount(InstrumentRegistrationForm);

    // In a real scenario, the error would be set after an action (e.g., submit)
    // For this test, we assume it's already set when component renders or re-renders.
    // If component only shows error *after* submit, you'd trigger submit here.
    // The template has: <div v-if="store.error" ... Error: {{ store.getError }}
    // So, if store.getError returns the message, it should display.

    // To ensure reactivity if error changes:
    // await wrapper.vm.$nextTick(); // Wait for Vue to react to store changes (if necessary)

    expect(wrapper.text()).toContain(errorMessage);
  });

  it('emits form-cancelled event when cancel button is clicked', async () => {
    const wrapper = mount(InstrumentRegistrationForm);
    await wrapper.find('button[type="button"]').trigger('click'); // Assuming cancel is the only button type="button"
    expect(wrapper.emitted('form-cancelled')).toBeTruthy();
  });
});
