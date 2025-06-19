import { setActivePinia, createPinia } from 'pinia';
import { useExperimentStore } from './experiments'; // Adjust path as needed
import api from '../services/api'; // Adjust path as needed
import { vi } from 'vitest';

// Mock the api service
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Pinia Store: Experiments', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset mocks before each test
    api.get.mockClear();
    api.post.mockClear();
    api.put.mockClear();
    api.delete.mockClear();
  });

  it('fetches experiments successfully', async () => {
    const store = useExperimentStore();
    const mockExperiments = [{ id: 1, name: 'Exp 1' }, { id: 2, name: 'Exp 2' }];
    api.get.mockResolvedValue(mockExperiments);

    await store.fetchExperiments();

    expect(store.experiments).toEqual(mockExperiments);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith('/experiments');
  });

  it('handles error when fetching experiments', async () => {
    const store = useExperimentStore();
    api.get.mockRejectedValue(new Error('Network Error'));

    await store.fetchExperiments();

    expect(store.experiments).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBe('Network Error');
  });

  it('fetches a single experiment successfully', async () => {
    const store = useExperimentStore();
    const mockExperiment = { id: 1, name: 'Exp 1 Details' };
    api.get.mockResolvedValue(mockExperiment);

    await store.fetchExperiment(1);

    expect(store.currentExperiment).toEqual(mockExperiment);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith('/experiments/1');
  });

  it('creates an experiment and refreshes the list', async () => {
    const store = useExperimentStore();
    const newExperimentData = { name: 'New Exp', description: 'Desc' };
    const createdExperiment = { id: 3, ...newExperimentData };
    api.post.mockResolvedValue(createdExperiment); // Mock for create
    api.get.mockResolvedValue([]); // Mock for fetchExperiments after create

    const success = await store.createExperiment(newExperimentData);

    expect(success).toBe(true);
    expect(api.post).toHaveBeenCalledWith('/experiments', newExperimentData);
    expect(api.get).toHaveBeenCalledWith('/experiments'); // fetchExperiments called
    // Optionally check if store.experiments is updated if mock for fetch was more specific
  });

  it('updates an experiment and refreshes current/list', async () => {
    const store = useExperimentStore();
    const experimentId = 1;
    const updateData = { name: 'Updated Exp Name' };
    const updatedExperiment = { id: experimentId, name: 'Updated Exp Name', description: 'Old Desc' };

    api.put.mockResolvedValue({ message: 'Update successful' }); // Mock for update
    api.get.mockImplementation((url) => { // Mock for subsequent fetches
        if (url === `/experiments/${experimentId}`) return Promise.resolve(updatedExperiment);
        if (url === '/experiments') return Promise.resolve([updatedExperiment]);
        return Promise.reject(new Error('Unknown GET url'));
    });
    store.currentExperiment = { id: experimentId, name: 'Old Name', description: 'Old Desc'};


    const success = await store.updateExperiment(experimentId, updateData);

    expect(success).toBe(true);
    expect(api.put).toHaveBeenCalledWith(`/experiments/${experimentId}`, updateData);
    expect(api.get).toHaveBeenCalledWith(`/experiments/${experimentId}`); // fetchExperiment called
    expect(api.get).toHaveBeenCalledWith('/experiments'); // fetchExperiments also called
    expect(store.currentExperiment).toEqual(updatedExperiment);
  });

  it('deletes an experiment and removes it from the list', async () => {
    const store = useExperimentStore();
    const experimentIdToDelete = 2;
    store.experiments = [{ id: 1, name: 'Exp 1'}, { id: experimentIdToDelete, name: 'Exp to Delete'}];
    store.currentExperiment = { id: experimentIdToDelete, name: 'Exp to Delete'};
    api.delete.mockResolvedValue({ message: 'Delete successful' });

    const success = await store.deleteExperiment(experimentIdToDelete);

    expect(success).toBe(true);
    expect(api.delete).toHaveBeenCalledWith(`/experiments/${experimentIdToDelete}`);
    expect(store.experiments.find(exp => exp.id === experimentIdToDelete)).toBeUndefined();
    expect(store.currentExperiment).toBeNull();
  });

  it('fetches experiment tests successfully', async () => {
    const store = useExperimentStore();
    const experimentId = 1;
    const mockTests = [{ id: 10, name: 'Test A' }, { id: 11, name: 'Test B' }];
    api.get.mockResolvedValue(mockTests);

    await store.fetchExperimentTests(experimentId);

    expect(store.experimentTests).toEqual(mockTests);
    // expect(store.loading).toBe(false); // Assuming specific loading for this if added
    expect(store.error).toBeNull(); // Or specific error property
    expect(api.get).toHaveBeenCalledWith(`/experiments/${experimentId}/tests`);
  });

  it('adds a test to an experiment and refreshes tests', async () => {
    const store = useExperimentStore();
    const experimentId = 1;
    const testIdToAdd = 10;
    api.post.mockResolvedValue({ message: 'Test added' });
    api.get.mockResolvedValue([]); // For fetchExperimentTests

    const success = await store.addTestToExperiment(experimentId, testIdToAdd);

    expect(success).toBe(true);
    expect(api.post).toHaveBeenCalledWith(`/experiments/${experimentId}/tests`, { test_id: testIdToAdd });
    expect(api.get).toHaveBeenCalledWith(`/experiments/${experimentId}/tests`);
  });

  it('removes a test from an experiment and refreshes tests', async () => {
    const store = useExperimentStore();
    const experimentId = 1;
    const testIdToRemove = 10;
    api.delete.mockResolvedValue({ message: 'Test removed' });
    api.get.mockResolvedValue([]); // For fetchExperimentTests

    const success = await store.removeTestFromExperiment(experimentId, testIdToRemove);

    expect(success).toBe(true);
    expect(api.delete).toHaveBeenCalledWith(`/experiments/${experimentId}/tests/${testIdToRemove}`);
    expect(api.get).toHaveBeenCalledWith(`/experiments/${experimentId}/tests`);
  });

});
