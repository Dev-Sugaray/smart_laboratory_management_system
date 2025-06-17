import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTestStore } from '../stores/tests'; // Adjust path
import TestListView from './TestListView.vue'; // Adjust path
import { nextTick } from 'vue';

// Mock Vue Router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(), // Mock push if needed for navigation tests from this view
  }),
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  }
}));

// Mock window.confirm for deletion
global.confirm = vi.fn(() => true);

describe('TestListView.vue', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useTestStore();
    // Mock actions
    store.fetchTests = vi.fn();
    store.deleteTest = vi.fn();
    // Reset state
    store.tests = [];
    store.loading = false;
    store.error = null;
    global.confirm.mockClear();
  });

  it('renders correctly when loading', () => {
    store.loading = true;
    const wrapper = mount(TestListView);
    expect(wrapper.text()).toContain('Loading test definitions...');
  });

  it('renders error message if fetch fails', async () => {
    store.error = 'Network Error fetching tests';
    const wrapper = mount(TestListView);
    await nextTick();
    expect(wrapper.find('.bg-red-100').exists()).toBe(true);
    expect(wrapper.text()).toContain('Error! Network Error fetching tests');
  });

  it('renders "No test definitions found" when list is empty', () => {
    store.tests = [];
    store.loading = false;
    const wrapper = mount(TestListView);
    expect(wrapper.text()).toContain('No test definitions found.');
  });

  it('displays a list of test definitions', async () => {
    store.tests = [
      { id: 1, name: 'Test Def A', description: 'Desc A', protocol: 'Proto A', created_at: new Date().toISOString() },
      { id: 2, name: 'Test Def B', description: 'Desc B', protocol: 'Proto B', created_at: new Date().toISOString() },
    ];
    store.loading = false;
    const wrapper = mount(TestListView);
    await nextTick();

    const rows = wrapper.findAll('table tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].text()).toContain('Test Def A');
    expect(rows[1].text()).toContain('Test Def B');
  });

  it('calls fetchTests on mount', () => {
    mount(TestListView);
    expect(store.fetchTests).toHaveBeenCalledTimes(1);
  });

  it('has a link to create a new test definition', () => {
    const wrapper = mount(TestListView);
    const createButton = wrapper.find('a[href="/tests/new"]');
    expect(createButton.text()).toBe('Create Test Definition');
  });

  it('calls deleteTest action with confirmation', async () => {
    store.tests = [{ id: 1, name: 'Test to Delete', description: 'Desc', protocol: 'P', created_at: '2023-01-01' }];
    store.deleteTest.mockResolvedValue(true);
    const wrapper = mount(TestListView);
    await nextTick();

    await wrapper.find('button.text-red-600').trigger('click');

    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this test definition? This may affect related data like experiment configurations and historical sample test records if ON DELETE CASCADE is not fully effective or if related data is not meant to be deleted.');
    expect(store.deleteTest).toHaveBeenCalledWith(1);
  });

  it('does not call deleteTest if confirmation is cancelled', async () => {
    global.confirm.mockReturnValueOnce(false);
    store.tests = [{ id: 1, name: 'Test Def C', description: 'Desc C', protocol: 'P', created_at: '2023-01-01' }];
    const wrapper = mount(TestListView);
    await nextTick();

    await wrapper.find('button.text-red-600').trigger('click');

    expect(global.confirm).toHaveBeenCalled();
    expect(store.deleteTest).not.toHaveBeenCalled();
  });
});
