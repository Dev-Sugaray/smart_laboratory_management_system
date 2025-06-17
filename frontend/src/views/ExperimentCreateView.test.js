import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useExperimentStore } from '../stores/experiments'; // Adjust path
import ExperimentCreateView from './ExperimentCreateView.vue'; // Adjust path

// Mock Pinia store
// const mockCreateExperiment = vi.fn();
// vi.mock('../stores/experiments', () => ({
//   useExperimentStore: () => ({
//     createExperiment: mockCreateExperiment,
//     error: null, // Mock store state if needed by component
//   }),
// }));
// Simpler way for Pinia: just use the real store and mock its actions if needed, or provide initial state.

// Mock Vue Router
const mockRouterPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  RouterLink: { template: '<a><slot /></a>' } // Stub RouterLink
}));


describe('ExperimentCreateView.vue', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useExperimentStore(); // Get a fresh store for each test

    // Reset mocks
    mockRouterPush.mockClear();
    // If mocking store actions directly:
    // store.createExperiment = vi.fn();
    // store.error = null;
  });

  it('renders the form correctly', () => {
    const wrapper = mount(ExperimentCreateView);
    expect(wrapper.find('h1').text()).toBe('Create New Experiment');
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.find('input#exp-name').exists()).toBe(true);
    expect(wrapper.find('textarea#exp-description').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toContain('Create Experiment');
  });

  it('requires experiment name before submission', async () => {
    const wrapper = mount(ExperimentCreateView);
    // Mock the store action to see if it's NOT called
    store.createExperiment = vi.fn();

    await wrapper.find('form').trigger('submit.prevent');

    expect(store.createExperiment).not.toHaveBeenCalled();
    expect(wrapper.vm.error).toBe('Experiment name is required.'); // Component's internal error ref
    expect(wrapper.find('.bg-red-100').exists()).toBe(true); // Error message shown
  });

  it('calls createExperiment action on valid submission and navigates', async () => {
    const wrapper = mount(ExperimentCreateView);
    const experimentData = { name: 'New Test Exp', description: 'A cool experiment' };

    // Mock the store action to resolve successfully
    store.createExperiment = vi.fn().mockResolvedValue(true);

    await wrapper.find('input#exp-name').setValue(experimentData.name);
    await wrapper.find('textarea#exp-description').setValue(experimentData.description);
    await wrapper.find('form').trigger('submit.prevent');

    expect(store.createExperiment).toHaveBeenCalledWith(experimentData);
    // Wait for async operations in handleSubmit to complete
    // await wrapper.vm.$nextTick(); // May not be needed if router.push is awaited or directly checked

    // Vitest runs promises, so by the time we are here, push should have been called if createExperiment resolved.
    expect(mockRouterPush).toHaveBeenCalledWith('/experiments');
    expect(wrapper.vm.error).toBeNull();
  });

  it('displays error message if createExperiment action fails', async () => {
    const wrapper = mount(ExperimentCreateView);
    const experimentData = { name: 'Fail Exp', description: 'This will fail' };
    const errorMessage = 'Network Error from API';

    // Mock the store action to reject
    store.createExperiment = vi.fn().mockRejectedValue(new Error(errorMessage));
    // Also set store.error as the component might use it
    store.error = errorMessage;


    await wrapper.find('input#exp-name').setValue(experimentData.name);
    await wrapper.find('textarea#exp-description').setValue(experimentData.description);
    await wrapper.find('form').trigger('submit.prevent');

    expect(store.createExperiment).toHaveBeenCalledWith(experimentData);
    // await wrapper.vm.$nextTick(); // Ensure component updates

    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(wrapper.vm.error).toBe(errorMessage); // Component's error ref updated
    expect(wrapper.find('.bg-red-100').text()).toContain(errorMessage);
  });

  it('shows loading state during submission', async () => {
    const wrapper = mount(ExperimentCreateView);
    store.createExperiment = vi.fn(() => new Promise(resolve => setTimeout(() => resolve(true), 100))); // Slow promise

    await wrapper.find('input#exp-name').setValue('Loading Exp');
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.find('button[type="submit"]').text()).toContain('Creating...');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();

    // await new Promise(resolve => setTimeout(resolve, 150)); // Wait for promise to resolve
    // expect(wrapper.find('button[type="submit"]').text()).toContain('Create Experiment');
  });
});
