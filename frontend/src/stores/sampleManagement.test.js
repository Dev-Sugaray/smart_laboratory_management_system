import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSampleManagementStore } from './sampleManagement';
import { useAuthStore } from './auth';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Sample Management Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Initialize auth store with a mock token
    const authStore = useAuthStore();
    authStore.token = 'mock-test-token';
    authStore.user = { id: 1, username: 'testuser', role: 'administrator' }; // Example user
    authStore.isAuthenticated = true;

    // Reset store state before each test for sampleManagementStore
    const sampleManagementStore = useSampleManagementStore();
    sampleManagementStore.$reset(); // Resets to initial state

    mockFetch.mockClear(); // Clear fetch history/mocks
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clears all mocks including global fetch
  });

  describe('Sample Types Actions', () => {
    it('fetchSampleTypes successfully fetches and updates state', async () => {
      const store = useSampleManagementStore();
      const mockSampleTypes = [{ id: 1, name: 'Blood', description: 'Whole blood' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSampleTypes),
      });

      await store.fetchSampleTypes();

      expect(mockFetch).toHaveBeenCalledWith('/api/sample-types', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-test-token',
        },
      });
      expect(store.sampleTypes).toEqual(mockSampleTypes);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('fetchSampleTypes handles API error', async () => {
      const store = useSampleManagementStore();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server Error' }),
      });

      try {
        await store.fetchSampleTypes();
      } catch (e) {
        // Error is expected to be thrown
      }

      expect(store.error).toBe('Server Error');
      expect(store.sampleTypes).toEqual([]);
      expect(store.isLoading).toBe(false);
    });

    it('fetchSampleTypes handles network error', async () => {
        const store = useSampleManagementStore();
        mockFetch.mockRejectedValueOnce(new Error('Network failure'));

        try {
          await store.fetchSampleTypes();
        } catch (e) {
          // error expected
        }
        expect(store.error).toBe('Network failure');
        expect(store.sampleTypes).toEqual([]);
        expect(store.isLoading).toBe(false);
    });


    it('addSampleType successfully posts data and refreshes list', async () => {
      const store = useSampleManagementStore();
      const newSampleTypeData = { name: 'Plasma', description: 'Blood plasma' };
      const createdSampleType = { id: 2, ...newSampleTypeData };
      const existingSampleTypes = [{ id: 1, name: 'Blood', description: 'Whole blood' }];

      // Mock for POST request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(createdSampleType),
      });
      // Mock for subsequent fetchSampleTypes call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([ ...existingSampleTypes, createdSampleType]),
      });

      const result = await store.addSampleType(newSampleTypeData);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/sample-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-test-token',
        },
        body: JSON.stringify(newSampleTypeData),
      });
      expect(mockFetch).toHaveBeenCalledTimes(2); // POST and then GET
      expect(store.sampleTypes.some(st => st.id === 2)).toBe(true); // Check if new type is in list
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('addSampleType handles API error', async () => {
      const store = useSampleManagementStore();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409, // e.g. Conflict, duplicate name
        json: () => Promise.resolve({ error: 'Name already exists' }),
      });

      try {
        await store.addSampleType({ name: 'Duplicate', description: '' });
      } catch (e) {
        expect(e.message).toBe('Name already exists');
      }
      expect(store.error).toBe('Name already exists');
      expect(store.isLoading).toBe(false);
    });

    it('updateSampleType successfully PUTs data and refreshes list', async () => {
      const store = useSampleManagementStore();
      const sampleTypeId = 1;
      const updatedData = { name: 'Blood Updated', description: 'Whole blood (updated)' };
      const updatedSampleTypeFromServer = { id: sampleTypeId, ...updatedData };

      mockFetch.mockResolvedValueOnce({ // For PUT
        ok: true,
        json: () => Promise.resolve(updatedSampleTypeFromServer),
      });
      mockFetch.mockResolvedValueOnce({ // For subsequent fetchSampleTypes
        ok: true,
        json: () => Promise.resolve([updatedSampleTypeFromServer]),
      });

      const result = await store.updateSampleType(sampleTypeId, updatedData);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(`/api/sample-types/${sampleTypeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-test-token',
        },
        body: JSON.stringify(updatedData),
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(store.sampleTypes[0]).toEqual(updatedSampleTypeFromServer);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('updateSampleType handles API error', async () => {
      const store = useSampleManagementStore();
      const sampleTypeId = 1;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not Found' }),
      });

      try {
        await store.updateSampleType(sampleTypeId, { name: 'NotFound' });
      } catch (e) {
        expect(e.message).toBe('Not Found');
      }
      expect(store.error).toBe('Not Found');
      expect(store.isLoading).toBe(false);
    });

    it('deleteSampleType successfully DELETES data and refreshes list', async () => {
      const store = useSampleManagementStore();
      const sampleTypeId = 1;

      mockFetch.mockResolvedValueOnce({ // For DELETE
        ok: true,
        // status: 200 or 204, json might not be called if 204
        // For testing, assume 200 with a message or rely on ok status
        json: () => Promise.resolve({ message: 'Deleted successfully' })
      });
      mockFetch.mockResolvedValueOnce({ // For subsequent fetchSampleTypes
        ok: true,
        json: () => Promise.resolve([]), // Empty list after deletion
      });

      const result = await store.deleteSampleType(sampleTypeId);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(`/api/sample-types/${sampleTypeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock-test-token',
        },
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(store.sampleTypes).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('deleteSampleType handles API error (e.g., 409 Conflict)', async () => {
      const store = useSampleManagementStore();
      const sampleTypeId = 1;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Cannot delete, sample type in use' }),
      });

      try {
        await store.deleteSampleType(sampleTypeId);
      } catch (e) {
        expect(e.message).toBe('Cannot delete, sample type in use');
      }
      expect(store.error).toBe('Cannot delete, sample type in use');
      expect(store.isLoading).toBe(false);
    });
  });

  describe('Sources Actions', () => {
    it('fetchSources successfully fetches and updates state', async () => {
      const store = useSampleManagementStore();
      const mockSources = [{ id: 1, name: 'Clinical Trial A', description: 'Trial A samples' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSources),
      });
      await store.fetchSources();
      expect(mockFetch).toHaveBeenCalledWith('/api/sources', expect.any(Object));
      expect(store.sources).toEqual(mockSources);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('fetchSources handles API error', async () => {
      const store = useSampleManagementStore();
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Server Error' }) });
      try { await store.fetchSources(); } catch (e) {}
      expect(store.error).toBe('Server Error');
      expect(store.isLoading).toBe(false);
    });

    it('addSource successfully POSTs data and refreshes list', async () => {
      const store = useSampleManagementStore();
      const newSourceData = { name: 'New Source', description: 'A test source' };
      const createdSource = { id: 1, ...newSourceData };
      mockFetch.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve(createdSource) }); // POST
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([createdSource]) }); // GET

      const result = await store.addSource(newSourceData);
      expect(result).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/sources');
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
      expect(store.sources[0]).toEqual(createdSource);
      expect(store.isLoading).toBe(false);
    });

    it('updateSource successfully PUTs data and refreshes list', async () => {
      const store = useSampleManagementStore();
      const sourceId = 1;
      const updatedData = { name: 'Updated Source', description: 'Updated desc' };
      const updatedSourceFromServer = { id: sourceId, ...updatedData };
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedSourceFromServer) }); // PUT
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([updatedSourceFromServer]) }); // GET

      const result = await store.updateSource(sourceId, updatedData);
      expect(result).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe(`/api/sources/${sourceId}`);
      expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
      expect(store.sources[0]).toEqual(updatedSourceFromServer);
    });

    it('deleteSource successfully DELETES data and refreshes list', async () => {
      const store = useSampleManagementStore();
      const sourceId = 1;
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // DELETE
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // GET

      const result = await store.deleteSource(sourceId);
      expect(result).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe(`/api/sources/${sourceId}`);
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
      expect(store.sources).toEqual([]);
    });
  });

  describe('Storage Locations Actions', () => {
    it('fetchStorageLocations successfully fetches and updates state', async () => {
      const store = useSampleManagementStore();
      const mockLocations = [{ id: 1, name: 'Freezer A', temperature: -20, capacity: 100, current_load: 10 }];
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockLocations) });
      await store.fetchStorageLocations();
      expect(mockFetch).toHaveBeenCalledWith('/api/storage-locations', expect.any(Object));
      expect(store.storageLocations).toEqual(mockLocations);
      expect(store.isLoading).toBe(false);
    });

    it('addStorageLocation successfully POSTs data and refreshes list', async () => {
      const store = useSampleManagementStore();
      const newLocationData = { name: 'Shelf B', temperature: 20, capacity: 200 };
      const createdLocation = { id: 1, ...newLocationData, current_load: 0 };
      mockFetch.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve(createdLocation) }); // POST
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([createdLocation]) }); // GET

      const result = await store.addStorageLocation(newLocationData);
      expect(result).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/storage-locations');
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
      expect(store.storageLocations[0]).toEqual(createdLocation);
    });

    it('updateStorageLocation successfully PUTs data and refreshes list', async () => {
      const store = useSampleManagementStore();
      const locationId = 1;
      const updatedData = { name: 'Shelf B Updated', temperature: 18, capacity: 250 };
      const updatedLocationFromServer = { id: locationId, ...updatedData, current_load: 0 };
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedLocationFromServer) }); // PUT
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([updatedLocationFromServer]) }); // GET

      const result = await store.updateStorageLocation(locationId, updatedData);
      expect(result).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe(`/api/storage-locations/${locationId}`);
      expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
      expect(store.storageLocations[0]).toEqual(updatedLocationFromServer);
    });

    it('deleteStorageLocation successfully DELETES data and refreshes list', async () => {
      const store = useSampleManagementStore();
      const locationId = 1;
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // DELETE
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // GET

      const result = await store.deleteStorageLocation(locationId);
      expect(result).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe(`/api/storage-locations/${locationId}`);
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
      expect(store.storageLocations).toEqual([]);
    });
  });

  describe('Samples Actions', () => {
    it('fetchSamples successfully fetches and updates state', async () => {
      const store = useSampleManagementStore();
      const mockSamples = { data: [{ id: 1, unique_sample_id: 'SAMP-001' }], pagination: {} };
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSamples) });
      await store.fetchSamples();
      expect(mockFetch).toHaveBeenCalledWith('/api/samples?limit=10&offset=0', expect.any(Object));
      expect(store.samples).toEqual(mockSamples.data);
      expect(store.isLoading).toBe(false);
    });

    it('fetchSampleDetails successfully fetches and updates currentSample', async () => {
      const store = useSampleManagementStore();
      const sampleId = 1;
      const mockSampleDetail = { id: sampleId, unique_sample_id: 'SAMP-001', notes: 'Test Detail' };
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSampleDetail) });

      const result = await store.fetchSampleDetails(sampleId);
      expect(result).toEqual(mockSampleDetail);
      expect(mockFetch).toHaveBeenCalledWith(`/api/samples/${sampleId}`, expect.any(Object));
      expect(store.currentSample).toEqual(mockSampleDetail);
      expect(store.isLoadingDetails).toBe(false); // Check specific loading flag
    });

    it('registerSample successfully POSTs data and updates currentSample', async () => {
      const store = useSampleManagementStore();
      const sampleData = { sample_type_id: 1, source_id: 1, collection_date: '2023-01-01', current_status: 'Registered' };
      const registeredSample = { id: 1, unique_sample_id: 'SAMP-001', ...sampleData };
      mockFetch.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve(registeredSample) });

      const result = await store.registerSample(sampleData);
      expect(result).toEqual(registeredSample);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/samples/register');
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
      expect(store.currentSample).toEqual(registeredSample);
      expect(store.isLoading).toBe(false); // Global isLoading for this action
    });

    it('fetchSampleChainOfCustody successfully fetches and updates state', async () => {
        const store = useSampleManagementStore();
        const sampleId = 1;
        const mockCoC = [{ id: 1, action: 'Registered', sample_id: sampleId }];
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCoC) });

        await store.fetchSampleChainOfCustody(sampleId);
        expect(mockFetch).toHaveBeenCalledWith(`/api/samples/${sampleId}/chainofcustody`, expect.any(Object));
        expect(store.currentSampleCoC).toEqual(mockCoC);
        expect(store.isLoadingCoC).toBe(false);
    });

    it('updateSampleStatus successfully PUTs data and refreshes details and CoC', async () => {
        const store = useSampleManagementStore();
        const sampleId = 1;
        const statusData = { current_status: 'In Storage', storage_location_id: 1, notes: 'Stored' };
        const updatedSample = { id: sampleId, ...statusData, unique_sample_id: 'SAMP-001' };
        const mockCoC = [{ id: 2, action: 'Status Updated to In Storage', sample_id: sampleId }];

        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedSample) }); // For PUT /status
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedSample) }); // For fetchSampleDetails
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCoC) }); // For fetchSampleChainOfCustody

        const result = await store.updateSampleStatus({ sampleId, statusData });
        expect(result).toBe(true);
        expect(mockFetch.mock.calls[0][0]).toBe(`/api/samples/${sampleId}/status`);
        expect(mockFetch.mock.calls[0][1].method).toBe('PUT');

        expect(mockFetch.mock.calls[1][0]).toBe(`/api/samples/${sampleId}`); // fetchSampleDetails call
        expect(mockFetch.mock.calls[2][0]).toBe(`/api/samples/${sampleId}/chainofcustody`); // fetchSampleChainOfCustody call

        expect(store.currentSample).toEqual(updatedSample);
        expect(store.currentSampleCoC).toEqual(mockCoC);
        expect(store.isLoading).toBe(false); // Global isLoading for this action
    });
  });
});
