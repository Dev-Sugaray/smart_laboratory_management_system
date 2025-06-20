import { defineStore } from 'pinia';
import api from '../services/api';

export const useExperimentStore = defineStore('experiments', {
  state: () => ({
    experiments: [],
    currentExperiment: null,
    experimentTests: [], // Tests associated with the currentExperiment
    loading: false,
    error: null,
  }),
  getters: {
    // Pinia automatically infers return types for getters.
    // No explicit getters needed if just accessing state directly,
    // but can define them for computed/derived state.
    // For direct state access, components can use store.experiments, etc.
    // Example getter:
    // experimentCount: (state) => state.experiments.length,
  },
  actions: {
    async fetchExperiments() {
      this.loading = true;
      this.error = null;
      try {
        const data = await api.get('/experiments');
        this.experiments = data;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchExperiment(id) {
      this.loading = true;
      this.error = null;
      this.currentExperiment = null;
      this.experimentTests = [];
      try {
        const data = await api.get(`/experiments/${id}`);
        this.currentExperiment = data;
        // Optionally fetch tests for this experiment right away
        // await this.fetchExperimentTests(id);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async createExperiment(experimentData) {
      // Assuming component handles its own loading state for create form
      try {
        await api.post('/experiments', experimentData);
        await this.fetchExperiments(); // Refresh the list
        return true; // Indicate success
      } catch (error) {
        this.error = error.message; // Store error for potential display
        throw error; // Re-throw for component to handle
      }
    },

    async updateExperiment(id, data) {
      try {
        await api.put(`/experiments/${id}`, data);
        // Update the current experiment in the store or refetch
        // If currentExperiment matches, update it directly or refetch
        if (this.currentExperiment && this.currentExperiment.id === Number(id)) {
            await this.fetchExperiment(id);
        }
        // Also refresh the main list as names might have changed
        await this.fetchExperiments();
        return true;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deleteExperiment(id) {
      try {
        await api.delete(`/experiments/${id}`);
        // Remove from local state
        this.experiments = this.experiments.filter(exp => exp.id !== id);
        if (this.currentExperiment && this.currentExperiment.id === id) {
          this.currentExperiment = null;
          this.experimentTests = [];
        }
        return true;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async fetchExperimentTests(experimentId) {
      // this.loading = true; // Consider a more specific loading flag for tests
      this.error = null; // Or a specific error for tests
      try {
        const data = await api.get(`/experiments/${experimentId}/tests`);
        this.experimentTests = data;
      } catch (error) {
        this.error = error.message; // Or store in a dedicated testError property
      } finally {
        // this.loading = false;
      }
    },

    async addTestToExperiment(experimentId, testId) {
      try {
        await api.post(`/experiments/${experimentId}/tests`, { test_id: testId });
        await this.fetchExperimentTests(experimentId); // Refresh the list
        return true;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async removeTestFromExperiment(experimentId, testId) {
      try {
        await api.delete(`/experiments/${experimentId}/tests/${testId}`);
        await this.fetchExperimentTests(experimentId); // Refresh the list
        return true;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },
  },
});
