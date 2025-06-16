import { defineStore } from 'pinia';
import { useAuthStore } from './auth'; // Import auth store for token
// import api from '@/services/api'; // Assuming an api service module

export const useSampleManagementStore = defineStore('sampleManagement', {
  state: () => ({
    sampleTypes: [],
    sources: [],
    storageLocations: [],
    samples: [],
    currentSample: null, // Or {}
    currentSampleCoC: [],
    isLoading: false, // General loading for lists or primary actions
    isLoadingDetails: false, // Specific for fetching sample details
    isLoadingCoC: false,     // Specific for fetching CoC
    error: null, // Can be a string or an error object
  }),

  getters: {
    getSampleTypeById: (state) => (id) => {
      return state.sampleTypes.find(st => st.id === parseInt(id)); // Ensure type consistency for ID
    },
    getSourceById: (state) => (id) => {
      return state.sources.find(s => s.id === parseInt(id));
    },
    getStorageLocationById: (state) => (id) => {
      return state.storageLocations.find(sl => sl.id === parseInt(id));
    },
    // More getters can be added as needed, e.g., for samples
  },

  actions: {
    // === Sample Types Actions ===
    async fetchSampleTypes() {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] fetchSampleTypes called');

      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        console.error('[Store Action] fetchSampleTypes error:', this.error);
        return;
      }

      try {
        const response = await fetch('/api/sample-types', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        this.sampleTypes = data;
        console.log('[Store Action] fetchSampleTypes completed successfully.');
      } catch (error) {
        this.error = error.message || 'Failed to fetch sample types';
        console.error('[Store Action] fetchSampleTypes error:', error.message);
      } finally {
        this.isLoading = false;
      }
    },

    async addSampleType(sampleTypeData) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] addSampleType called with:', sampleTypeData);

      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        console.error('[Store Action] addSampleType error:', this.error);
        throw new Error(this.error);
      }

      try {
        const response = await fetch('/api/sample-types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify(sampleTypeData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }

        // const newSampleType = await response.json(); // The API returns the created object
        console.log('[Store Action] addSampleType completed successfully.');
        await this.fetchSampleTypes(); // Refresh the list
        return true; // Indicate success
      } catch (error) {
        // Error should already be set if it's from !response.ok
        if (!this.error) this.error = error.message || 'Failed to add sample type';
        console.error('[Store Action] addSampleType error:', this.error);
        throw new Error(this.error); // Re-throw to be caught by component
      } finally {
        this.isLoading = false;
      }
    },

    async updateSampleType(sampleTypeId, sampleTypeData) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] updateSampleType called for ID:', sampleTypeId, 'with:', sampleTypeData);

      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        console.error('[Store Action] updateSampleType error:', this.error);
        throw new Error(this.error);
      }

      try {
        const response = await fetch(`/api/sample-types/${sampleTypeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify(sampleTypeData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }

        // const updatedSampleType = await response.json(); // API returns updated object
        console.log('[Store Action] updateSampleType completed successfully.');
        await this.fetchSampleTypes(); // Refresh the list
        return true; // Indicate success
      } catch (error) {
        if (!this.error) this.error = error.message || 'Failed to update sample type';
        console.error('[Store Action] updateSampleType error:', this.error);
        throw new Error(this.error);
      } finally {
        this.isLoading = false;
      }
    },

    async deleteSampleType(sampleTypeId) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] deleteSampleType called for ID:', sampleTypeId);

      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        console.error('[Store Action] deleteSampleType error:', this.error);
        throw new Error(this.error);
      }

      try {
        const response = await fetch(`/api/sample-types/${sampleTypeId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
          },
        });

        if (!response.ok) {
          // Try to parse error message from backend, which might be JSON
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }

        // Assuming backend returns 200 or 204 on successful deletion
        console.log('[Store Action] deleteSampleType completed successfully.');
        await this.fetchSampleTypes(); // Refresh the list
        return true; // Indicate success
      } catch (error) {
        if (!this.error) this.error = error.message || 'Failed to delete sample type';
        console.error('[Store Action] deleteSampleType error:', this.error);
        throw new Error(this.error);
      } finally {
        this.isLoading = false;
      }
    },

    // === Sources Actions ===
    async fetchSources() {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] fetchSources called');
      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch('/api/sources', {
          headers: { 'Authorization': `Bearer ${authStore.token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        this.sources = await response.json();
      } catch (error) {
        this.error = error.message;
        console.error('[Store Action] fetchSources error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async addSource(sourceData) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch('/api/sources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify(sourceData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }
        await this.fetchSources(); // Refresh list
        return true;
      } catch (error) {
        if(!this.error) this.error = error.message;
        console.error('[Store Action] addSource error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async updateSource(sourceId, sourceData) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch(`/api/sources/${sourceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify(sourceData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }
        await this.fetchSources(); // Refresh list
        return true;
      } catch (error) {
        if(!this.error) this.error = error.message;
        console.error('[Store Action] updateSource error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteSource(sourceId) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch(`/api/sources/${sourceId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authStore.token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }
        await this.fetchSources(); // Refresh list
        return true;
      } catch (error) {
        if(!this.error) this.error = error.message;
        console.error('[Store Action] deleteSource error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // === Storage Locations Actions ===
    async fetchStorageLocations() {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] fetchStorageLocations called');
      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch('/api/storage-locations', {
          headers: { 'Authorization': `Bearer ${authStore.token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        this.storageLocations = await response.json();
      } catch (error) {
        this.error = error.message;
        console.error('[Store Action] fetchStorageLocations error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async addStorageLocation(locationData) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch('/api/storage-locations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify(locationData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }
        await this.fetchStorageLocations(); // Refresh list
        return true;
      } catch (error) {
        if(!this.error) this.error = error.message;
        console.error('[Store Action] addStorageLocation error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async updateStorageLocation(locationId, locationData) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch(`/api/storage-locations/${locationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify(locationData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }
        await this.fetchStorageLocations(); // Refresh list
        return true;
      } catch (error) {
        if(!this.error) this.error = error.message;
        console.error('[Store Action] updateStorageLocation error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteStorageLocation(locationId) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch(`/api/storage-locations/${locationId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authStore.token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }
        await this.fetchStorageLocations(); // Refresh list
        return true;
      } catch (error) {
        if(!this.error) this.error = error.message;
        console.error('[Store Action] deleteStorageLocation error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // === Samples Actions ===
    async fetchSamples(params = { limit: 10, offset: 0 }) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] fetchSamples called with params:', params);

      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`/api/samples?${queryString}`, {
          headers: { 'Authorization': `Bearer ${authStore.token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        this.samples = result.data;
        // this.samplesPagination = result.pagination; // Store pagination info if needed
        console.log('[Store Action] fetchSamples completed successfully.');
      } catch (error) {
        this.error = error.message;
        console.error('[Store Action] fetchSamples error:', error);
        throw error; // Re-throw to be caught by component
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSampleDetails(sampleId) {
      this.isLoadingDetails = true; // Use specific loading flag
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] fetchSampleDetails called for ID:', sampleId);

      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoadingDetails = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch(`/api/samples/${sampleId}`, {
          headers: { 'Authorization': `Bearer ${authStore.token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        this.currentSample = await response.json();
        console.log('[Store Action] fetchSampleDetails completed successfully.');
        return this.currentSample;
      } catch (error) {
        this.error = error.message;
        this.currentSample = null; // Reset on error
        console.error('[Store Action] fetchSampleDetails error:', error);
        throw error; // Re-throw
      } finally {
        this.isLoadingDetails = false; // Use specific loading flag
      }
    },

    async registerSample(sampleData) {
      this.isLoading = true;
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] registerSample called with:', sampleData);

      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }

      try {
        const response = await fetch('/api/samples/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify(sampleData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }

        const newSample = await response.json();
        console.log('[Store Action] registerSample completed successfully:', newSample);
        this.currentSample = newSample;
        return newSample;
      } catch (error) {
        if (!this.error) this.error = error.message || 'Failed to register sample';
        console.error('[Store Action] registerSample error:', this.error);
        throw new Error(this.error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSampleChainOfCustody(sampleId) {
      this.isLoadingCoC = true;
      this.error = null; // Clear general error, or use a specific CoC error state
      const authStore = useAuthStore();
      console.log('[Store Action] fetchSampleChainOfCustody called for ID:', sampleId);

      if (!authStore.token) {
        this.error = 'Authentication token not found for CoC fetch.';
        this.isLoadingCoC = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch(`/api/samples/${sampleId}/chainofcustody`, {
          headers: { 'Authorization': `Bearer ${authStore.token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        this.currentSampleCoC = await response.json();
        console.log('[Store Action] fetchSampleChainOfCustody completed successfully.');
      } catch (error) {
        this.error = error.message; // Or a specific this.cocError
        this.currentSampleCoC = []; // Reset on error
        console.error('[Store Action] fetchSampleChainOfCustody error:', error);
        throw error;
      } finally {
        this.isLoadingCoC = false;
      }
    },

    async updateSampleStatus({ sampleId, statusData }) {
      this.isLoading = true; // Use global loading for this action
      this.error = null;
      const authStore = useAuthStore();
      console.log('[Store Action] updateSampleStatus called for ID:', sampleId, 'with data:', statusData);

      if (!authStore.token) {
        this.error = 'Authentication token not found.';
        this.isLoading = false;
        throw new Error(this.error);
      }
      try {
        const response = await fetch(`/api/samples/${sampleId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`,
          },
          body: JSON.stringify(statusData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.error = errorData.error || `HTTP error! status: ${response.status}`;
          throw new Error(this.error);
        }
        console.log('[Store Action] updateSampleStatus completed successfully.');
        // Refresh details and CoC
        await this.fetchSampleDetails(sampleId);
        await this.fetchSampleChainOfCustody(sampleId);
        return true; // Indicate success
      } catch (error) {
        if (!this.error) this.error = error.message || 'Failed to update sample status';
        console.error('[Store Action] updateSampleStatus error:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
