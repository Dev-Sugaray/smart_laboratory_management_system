import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTestStore } from '../stores/tests'; // Adjust path
import TestCreateView from './TestCreateView.vue'; // Adjust path

// Mock Vue Router
const mockRouterPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  RouterLink: { template: '<a><slot /></a>' }
}));


describe('TestCreateView.vue', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useTestStore();

    mockRouterPush.mockClear();
    store.createTest = vi.fn();
    store.error = null;
  });

  it('renders the form correctly', () => {
    const wrapper = mount(TestCreateView);
    expect(wrapper.find('h1').text()).toBe('Create New Test Definition');
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.find('input#test-name').exists()).toBe(true);
    expect(wrapper.find('textarea#test-description').exists()).toBe(true);
    expect(wrapper.find('textarea#test-protocol').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toContain('Create Test Definition');
  });

  it('requires test definition name before submission', async () => {
    const wrapper = mount(TestCreateView);
    store.createTest = vi.fn();

    await wrapper.find('form').trigger('submit.prevent');

    expect(store.createTest).not.toHaveBeenCalled();
    expect(wrapper.vm.error).toBe('Test definition name is required.');
    expect(wrapper.find('.bg-red-100').exists()).toBe(true);
  });

  it('calls createTest action on valid submission and navigates', async () => {
    const wrapper = mount(TestCreateView);
    const testData = { name: 'New PCR Test', description: 'Viral load PCR', protocol: 'Sample prep, RT-PCR, analysis' };

    store.createTest.mockResolvedValue(true);

    await wrapper.find('input#test-name').setValue(testData.name);
    await wrapper.find('textarea#test-description').setValue(testData.description);
    await wrapper.find('textarea#test-protocol').setValue(testData.protocol);
    await wrapper.find('form').trigger('submit.prevent');

    expect(store.createTest).toHaveBeenCalledWith(testData);
    expect(mockRouterPush).toHaveBeenCalledWith('/tests');
    expect(wrapper.vm.error).toBeNull();
  });

  it('displays error message if createTest action fails', async () => {
    const wrapper = mount(TestCreateView);
    const testData = { name: 'Fail Test Def', description: 'This will fail' };
    const errorMessage = 'API submission error';

    store.createTest.mockRejectedValue(new Error(errorMessage));
    store.error = errorMessage; // Simulate store error being set by action

    await wrapper.find('input#test-name').setValue(testData.name);
    // No need to set other fields if name is enough to trigger submission attempt
    await wrapper.find('form').trigger('submit.prevent');

    expect(store.createTest).toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(wrapper.vm.error).toBe(errorMessage);
    expect(wrapper.find('.bg-red-100').text()).toContain(errorMessage);
  });

  it('shows loading state during submission', async () => {
    const wrapper = mount(TestCreateView);
    store.createTest = vi.fn(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));

    await wrapper.find('input#test-name').setValue('Loading Test Def');
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.find('button[type="submit"]').text()).toContain('Creating...');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
  });
});
