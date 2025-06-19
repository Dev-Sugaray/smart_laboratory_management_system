import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTestStore } from '../stores/tests';
import TestDetailView from './TestDetailView.vue';
import { nextTick } from 'vue';

// Mock Vue Router
const mockRoute = { params: { id: '1' } };
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn() }),
    useRoute: () => mockRoute,
    RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }
  };
});

describe('TestDetailView.vue', () => {
  let store;
  const mockTestData = {
    id: 1, name: 'Detailed Test Def', description: 'Full Desc', protocol: 'Full Protocol Text'
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useTestStore();

    // Reset store state and mocks
    store.currentTest = null;
    store.loading = false;
    store.error = null;
    store.samplesForCurrentTestDefinition = []; // For analysis part

    store.fetchTest = vi.fn();
    store.updateTest = vi.fn();
    store.fetchSamplesForTestDefinition = vi.fn(); // For analysis part

    mockRoute.params.id = '1'; // Reset route param for each test
  });

  async function mountComponentWithData(testData = mockTestData) {
    store.fetchTest.mockResolvedValue(undefined); // Simulates action completion
    store.currentTest = testData; // Pre-fill store state
    store.loading = false;

    const wrapper = mount(TestDetailView, {
      props: { id: String(testData.id) },
      global: { stubs: { RouterLink: true } }
    });
    await nextTick();
    return wrapper;
  }

  it('fetches test definition on mount', async () => {
    store.fetchTest.mockResolvedValue(undefined); // Ensure it's mocked before mount
    mount(TestDetailView, { props: { id: '1' } });
    expect(store.fetchTest).toHaveBeenCalledWith('1');
  });

  it('displays test definition details when loaded', async () => {
    const wrapper = await mountComponentWithData();
    expect(wrapper.find('h1').text()).toContain(mockTestData.name);
    expect(wrapper.find('textarea#test-description').element.value).toBe(mockTestData.description);
    expect(wrapper.find('textarea#test-protocol').element.value).toBe(mockTestData.protocol);
  });

  it('allows editing and saving test definition details', async () => {
    const wrapper = await mountComponentWithData();
    store.updateTest.mockResolvedValue(true);

    await wrapper.find('button.bg-indigo-500').trigger('click'); // Edit button
    expect(wrapper.vm.isEditing).toBe(true);

    const newName = 'Updated Test Def Name';
    const newProtocol = 'Updated Protocol';
    await wrapper.find('input#test-name').setValue(newName);
    await wrapper.find('textarea#test-protocol').setValue(newProtocol);

    await wrapper.find('button.bg-green-500').trigger('click'); // Save Changes

    expect(store.updateTest).toHaveBeenCalledWith(mockTestData.id,
      expect.objectContaining({ name: newName, protocol: newProtocol })
    );
    // Action should refresh currentTest or the list, which updates view.
    // Here, updateTest calls fetchTest.
    expect(store.fetchTest).toHaveBeenCalledTimes(2); // Mount + after update
  });

  it('cancels editing and reverts changes', async () => {
    const wrapper = await mountComponentWithData();

    await wrapper.find('button.bg-indigo-500').trigger('click'); // Edit

    await wrapper.find('input#test-name').setValue('Temp Name');
    await wrapper.find('button.bg-gray-500').trigger('click'); // Cancel

    expect(wrapper.vm.isEditing).toBe(false);
    expect(wrapper.find('input#test-name').element.value).toBe(mockTestData.name); // Reverted
  });

  it('analysis section has a load button', async () => {
    const wrapper = await mountComponentWithData();
    const analysisSection = wrapper.find('.bg-white.shadow-md.rounded-lg.p-6.mt-6'); // Find analysis box
    expect(analysisSection.find('button').text()).toContain('Load/Refresh Analysis Data');
  });

  it('attempts to load analysis data when button is clicked', async () => {
    const wrapper = await mountComponentWithData();
    store.fetchSamplesForTestDefinition.mockResolvedValue([]); // Mock to prevent errors

    const analysisSection = wrapper.find('.bg-white.shadow-md.rounded-lg.p-6.mt-6');
    await analysisSection.find('button').trigger('click'); // "Load/Refresh Analysis Data"

    expect(store.fetchSamplesForTestDefinition).toHaveBeenCalledWith(String(mockTestData.id));
    // Check if loading state was handled, though it's brief with mocks
    // expect(wrapper.vm.isAnalysisLoading).toBe(false); // after completion
  });
});
