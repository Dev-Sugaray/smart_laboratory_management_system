import { setActivePinia, createPinia } from 'pinia';
import { useSampleTestStore } from './sampleTests'; // Adjust path
import api from '../services/api'; // Adjust path
import { vi } from 'vitest';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Pinia Store: Sample Tests (sampleTests.js)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.get.mockClear();
    api.post.mockClear();
    api.put.mockClear();
    api.delete.mockClear();
  });

  it('fetches sample tests for a specific sample', async () => {
    const store = useSampleTestStore();
    const sampleId = 1;
    const mockSampleTests = [{ id: 101, test_id: 1, status: 'Pending' }];
    api.get.mockResolvedValue(mockSampleTests);

    await store.fetchSampleTestsForSample(sampleId);

    expect(store.sampleTestsForCurrentSample).toEqual(mockSampleTests);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith(`/samples/${sampleId}/tests`);
  });

  it('fetches all sample test requests (Test Queue)', async () => {
    const store = useSampleTestStore();
    const mockAllRequests = [{ id: 101, sample_id: 1, status: 'Pending' }, { id: 102, sample_id: 2, status: 'Completed' }];
    api.get.mockResolvedValue(mockAllRequests);

    await store.fetchAllSampleTestRequests();

    expect(store.allSampleTestRequests).toEqual(mockAllRequests);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith('/sample-tests');
  });

   it('fetches all sample test requests with filters', async () => {
    const store = useSampleTestStore();
    const filters = { status: 'Pending', test_id: 5 };
    api.get.mockResolvedValue([]);

    await store.fetchAllSampleTestRequests(filters);

    const expectedQuery = new URLSearchParams(filters).toString();
    expect(api.get).toHaveBeenCalledWith(`/sample-tests?${expectedQuery}`);
  });


  it('fetches details for a specific sample test entry', async () => {
    const store = useSampleTestStore();
    const sampleTestId = 101;
    const mockDetail = { id: sampleTestId, sample_id: 1, test_id: 1, status: 'Completed', results: 'Positive' };
    api.get.mockResolvedValue(mockDetail);

    await store.fetchSampleTestDetails(sampleTestId);

    expect(store.currentSampleTest).toEqual(mockDetail);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith(`/sample-tests/${sampleTestId}`);
  });

  it('requests tests for a sample and refreshes the list for that sample', async () => {
    const store = useSampleTestStore();
    const sampleId = 1;
    const testRequestData = { test_ids: [10, 11], experiment_id: 1 };
    const mockResponse = { message: 'Success', created_entries: [{id: 103}, {id: 104}]};
    api.post.mockResolvedValue(mockResponse);
    api.get.mockResolvedValue([]); // For subsequent fetchSampleTestsForSample

    const response = await store.requestTestsForSample(sampleId, testRequestData);

    expect(response).toEqual(mockResponse);
    expect(api.post).toHaveBeenCalledWith(`/samples/${sampleId}/tests`, testRequestData);
    expect(api.get).toHaveBeenCalledWith(`/samples/${sampleId}/tests`); // Refreshed
  });

  it('batch requests tests for multiple samples', async () => {
    const store = useSampleTestStore();
    const batchData = { sample_ids: [1,2], test_ids: [10,11], experiment_id: 1 };
    const mockResponse = { message: 'Batch success', created_entries_count: 4 };
    api.post.mockResolvedValue(mockResponse);

    const response = await store.batchRequestTests(batchData);
    expect(response).toEqual(mockResponse);
    expect(api.post).toHaveBeenCalledWith('/samples/batch-request-tests', batchData);
    // Not expecting specific list refreshes here as per store action comment
  });


  it('updates a sample test entry', async () => {
    const store = useSampleTestStore();
    const sampleTestId = 101;
    const updateData = { status: 'Completed', results: 'Negative' };
    api.put.mockResolvedValue({ message: 'Update successful' });
    // Mock for fetchSampleTestDetails if currentSampleTest matches
    const updatedDetail = { id: sampleTestId, ...updateData };
    api.get.mockResolvedValue(updatedDetail);
    store.currentSampleTest = { id: sampleTestId, status: 'In Progress' }; // Simulate it's current

    const success = await store.updateSampleTest(sampleTestId, updateData);

    expect(success).toBe(true);
    expect(api.put).toHaveBeenCalledWith(`/sample-tests/${sampleTestId}`, updateData);
    expect(api.get).toHaveBeenCalledWith(`/sample-tests/${sampleTestId}`); // Refreshed
    expect(store.currentSampleTest).toEqual(updatedDetail);
  });

  it('deletes a sample test entry and removes from lists', async () => {
    const store = useSampleTestStore();
    const sampleTestIdToDelete = 101;
    store.allSampleTestRequests = [
      { id: sampleTestIdToDelete, sample_id: 1 },
      { id: 102, sample_id: 2 }
    ];
    store.sampleTestsForCurrentSample = [{ id: sampleTestIdToDelete, test_name: 'Test X' }];
    store.currentSampleTest = { id: sampleTestIdToDelete };

    api.delete.mockResolvedValue({ message: 'Delete successful' });

    const success = await store.deleteSampleTest(sampleTestIdToDelete);

    expect(success).toBe(true);
    expect(api.delete).toHaveBeenCalledWith(`/sample-tests/${sampleTestIdToDelete}`);
    expect(store.allSampleTestRequests.find(st => st.id === sampleTestIdToDelete)).toBeUndefined();
    expect(store.sampleTestsForCurrentSample.find(st => st.id === sampleTestIdToDelete)).toBeUndefined();
    expect(store.currentSampleTest).toBeNull();
  });

  it('handles error during an action', async () => {
    const store = useSampleTestStore();
    api.get.mockRejectedValue(new Error('Network Error'));
    await store.fetchAllSampleTestRequests();
    expect(store.error).toBe('Network Error');
  });

});
