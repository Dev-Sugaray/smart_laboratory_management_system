<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Inventory Dashboard</h1>

    <div v-if="reagentStore.isLoading && !reagentStore.reagentsList.length" class="text-center py-10">
      <p class="text-lg text-gray-500">Loading inventory data...</p>
      <!-- Spinner or loading animation -->
    </div>
    <div v-else-if="reagentStore.error && !reagentStore.reagentsList.length" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
      <p class="font-bold">Error</p>
      <p>{{ reagentStore.error }}</p>
      <button @click="reagentStore.fetchReagents()" class="mt-2 px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded">Retry</button>
    </div>
    <div v-else-if="!reagentStore.reagentsList.length" class="text-center py-10">
      <p class="text-lg text-gray-500">No reagents found in inventory.</p>
      <!-- Link to registration form can be added here -->
    </div>

    <div v-else class="space-y-4">
      <div v-for="reagent in reagentStore.reagentsList" :key="reagent.id"
           class="bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div class="mb-3 sm:mb-0">
          <h2 class="text-xl font-semibold text-indigo-600">{{ reagent.name }}</h2>
          <p class="text-sm text-gray-500">Lot #: {{ reagent.lot_number }}</p>
          <p class="text-sm text-gray-600">
            Stock: <span class="font-bold" :class="getStockLevelClass(reagent)">{{ reagent.current_stock }}</span> / Min: {{ reagent.min_stock_level }}
          </p>
          <p class="text-xs text-gray-500">Expiry: {{ formatDate(reagent.expiry_date) }}</p>
        </div>
        <button
          @click="openStockUpdateModal(reagent)"
          class="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 self-end sm:self-center"
        >
          Update Stock
        </button>
      </div>
    </div>

    <!-- Stock Update Modal -->
    <div v-if="showStockModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div class="p-6 bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Update Stock for {{ reagentToUpdate?.name }}</h3>
        <div>
          <label for="stockChange" class="block text-sm font-medium text-gray-700">
            Change Amount (Current: {{ reagentToUpdate?.current_stock }})
          </label>
          <input type="number" id="stockChange" v-model.number="stockChangeAmount"
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                 placeholder="e.g., 10 or -5" />
        </div>
        <div v-if="stockUpdateError" class="mt-2 text-sm text-red-600">
          Error: {{ stockUpdateError }}
        </div>
        <div class="mt-6 flex justify-end space-x-3">
          <button @click="closeStockUpdateModal" type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
            Cancel
          </button>
          <button @click="submitStockUpdate" :disabled="isUpdatingStock"
                  class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {{ isUpdatingStock ? 'Saving...' : 'Save Stock' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useReagentStore } from '../../stores/reagents';

const reagentStore = useReagentStore();

const showStockModal = ref(false);
const reagentToUpdate = ref(null);
const stockChangeAmount = ref(0);
const isUpdatingStock = ref(false);
const stockUpdateError = ref('');

onMounted(() => {
  if (!reagentStore.reagentsList || reagentStore.reagentsList.length === 0) {
    reagentStore.fetchReagents();
  }
});

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const getStockLevelClass = (reagent) => {
  if (reagent.current_stock < reagent.min_stock_level) {
    return 'text-red-500';
  } else if (reagent.current_stock < reagent.min_stock_level * 1.2) {
    return 'text-yellow-500';
  }
  return 'text-green-600';
};

const openStockUpdateModal = (reagent) => {
  reagentToUpdate.value = { ...reagent }; // Clone to avoid direct state mutation if input was bound
  stockChangeAmount.value = 0;
  stockUpdateError.value = '';
  showStockModal.value = true;
};

const closeStockUpdateModal = () => {
  showStockModal.value = false;
  reagentToUpdate.value = null;
};

async function submitStockUpdate() {
  if (!reagentToUpdate.value || typeof stockChangeAmount.value !== 'number') {
    stockUpdateError.value = 'Invalid change amount.';
    return;
  }
  if (stockChangeAmount.value === 0) {
    stockUpdateError.value = 'Change amount cannot be zero.';
    return;
  }

  isUpdatingStock.value = true;
  stockUpdateError.value = '';

  try {
    await reagentStore.updateReagentStock(reagentToUpdate.value.id, { change: stockChangeAmount.value });
    // The store action should update the list, and reactivity will update the UI.
    closeStockUpdateModal();
    // Optionally, show a success notification
  } catch (error) {
    stockUpdateError.value = error.message || 'Failed to update stock.';
    console.error('Stock update failed:', error);
  } finally {
    isUpdatingStock.value = false;
  }
}
</script>

<style scoped>
/* Minimal custom styles, Tailwind is preferred */
</style>
