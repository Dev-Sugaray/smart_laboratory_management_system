import { defineStore } from 'pinia';
import api from '../services/api';

export const useTestStore = defineStore('tests', {
  state: () => ({
    tests: [],
    currentTest: null,
    samplesForCurrentTestDefinition: [], // New state property for analysis
    loading: false,
    error: null,
  }),
  getters: {
    // Example: testCount: (state) => state.tests.length,
    samplesForAnalysis: (state) => state.samplesForCurrentTestDefinition,
  },
  actions: {
    async fetchTests() {
      this.loading = true;
      this.error = null;
      try {
        const data = await api.get('/tests');
        this.tests = data;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchTest(id) {
      this.loading = true;
      this.error = null;
      this.currentTest = null;
      try {
        const data = await api.get(`/tests/${id}`);
        this.currentTest = data;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async createTest(testData) {
      try {
        await api.post('/tests', testData);
        await this.fetchTests(); // Refresh the list
        return true; // Indicate success
      } catch (error) {
        this.error = error.message;
        throw error; // Re-throw for component to handle
      }
    },

    async updateTest(id, data) {
      try {
        await api.put(`/tests/${id}`, data);
        if (this.currentTest && this.currentTest.id === Number(id)) {
            await this.fetchTest(id); // Refresh current if it's the one being edited
        }
        await this.fetchTests(); // Refresh the list as well
        return true;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deleteTest(id) {
      try {
        await api.delete(`/tests/${id}`);
        this.tests = this.tests.filter(test => test.id !== id);
        if (this.currentTest && this.currentTest.id === id) {
          this.currentTest = null;
        }
        return true;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async fetchSamplesForTestDefinition(testId) {
      // Using a specific loading flag or a more generic one if preferred
      // For simplicity, let's assume a component-level loading state or use the global one carefully.
      // this.loading = true;
      this.error = null; // Clear previous errors specific to this action
      try {
        const data = await api.get(`/tests/${testId}/samples`);
        this.samplesForCurrentTestDefinition = data;
      } catch (error) {
        console.error(`Error fetching samples for test definition ${testId}:`, error);
        this.error = error.message; // Set error state
        this.samplesForCurrentTestDefinition = []; // Clear data on error
      } finally {
        // this.loading = false;
      }
    },
  },
});
