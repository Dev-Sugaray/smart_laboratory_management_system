import { defineStore } from 'pinia';
import api from '../services/api';

export const useSampleTestStore = defineStore('sampleTests', {
  state: () => ({
    sampleTestsForCurrentSample: [], // For SampleDetailView
    allSampleTestRequests: [],     // For TestQueueView
    currentSampleTest: null,       // For SampleTestDetailView
    loading: false,
    error: null,
  }),
  actions: {
    async fetchSampleTestsForSample(sampleId) {
      this.loading = true;
      this.error = null;
      try {
        const data = await api.get(`/samples/${sampleId}/tests`);
        this.sampleTestsForCurrentSample = data;
      } catch (error) {
        this.error = error.message;
        this.sampleTestsForCurrentSample = []; // Clear on error
      } finally {
        this.loading = false;
      }
    },

    async fetchAllSampleTestRequests(filters = {}) { // filters can be { status, test_id, user_id, sample_id }
      this.loading = true;
      this.error = null;
      try {
        // Basic query string builder, can be enhanced
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `/sample-tests?${queryParams}` : '/sample-tests';
        const data = await api.get(url);
        this.allSampleTestRequests = data;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchSampleTestDetails(id) {
      this.loading = true;
      this.error = null;
      this.currentSampleTest = null;
      try {
        const data = await api.get(`/sample-tests/${id}`);
        this.currentSampleTest = data;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async requestTestsForSample(sampleId, testRequestData) { // { test_ids: [], experiment_id: (opt) }
      // Loading state for this specific action might be handled in component
      try {
        const response = await api.post(`/samples/${sampleId}/tests`, testRequestData);
        // After requesting, refresh the list for the current sample
        await this.fetchSampleTestsForSample(sampleId);
        return response; // Return response which might contain created entries
      } catch (error) {
        this.error = error.message; // Set store error for general feedback if needed
        throw error; // Re-throw for component to handle specific form errors
      }
    },

    async batchRequestTests(batchRequestData) { // { sample_ids, test_ids, experiment_id }
      // Loading state might be handled in component
      try {
        const response = await api.post('/samples/batch-request-tests', batchRequestData);
        // After batch requesting, it's hard to know which specific list to refresh.
        // Maybe a general notification or the component calling this handles subsequent fetches.
        // For now, just return the response.
        return response;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async updateSampleTest(sampleTestId, updateData) {
      try {
        await api.put(`/sample-tests/${sampleTestId}`, updateData);
        // Refresh current view if it's this sample test
        if (this.currentSampleTest && this.currentSampleTest.id === Number(sampleTestId)) {
          await this.fetchSampleTestDetails(sampleTestId);
        }
        // Potentially refresh lists too, depending on where this is called from
        // For example, if called from TestQueueView, refresh allSampleTestRequests
        // If called from SampleDetailView (tests tab), refresh sampleTestsForCurrentSample
        return true;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deleteSampleTest(sampleTestId) {
      // This action might be used carefully, e.g., only for 'Pending' requests
      try {
        await api.delete(`/sample-tests/${sampleTestId}`);
        // Remove from local lists if present
        this.allSampleTestRequests = this.allSampleTestRequests.filter(st => st.id !== sampleTestId);
        this.sampleTestsForCurrentSample = this.sampleTestsForCurrentSample.filter(st => st.id !== sampleTestId); // Assuming 'id' is sample_test_id here
         if (this.currentSampleTest && this.currentSampleTest.id === sampleTestId) {
          this.currentSampleTest = null;
        }
        return true;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },
  },
});
