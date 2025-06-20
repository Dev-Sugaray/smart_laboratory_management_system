import { defineStore } from 'pinia'; // Assuming Pinia is used, as it's the current Vuex standard
import axios from 'axios'; // Assuming axios is used
import { useAuthStore } from './auth'; // To get the token

// Helper to get auth token
const getAuthHeaders = () => {
  const authStore = useAuthStore();
  return {
    headers: {
      Authorization: `Bearer ${authStore.token}`,
    },
  };
};

export const useInstrumentManagementStore = defineStore('instrumentManagement', {
  state: () => ({
    instruments: [],
    instrument: null, // For fetching a single instrument, or for the form
    loading: false, // General loading for instrument CRUD
    error: null, // General error for instrument CRUD

    instrumentUsageLogs: [],
    usageLogLoading: false,
    usageLogError: null,
  }),
  getters: {
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    allInstruments: (state) => state.instruments,
    currentInstrument: (state) => state.instrument,

    getUsageLogs: (state) => state.instrumentUsageLogs,
    isUsageLogLoading: (state) => state.usageLogLoading,
    getUsageLogError: (state) => state.usageLogError,
  },
  actions: {
    async fetchInstruments() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get('/api/instruments', getAuthHeaders());
        this.instruments = response.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Error fetching instruments.';
        console.error('Error fetching instruments:', error);
      } finally {
        this.loading = false;
      }
    },
    async fetchInstrumentById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`/api/instruments/${id}`, getAuthHeaders());
        this.instrument = response.data;
        return response.data; // Return for immediate use if needed
      } catch (error) {
        this.error = error.response?.data?.message || 'Error fetching instrument.';
        console.error(`Error fetching instrument ${id}:`, error);
        this.instrument = null;
      } finally {
        this.loading = false;
      }
    },
    async registerInstrument(instrumentData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post('/api/instruments', instrumentData, getAuthHeaders());
        // Add to state or re-fetch? For now, re-fetch is simpler.
        await this.fetchInstruments();
        return response.data; // Return new instrument
      } catch (error) {
        this.error = error.response?.data?.message || 'Error registering instrument.';
        console.error('Error registering instrument:', error);
        throw error; // Re-throw to be caught by component
      } finally {
        this.loading = false;
      }
    },
    async updateInstrument(id, instrumentData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.put(`/api/instruments/${id}`, instrumentData, getAuthHeaders());
        // Update in state or re-fetch? For now, re-fetch.
        await this.fetchInstruments();
        if (this.instrument && this.instrument.id === id) {
          this.instrument = response.data; // Update current instrument if it's the one being edited
        }
        return response.data; // Return updated instrument
      } catch (error) {
        this.error = error.response?.data?.message || 'Error updating instrument.';
        console.error(`Error updating instrument ${id}:`, error);
        throw error; // Re-throw
      } finally {
        this.loading = false;
      }
    },
    async deleteInstrument(id) {
      this.loading = true;
      this.error = null;
      try {
        await axios.delete(`/api/instruments/${id}`, getAuthHeaders());
        // Remove from state or re-fetch. Re-fetch is simpler for now.
        await this.fetchInstruments();
      } catch (error) {
        this.error = error.response?.data?.message || 'Error deleting instrument.';
        console.error(`Error deleting instrument ${id}:`, error);
        throw error; // Re-throw
      } finally {
        this.loading = false;
      }
    },
    // Action to clear current instrument, useful for forms
    clearCurrentInstrument() {
      this.instrument = null;
    },

    // --- Instrument Usage Log Actions ---
    async fetchUsageLogs(instrumentId) {
      this.usageLogLoading = true;
      this.usageLogError = null;
      try {
        const response = await axios.get(`/api/instruments/${instrumentId}/usage-logs`, getAuthHeaders());
        this.instrumentUsageLogs = response.data;
      } catch (error) {
        this.usageLogError = error.response?.data?.message || 'Error fetching usage logs.';
        console.error(`Error fetching usage logs for instrument ${instrumentId}:`, error);
        this.instrumentUsageLogs = []; // Clear logs on error
      } finally {
        this.usageLogLoading = false;
      }
    },

    async logInstrumentUsage(usageData) {
      // usageData should include instrument_id, start_time, end_time, notes
      this.usageLogLoading = true; // Or a specific 'submittingUsageLog' state
      this.usageLogError = null;
      try {
        const response = await axios.post(`/api/instruments/${usageData.instrument_id}/usage-logs`, usageData, getAuthHeaders());
        // Optionally add to state directly or re-fetch
        await this.fetchUsageLogs(usageData.instrument_id); // Re-fetch for simplicity
        return response.data;
      } catch (error) {
        this.usageLogError = error.response?.data?.message || 'Error logging instrument usage.';
        console.error('Error logging instrument usage:', error);
        throw error; // Re-throw to be caught by component
      } finally {
        this.usageLogLoading = false;
      }
    },
    clearUsageLogs() {
      this.instrumentUsageLogs = [];
      this.usageLogError = null;
    }
  },
});
