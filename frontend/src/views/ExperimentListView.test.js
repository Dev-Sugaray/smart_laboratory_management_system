import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useExperimentStore } from '../stores/experiments';
import ExperimentListView from './ExperimentListView.vue';
import { nextTick } from 'vue';

// Mock Vue Router
const mockRouterPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  RouterLink: { // Stub RouterLink to render its slot
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  }
}));

// Mock window.confirm
global.confirm = vi.fn(() => true); // Auto-confirm deletions

describe('ExperimentListView.vue', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useExperimentStore();
    store.fetchExperiments = vi.fn(); // Mock the action initially
    store.deleteExperiment = vi.fn();
    store.experiments = []; // Reset state
    store.loading = false;
    store.error = null;
    global.confirm.mockClear();
    mockRouterPush.mockClear();
  });

  it('renders correctly when loading', () => {
    store.loading = true;
    const wrapper = mount(ExperimentListView);
    expect(wrapper.text()).toContain('Loading experiments...');
  });

  it('renders error message if fetch fails', async () => {
    store.error = 'Failed to load experiments';
    const wrapper = mount(ExperimentListView);
    await nextTick(); // Wait for DOM update
    expect(wrapper.find('.bg-red-100').exists()).toBe(true);
    expect(wrapper.text()).toContain('Error! Failed to load experiments');
  });

  it('renders "No experiments found" when list is empty and not loading', () => {
    store.experiments = [];
    store.loading = false;
    const wrapper = mount(ExperimentListView);
    expect(wrapper.text()).toContain('No experiments found.');
  });

  it('displays a list of experiments', async () => {
    store.experiments = [
      { id: 1, name: 'Experiment Alpha', description: 'Alpha desc', created_at: new Date().toISOString() },
      { id: 2, name: 'Experiment Beta', description: 'Beta desc', created_at: new Date().toISOString() },
    ];
    store.loading = false;
    const wrapper = mount(ExperimentListView);
    await nextTick();

    const rows = wrapper.findAll('table tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].text()).toContain('Experiment Alpha');
    expect(rows[1].text()).toContain('Experiment Beta');
  });

  it('calls fetchExperiments on mount', () => {
    mount(ExperimentListView);
    expect(store.fetchExperiments).toHaveBeenCalledTimes(1);
  });

  it('navigates to create experiment page on button click', async () => {
    const wrapper = mount(ExperimentListView);
    // RouterLink is stubbed, so we check the 'to' prop if needed or rely on router mock
    // For this setup, we are checking if the link exists with correct text.
    // Actual navigation is mocked by vue-router mock.
    const createButton = wrapper.find('a[href="/experiments/new"]'); // Based on RouterLink stub
    expect(createButton.text()).toBe('Create Experiment');
    // To test actual navigation, we'd need a more complex router mock or integration test
  });

  it('calls deleteExperiment action with confirmation', async () => {
    store.experiments = [{ id: 1, name: 'Test Exp', description: 'Desc', created_at: '2023-01-01' }];
    store.deleteExperiment.mockResolvedValue(true); // Mock successful deletion
    const wrapper = mount(ExperimentListView);
    await nextTick();

    await wrapper.find('button.text-red-600').trigger('click');

    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this experiment? This may affect related data.');
    expect(store.deleteExperiment).toHaveBeenCalledWith(1);
  });

  it('does not call deleteExperiment if confirmation is cancelled', async () => {
    global.confirm.mockReturnValueOnce(false); // Simulate user clicking "Cancel"
    store.experiments = [{ id: 1, name: 'Test Exp', description: 'Desc', created_at: '2023-01-01' }];
    const wrapper = mount(ExperimentListView);
    await nextTick();

    await wrapper.find('button.text-red-600').trigger('click');

    expect(global.confirm).toHaveBeenCalled();
    expect(store.deleteExperiment).not.toHaveBeenCalled();
  });
   it('navigates to experiment detail view on clicking experiment name', async () => {
    store.experiments = [{ id: 1, name: 'Clickable Exp', description: 'Desc', created_at: '2023-01-01' }];
    const wrapper = mount(ExperimentListView);
    await nextTick();

    const link = wrapper.find('table tbody tr td a'); // First link in table (experiment name)
    expect(link.attributes('href')).toBe('/experiments/1');
    // Actual navigation is mocked. If you need to test the router.push call,
    // you might need to trigger click on RouterLink's child if it's not directly on <a>
    // or use a test setup that properly handles RouterLink clicks.
  });
});
