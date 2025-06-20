import { defineStore } from 'pinia';
import api from '../services/api'; // Assuming api service for HTTP requests

export const useReagentStore = defineStore('reagents', {
  state: () => ({
    reagentsList: [],
    currentReagent: null,
    lowStockReagents: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    allReagents: (state) => state.reagentsList,
    // Example: getReagentById: (state) => (id) => state.reagentsList.find(r => r.id === id),
    // For more robust fetching if not present, use an action or rely on currentReagent being populated.
    loadedReagent: (state) => state.currentReagent,
    isLoadingReagents: (state) => state.isLoading,
    getLowStockReagents: (state) => state.lowStockReagents,
  },

  actions: {
    async fetchReagents() {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await api.get('/reagents'); // API path from backend tests
        this.reagentsList = data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch reagents';
        console.error('fetchReagents error:', this.error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchReagentById(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await api.get(`/reagents/${id}`);
        this.currentReagent = data;
        // Optionally, update it in the list as well if it might be stale
        const index = this.reagentsList.findIndex(r => r.id === Number(id));
        if (index !== -1) {
          this.reagentsList[index] = data;
        } else {
          // If not in list, add it (though usually fetchReagents is called for the list)
          // this.reagentsList.push(data); // Or handle as per app logic
        }
        return data; // Return the fetched reagent
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch reagent by ID';
        this.currentReagent = null;
        console.error(`fetchReagentById (${id}) error:`, this.error);
        throw error; // Re-throw for component to handle if needed
      } finally {
        this.isLoading = false;
      }
    },

    async createReagent(payload) {
      this.isLoading = true; // Or use a specific loading flag for create/update actions
      this.error = null;
      try {
        const response = await api.post('/reagents', payload);
        // Optionally add to list or refetch list
        // For simplicity, recommend refetching list from component or after multiple creations
        // this.reagentsList.push(response); // Assuming API returns the created object
        await this.fetchReagents(); // Refresh list
        return response; // Return created reagent
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to create reagent';
        console.error('createReagent error:', this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async updateReagent(id, payload) {
      this.isLoading = true;
      this.error = null;
      try {
        const updatedReagent = await api.put(`/reagents/${id}`, payload);
        // Update in the list
        const index = this.reagentsList.findIndex(r => r.id === Number(id));
        if (index !== -1) {
          this.reagentsList[index] = updatedReagent;
        }
        // Update currentReagent if it's the one being edited
        if (this.currentReagent && this.currentReagent.id === Number(id)) {
          this.currentReagent = updatedReagent;
        }
        return updatedReagent;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to update reagent';
        console.error(`updateReagent (${id}) error:`, this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteReagent(id) {
      this.isLoading = true;
      this.error = null;
      try {
        await api.delete(`/reagents/${id}`);
        this.reagentsList = this.reagentsList.filter(r => r.id !== Number(id));
        if (this.currentReagent && this.currentReagent.id === Number(id)) {
          this.currentReagent = null;
        }
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to delete reagent';
        console.error(`deleteReagent (${id}) error:`, this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async updateReagentStock(id, changePayload) { // changePayload should be { change: number }
      this.isLoading = true;
      this.error = null;
      try {
        const updatedReagent = await api.post(`/reagents/${id}/update_stock`, changePayload);
        // Update in the list
        const index = this.reagentsList.findIndex(r => r.id === Number(id));
        if (index !== -1) {
          this.reagentsList[index] = updatedReagent;
        }
        if (this.currentReagent && this.currentReagent.id === Number(id)) {
          this.currentReagent = updatedReagent;
        }
        return updatedReagent;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to update reagent stock';
        console.error(`updateReagentStock (${id}) error:`, this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchLowStockAlerts() {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await api.get('/reagents/alerts/low_stock');
        this.lowStockReagents = data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch low stock alerts';
        this.lowStockReagents = [];
        console.error('fetchLowStockAlerts error:', this.error);
      } finally {
        this.isLoading = false;
      }
    },
  },
});
