<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <h1 class="text-3xl font-bold text-red-600 mb-6">Low Stock Alerts</h1>

    <div v-if="reagentStore.isLoading" class="text-center py-10">
      <p class="text-lg text-gray-500">Loading low stock alerts...</p>
      <!-- Spinner or loading animation -->
    </div>
    <div v-else-if="reagentStore.error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
      <p class="font-bold">Error</p>
      <p>{{ reagentStore.error }}</p>
      <button @click="reagentStore.fetchLowStockAlerts()" class="mt-2 px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded">Retry</button>
    </div>
    <div v-else-if="!reagentStore.getLowStockReagents || reagentStore.getLowStockReagents.length === 0" class="text-center py-10">
      <p class="text-lg text-green-600">No reagents are currently low on stock. Well done!</p>
    </div>

    <div v.else class="space-y-4">
      <div v-for="reagent in reagentStore.getLowStockReagents" :key="reagent.id"
           class="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">

        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div class="mb-3 sm:mb-0">
                <h2 class="text-xl font-semibold text-indigo-600">{{ reagent.name }}</h2>
                <p class="text-sm text-gray-500">Lot #: {{ reagent.lot_number }}</p>
                <p class="text-sm text-gray-600">
                    Current Stock: <span class="font-bold text-red-500">{{ reagent.current_stock }}</span>
                </p>
                <p class="text-sm text-gray-600">
                    Minimum Stock: <span class="font-semibold">{{ reagent.min_stock_level }}</span>
                </p>
                 <p class="text-xs text-gray-500">Expiry: {{ formatDate(reagent.expiry_date) }} <span v-if="isExpired(reagent.expiry_date)" class="font-bold text-red-500">(EXPIRED)</span></p>
            </div>
            <div class="flex space-x-2 self-end sm:self-center">
                 <button
                    @click="handleUpdateStock(reagent)"
                    class="px-3 py-1 text-xs font-medium text-center text-white bg-green-500 rounded-lg hover:bg-green-600 focus:ring-4 focus:outline-none focus:ring-green-300"
                    >
                    Update Stock
                </button>
                <button
                    @click="handleReorder(reagent)"
                    class="px-3 py-1 text-xs font-medium text-center text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300"
                    >
                    Reorder (Placeholder)
                </button>
            </div>
        </div>
      </div>
    </div>

     <!-- Stock Update Modal (similar to InventoryDashboard, could be extracted to a component) -->
    <div v-if="showStockModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div class="p-6 bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Update Stock for {{ reagentToUpdate?.name }}</h3>
        <div>
          <label for="stockChangeAlert" class="block text-sm font-medium text-gray-700">
            Change Amount (Current: {{ reagentToUpdate?.current_stock }})
          </label>
          <input type="number" id="stockChangeAlert" v-model.number="stockChangeAmount"
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
import { ref, onMounted, computed } from 'vue';
import { useReagentStore } from '../../stores/reagents';
// Re-using ReagentListItem is an option, but for more tailored display or actions, custom rendering is fine.
// import ReagentListItem from './ReagentListItem.vue';

const reagentStore = useReagentStore();

const showStockModal = ref(false);
const reagentToUpdate = ref(null);
const stockChangeAmount = ref(0);
const isUpdatingStock = ref(false);
const stockUpdateError = ref('');

onMounted(() => {
  reagentStore.fetchLowStockAlerts();
});

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const isExpired = (expiryDate) => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
};

const handleReorder = (reagent) => {
  console.log('Placeholder: Initiate reorder process for reagent ID:', reagent.id);
  // This would typically navigate to an order creation form, pre-filled with reagent info,
  // or open a modal to create a purchase requisition.
  alert(`Placeholder: Reorder ${reagent.name}. This would typically open an order form.`);
};

const openStockUpdateModal = (reagent) => {
  reagentToUpdate.value = { ...reagent };
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
    stockUpdateError.value = 'Change amount cannot be zero (no stock change requested).';
    return;
  }

  isUpdatingStock.value = true;
  stockUpdateError.value = '';

  try {
    await reagentStore.updateReagentStock(reagentToUpdate.value.id, { change: stockChangeAmount.value });
    // After stock update, the reagent might no longer be "low stock".
    // Re-fetch low stock alerts to update the current view.
    await reagentStore.fetchLowStockAlerts();
    // Also, if the main reagents list is shown elsewhere, that specific reagent is updated by the action.
    closeStockUpdateModal();
  } catch (error) {
    stockUpdateError.value = error.message || 'Failed to update stock.';
    console.error('Stock update failed from low stock alerts:', error);
  } finally {
    isUpdatingStock.value = false;
  }
}
</script>

<style scoped>
/* Tailwind is used via classes in the template */
</style>
