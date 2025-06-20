import { defineStore } from 'pinia';
import api from '../services/api'; // Assuming api service for HTTP requests
import { useReagentStore } from './reagents'; // To interact with reagent store

export const useReagentOrderStore = defineStore('reagentOrders', {
  state: () => ({
    ordersList: [],
    currentOrder: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    allOrders: (state) => state.ordersList,
    loadedOrder: (state) => state.currentOrder,
    isLoadingOrders: (state) => state.isLoading,
  },

  actions: {
    async fetchOrders() {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await api.get('/reagent_orders'); // API path from backend tests
        this.ordersList = data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch orders';
        console.error('fetchOrders error:', this.error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchOrderById(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await api.get(`/reagent_orders/${id}`);
        this.currentOrder = data;
        const index = this.ordersList.findIndex(o => o.id === Number(id));
        if (index !== -1) {
          this.ordersList[index] = data;
        }
        return data; // Return fetched order
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch order by ID';
        this.currentOrder = null;
        console.error(`fetchOrderById (${id}) error:`, this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async createOrder(payload) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await api.post('/reagent_orders', payload);
        // this.ordersList.push(response); // Or refetch
        await this.fetchOrders(); // Refresh list
        return response; // Return created order
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to create order';
        console.error('createOrder error:', this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async updateOrder(id, payload) {
      this.isLoading = true;
      this.error = null;
      let originalStatus = null;

      // If currentOrder is the one being updated, store its original status
      if (this.currentOrder && this.currentOrder.id === Number(id)) {
        originalStatus = this.currentOrder.status;
      } else {
        // If not, try to find it in the list to get original status
        const orderInList = this.ordersList.find(o => o.id === Number(id));
        if (orderInList) {
          originalStatus = orderInList.status;
        }
        // If still not found, it means we don't have its previous state easily.
        // The backend handles the stock update logic, so frontend just needs to refresh.
      }


      try {
        const updatedOrder = await api.put(`/reagent_orders/${id}`, payload);
        const index = this.ordersList.findIndex(o => o.id === Number(id));
        if (index !== -1) {
          this.ordersList[index] = updatedOrder;
        }
        if (this.currentOrder && this.currentOrder.id === Number(id)) {
          this.currentOrder = updatedOrder;
        }

        // If status changed to 'Delivered', refresh the affected reagent's stock details
        if (payload.status === 'Delivered' && originalStatus !== 'Delivered') {
          if (updatedOrder.reagent_id) {
            const reagentStore = useReagentStore();
            // Fetch the specific reagent to update its details in the reagent store
            // This ensures the reagent's possibly updated stock is reflected.
            await reagentStore.fetchReagentById(updatedOrder.reagent_id);
            // Also refresh the main reagents list if it's displayed and might show stock
            // Or rely on components to watch for changes/manually refetch if necessary.
            // A targeted update is better than refetching the whole list if possible.
          }
        }
        return updatedOrder;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to update order';
        console.error(`updateOrder (${id}) error:`, this.error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    // No deleteOrder action specified in the prompt for reagent_orders
  },
});
