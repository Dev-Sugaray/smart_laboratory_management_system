import { setActivePinia, createPinia } from 'pinia';
import { useTestStore } from './tests'; // Adjust path as needed
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

describe('Pinia Store: Test Definitions (tests.js)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset mocks before each test
    api.get.mockClear();
    api.post.mockClear();
    api.put.mockClear();
    api.delete.mockClear();
  });

  it('fetches test definitions successfully', async () => {
    const store = useTestStore();
    const mockTests = [{ id: 1, name: 'Test Def 1' }, { id: 2, name: 'Test Def 2' }];
    api.get.mockResolvedValue(mockTests);

    await store.fetchTests();

    expect(store.tests).toEqual(mockTests);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith('/tests');
  });

  it('handles error when fetching test definitions', async () => {
    const store = useTestStore();
    api.get.mockRejectedValue(new Error('API Down'));

    await store.fetchTests();

    expect(store.tests).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBe('API Down');
  });

  it('fetches a single test definition successfully', async () => {
    const store = useTestStore();
    const mockTest = { id: 1, name: 'Test Def 1 Details', protocol: 'Do X' };
    api.get.mockResolvedValue(mockTest);

    await store.fetchTest(1);

    expect(store.currentTest).toEqual(mockTest);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith('/tests/1');
  });

  it('creates a test definition and refreshes the list', async () => {
    const store = useTestStore();
    const newTestData = { name: 'New Test Def', description: 'Desc', protocol: 'Proto' };
    const createdTest = { id: 3, ...newTestData };
    api.post.mockResolvedValue(createdTest);
    api.get.mockResolvedValue([]); // Mock for fetchTests after create

    const success = await store.createTest(newTestData);

    expect(success).toBe(true);
    expect(api.post).toHaveBeenCalledWith('/tests', newTestData);
    expect(api.get).toHaveBeenCalledWith('/tests');
  });

  it('updates a test definition and refreshes current/list', async () => {
    const store = useTestStore();
    const testId = 1;
    const updateData = { name: 'Updated Test Def Name' };
    const updatedTest = { id: testId, name: 'Updated Test Def Name', description: 'Old Desc' };

    api.put.mockResolvedValue({ message: 'Update successful' });
    api.get.mockImplementation((url) => {
        if (url === `/tests/${testId}`) return Promise.resolve(updatedTest);
        if (url === '/tests') return Promise.resolve([updatedTest]);
        return Promise.reject(new Error('Unknown GET url'));
    });
    store.currentTest = { id: testId, name: 'Old Name', description: 'Old Desc'};

    const success = await store.updateTest(testId, updateData);

    expect(success).toBe(true);
    expect(api.put).toHaveBeenCalledWith(`/tests/${testId}`, updateData);
    expect(api.get).toHaveBeenCalledWith(`/tests/${testId}`);
    expect(api.get).toHaveBeenCalledWith('/tests');
    expect(store.currentTest).toEqual(updatedTest);
  });

  it('deletes a test definition and removes it from the list', async () => {
    const store = useTestStore();
    const testIdToDelete = 2;
    store.tests = [{ id: 1, name: 'Test Def 1'}, { id: testIdToDelete, name: 'Test Def to Delete'}];
    store.currentTest = { id: testIdToDelete, name: 'Test Def to Delete'};
    api.delete.mockResolvedValue({ message: 'Delete successful' });

    const success = await store.deleteTest(testIdToDelete);

    expect(success).toBe(true);
    expect(api.delete).toHaveBeenCalledWith(`/tests/${testIdToDelete}`);
    expect(store.tests.find(test => test.id === testIdToDelete)).toBeUndefined();
    expect(store.currentTest).toBeNull();
  });

  it('fetches samples for a test definition successfully', async () => {
    const store = useTestStore();
    const testId = 1;
    const mockSamplesData = [{ sample_id: 100, result: 'Positive'}, {sample_id: 101, result: 'Negative'}];
    api.get.mockResolvedValue(mockSamplesData);

    await store.fetchSamplesForTestDefinition(testId);

    expect(store.samplesForCurrentTestDefinition).toEqual(mockSamplesData);
    expect(store.error).toBeNull();
    expect(api.get).toHaveBeenCalledWith(`/tests/${testId}/samples`);
  });

  it('handles error when fetching samples for a test definition', async () => {
    const store = useTestStore();
    const testId = 1;
    api.get.mockRejectedValue(new Error('Failed to fetch samples'));

    await store.fetchSamplesForTestDefinition(testId);

    expect(store.samplesForCurrentTestDefinition).toEqual([]);
    expect(store.error).toBe('Failed to fetch samples');
  });

});
