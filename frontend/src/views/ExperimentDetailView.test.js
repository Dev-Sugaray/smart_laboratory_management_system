import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia, storeToRefs } from 'pinia';
import { useExperimentStore } from '../stores/experiments';
import { useTestStore } from '../stores/tests'; // For analysis part
import ExperimentDetailView from './ExperimentDetailView.vue';
import { nextTick } from 'vue';

// Mock Vue Router
const mockRouterPush = vi.fn();
const mockRoute = { params: { id: '1' } }; // Default mock route
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: mockRouterPush,
    }),
    useRoute: () => mockRoute, // Use a mutable object for route
    RouterLink: {
        props: ['to'],
        template: '<a :href="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
    }
  };
});

// Mock api service if store actions are not deeply mocked
// vi.mock('../services/api', ...)

describe('ExperimentDetailView.vue', () => {
  let experimentStore;
  let testStore; // For analysis part

  beforeEach(() => {
    setActivePinia(createPinia());
    experimentStore = useExperimentStore();
    testStore = useTestStore(); // For analysis part

    // Reset store state and mocks
    experimentStore.currentExperiment = null;
    experimentStore.experimentTests = [];
    experimentStore.loading = false;
    experimentStore.error = null;
    testStore.samplesForCurrentTestDefinition = []; // For analysis
    testStore.error = null;


    // Mock store actions
    experimentStore.fetchExperiment = vi.fn();
    experimentStore.fetchExperimentTests = vi.fn();
    experimentStore.updateExperiment = vi.fn();
    experimentStore.addTestToExperiment = vi.fn();
    experimentStore.removeTestFromExperiment = vi.fn();
    testStore.fetchSamplesForTestDefinition = vi.fn(); // For analysis

    mockRouterPush.mockClear();
    mockRoute.params.id = '1'; // Reset route param
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExperimentData = {
    id: 1, name: 'Detailed Exp', description: 'Full Desc',
    // Add other fields your component might expect
  };
  const mockExperimentTestsData = [{ id: 10, name: 'Test A' }, { id: 11, name: 'Test B' }];

  async function mountComponentWithData(expData = mockExperimentData, testsData = mockExperimentTestsData) {
    experimentStore.fetchExperiment.mockResolvedValue(undefined); // Simulates action completion
    experimentStore.fetchExperimentTests.mockResolvedValue(undefined);

    // Set store state as if data was fetched
    experimentStore.currentExperiment = expData;
    experimentStore.experimentTests = testsData;
    experimentStore.loading = false;

    const wrapper = mount(ExperimentDetailView, {
      props: { id: String(expData.id) }, // Ensure ID prop is a string like from router
       global: {
         stubs: {
           RouterLink: { template: '<a><slot/></a>'} // More robust stub
         }
       }
    });
    await nextTick(); // Allow component to react to initial state
    return wrapper;
  }

  it('fetches experiment and its tests on mount', async () => {
    experimentStore.fetchExperiment.mockResolvedValue(undefined);
    experimentStore.fetchExperimentTests.mockResolvedValue(undefined);

    mount(ExperimentDetailView, { props: { id: '1' } });

    expect(experimentStore.fetchExperiment).toHaveBeenCalledWith('1');
    expect(experimentStore.fetchExperimentTests).toHaveBeenCalledWith('1');
  });

  it('displays experiment details when loaded', async () => {
    const wrapper = await mountComponentWithData();
    expect(wrapper.find('h1').text()).toContain(mockExperimentData.name);
    expect(wrapper.find('textarea#exp-description').element.value).toBe(mockExperimentData.description);
  });

  it('allows editing and saving experiment details', async () => {
    const wrapper = await mountComponentWithData();
    experimentStore.updateExperiment.mockResolvedValue(true); // Mock successful update

    // Click edit button
    await wrapper.find('button.bg-indigo-500').trigger('click'); // "Edit" button
    expect(wrapper.vm.isEditing).toBe(true);

    // Change values
    const newName = 'Updated Exp Name';
    const newDesc = 'Updated Description';
    await wrapper.find('input#exp-name').setValue(newName);
    await wrapper.find('textarea#exp-description').setValue(newDesc);

    // Click save
    await wrapper.find('button.bg-green-500').trigger('click'); // "Save Changes"

    expect(experimentStore.updateExperiment).toHaveBeenCalledWith(mockExperimentData.id, { name: newName, description: newDesc });
    // In Pinia, actions often update state internally, then other actions (like fetchExperiment) refresh it.
    // Here, updateExperiment calls fetchExperiment and fetchExperiments.
    // We've mocked fetchExperiment, so let's check if it was called after update.
    expect(experimentStore.fetchExperiment).toHaveBeenCalledTimes(2); // Once on mount, once after update
  });

  it('cancels editing and reverts changes', async () => {
    const wrapper = await mountComponentWithData();

    await wrapper.find('button.bg-indigo-500').trigger('click'); // "Edit"

    await wrapper.find('input#exp-name').setValue('Temporary Name');
    await wrapper.find('button.bg-gray-500').trigger('click'); // "Cancel"

    expect(wrapper.vm.isEditing).toBe(false);
    expect(wrapper.find('input#exp-name').element.value).toBe(mockExperimentData.name); // Reverted
  });

  it('displays associated tests', async () => {
    const wrapper = await mountComponentWithData();
    const testItems = wrapper.findAll('ul li');
    expect(testItems.length).toBe(mockExperimentTestsData.length);
    expect(testItems[0].text()).toContain('Test A');
  });

  it('adds a test to the experiment', async () => {
    const wrapper = await mountComponentWithData();
    experimentStore.addTestToExperiment.mockResolvedValue(true);
    const testIdInput = wrapper.find('input#add-test-input');
    await testIdInput.setValue('12');
    await wrapper.find('button.inline-flex').trigger('click'); // "Add Test"

    expect(experimentStore.addTestToExperiment).toHaveBeenCalledWith(String(mockExperimentData.id), 12);
    // fetchExperimentTests is called by addTestToExperiment action
    expect(experimentStore.fetchExperimentTests).toHaveBeenCalledTimes(2);
  });

  it('removes a test from the experiment with confirmation', async () => {
    const wrapper = await mountComponentWithData();
    experimentStore.removeTestFromExperiment.mockResolvedValue(true);

    await wrapper.find('ul li button.text-red-500').trigger('click'); // First "Remove" button

    expect(global.confirm).toHaveBeenCalled();
    expect(experimentStore.removeTestFromExperiment).toHaveBeenCalledWith(String(mockExperimentData.id), mockExperimentTestsData[0].id);
    expect(experimentStore.fetchExperimentTests).toHaveBeenCalledTimes(2);
  });

  // Basic test for analysis section button
  it('analysis section has a load button', async () => {
    const wrapper = await mountComponentWithData();
    expect(wrapper.find('button.bg-gray-200').text()).toContain('Load/Refresh Experiment Analysis');
  });

  // More detailed analysis tests would require mocking testDefStore.fetchSamplesForTestDefinition
  // and verifying the computed stats. This can be complex.
  it('attempts to load analysis data when button is clicked', async () => {
    const wrapper = await mountComponentWithData();
    testStore.fetchSamplesForTestDefinition.mockResolvedValue([]); // Mock to prevent errors

    await wrapper.find('button.bg-gray-200').trigger('click'); // "Load/Refresh Experiment Analysis"

    expect(wrapper.vm.isAnalysisLoading).toBe(false); // Should toggle and complete
    // Check if fetchSamplesForTestDefinition was called for each test in experimentStore.experimentTests
    for (const test of mockExperimentTestsData) {
        expect(testStore.fetchSamplesForTestDefinition).toHaveBeenCalledWith(test.id);
    }
  });

});
