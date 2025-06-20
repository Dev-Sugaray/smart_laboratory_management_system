import { defineStore } from 'pinia';
import api from '../services/api'; // Assuming api service for HTTP requests

export const useSupplierStore = defineStore('suppliers', {
  state: () => ({
    suppliersList: [],
    currentSupplier: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    allSuppliers: (state) => state.suppliersList,
    loadedSupplier: (state) => state.currentSupplier,
    isLoadingSuppliers: (state) => state.isLoading,
  },

  actions: {
    async fetchSuppliers() {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await api.get('/suppliers'); // API path from backend tests
        this.suppliersList = data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch suppliers';
        console.error('fetchSuppliers error:', this.error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSupplierById(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await api.get(`/suppliers/${id}`);
        this.currentSupplier = data;
        // Optionally, update it in the list
        const index = this.suppliersList.findIndex(s => s.id === Number(id));
        if (index !== -1) {
          this.suppliersList[index] = data;
        }
        return data; // Return the fetched supplier
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch supplier by ID';
        this.currentSupplier = null;
        console.error(`fetchSupplierById (${id}) error:`, this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async createSupplier(payload) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await api.post('/suppliers', payload);
        // this.suppliersList.push(response); // Assuming API returns the created object
        await this.fetchSuppliers(); // Refresh list
        return response; // Return created supplier
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to create supplier';
        console.error('createSupplier error:', this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async updateSupplier(id, payload) {
      this.isLoading = true;
      this.error = null;
      try {
        const updatedSupplier = await api.put(`/suppliers/${id}`, payload);
        const index = this.suppliersList.findIndex(s => s.id === Number(id));
        if (index !== -1) {
          this.suppliersList[index] = updatedSupplier;
        }
        if (this.currentSupplier && this.currentSupplier.id === Number(id)) {
          this.currentSupplier = updatedSupplier;
        }
        return updatedSupplier;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to update supplier';
        console.error(`updateSupplier (${id}) error:`, this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async deleteSupplier(id) {
      this.isLoading = true;
      this.error = null;
      try {
        await api.delete(`/suppliers/${id}`);
        this.suppliersList = this.suppliersList.filter(s => s.id !== Number(id));
        if (this.currentSupplier && this.currentSupplier.id === Number(id)) {
          this.currentSupplier = null;
        }
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to delete supplier';
        console.error(`deleteSupplier (${id}) error:`, this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
