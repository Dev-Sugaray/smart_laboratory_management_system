import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSampleTestStore } from '../stores/sampleTests';
import TestQueueView from './TestQueueView.vue';
import { nextTick } from 'vue';

// Mock Vue Router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  }
}));

describe('TestQueueView.vue', () => {
  let store;

  const mockSampleTestRequests = [
    { id: 1, unique_sample_id: 'SAMP001', test_name: 'Glucose Test', status: 'Pending', requested_by_username: 'doc_brown', requested_at: new Date().toISOString(), assigned_to_username: null },
    { id: 2, unique_sample_id: 'SAMP002', test_name: 'Lipid Panel', status: 'Completed', requested_by_username: 'marty_mcfly', requested_at: new Date().toISOString(), assigned_to_username: 'lab_tech1' },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSampleTestStore();
    store.fetchAllSampleTestRequests = vi.fn();
    store.allSampleTestRequests = [];
    store.loading = false;
    store.error = null;
  });

  it('renders correctly when loading', () => {
    store.loading = true;
    const wrapper = mount(TestQueueView);
    expect(wrapper.text()).toContain('Loading all sample test requests...');
  });

  it('renders error message if fetch fails', async () => {
    store.error = 'Failed to load queue';
    const wrapper = mount(TestQueueView);
    await nextTick();
    expect(wrapper.find('.bg-red-100').exists()).toBe(true);
    expect(wrapper.text()).toContain('Error loading data: Failed to load queue');
  });

  it('renders "No sample test requests found" when list is empty', () => {
    store.allSampleTestRequests = [];
    store.loading = false;
    const wrapper = mount(TestQueueView);
    expect(wrapper.text()).toContain('No sample test requests found matching your criteria.');
  });

  it('displays a list of sample test requests', async () => {
    store.allSampleTestRequests = mockSampleTestRequests;
    store.loading = false;
    const wrapper = mount(TestQueueView);
    await nextTick();

    const rows = wrapper.findAll('table tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].text()).toContain('SAMP001');
    expect(rows[0].text()).toContain('Glucose Test');
    expect(rows[0].text()).toContain('Pending');
    expect(rows[1].text()).toContain('SAMP002');
    expect(rows[1].text()).toContain('Lipid Panel');
    expect(rows[1].text()).toContain('Completed');
  });

  it('calls fetchAllSampleTestRequests on mount', () => {
    mount(TestQueueView);
    expect(store.fetchAllSampleTestRequests).toHaveBeenCalledTimes(1);
    expect(store.fetchAllSampleTestRequests).toHaveBeenCalledWith({}); // Default empty filters
  });

  it('filters data when filter input changes', async () => {
    const wrapper = mount(TestQueueView);
    // Wait for initial fetch
    await nextTick();
    store.fetchAllSampleTestRequests.mockClear(); // Clear initial call

    const statusSelect = wrapper.find('select#filter-status');
    await statusSelect.setValue('Pending');
    // await nextTick(); // Allow debounced function to trigger or direct call if not debounced for test
    // Forcing direct call for test simplicity if debounce is an issue
    wrapper.vm.applyFilters(); // Assuming applyFilters is exposed or called by @change

    expect(store.fetchAllSampleTestRequests).toHaveBeenCalledTimes(1);
    expect(store.fetchAllSampleTestRequests).toHaveBeenCalledWith(expect.objectContaining({ status: 'Pending' }));
  });

  it('resets filters and refetches data', async () => {
    const wrapper = mount(TestQueueView);
    await nextTick();
    store.fetchAllSampleTestRequests.mockClear();

    // Set a filter
    wrapper.vm.filters.status = 'Completed'; // Directly manipulate for test
    wrapper.vm.applyFilters();
    expect(store.fetchAllSampleTestRequests).toHaveBeenCalledWith(expect.objectContaining({ status: 'Completed' }));

    store.fetchAllSampleTestRequests.mockClear(); // Clear for reset call
    await wrapper.find('button.bg-gray-300').trigger('click'); // Reset Filters button

    expect(wrapper.vm.filters.status).toBe('');
    expect(store.fetchAllSampleTestRequests).toHaveBeenCalledTimes(1);
    expect(store.fetchAllSampleTestRequests).toHaveBeenCalledWith({}); // Empty filters
  });

  it('each row has a View/Update link to the correct sample test detail', async () => {
    store.allSampleTestRequests = mockSampleTestRequests;
    const wrapper = mount(TestQueueView);
    await nextTick();

    const firstLink = wrapper.find('table tbody tr:first-child a');
    expect(firstLink.attributes('href')).toBe(`/sample-tests/${mockSampleTestRequests[0].id}`);
    const secondLink = wrapper.find('table tbody tr:nth-child(2) a');
    expect(secondLink.attributes('href')).toBe(`/sample-tests/${mockSampleTestRequests[1].id}`);
  });

});
