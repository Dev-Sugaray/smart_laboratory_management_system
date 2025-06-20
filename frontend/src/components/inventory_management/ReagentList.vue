<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-semibold text-gray-800">Reagent Inventory</h2>
      <button
        @click="handleRegisterNew"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300"
      >
        Register New Reagent
      </button>
    </div>

    <div v-if="reagentStore.isLoading" class="text-center py-10">
      <p class="text-gray-500">Loading reagents...</p>
      <!-- You can add a spinner component here -->
    </div>

    <div v.else-if="reagentStore.error" class="text-center py-10 bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-700 font-semibold">Error loading reagents:</p>
      <p class="text-red-600">{{ reagentStore.error }}</p>
      <button @click="retryFetch" class="mt-2 px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded">Retry</button>
    </div>

    <div v.else-if="!reagentStore.reagentsList || reagentStore.reagentsList.length === 0" class="text-center py-10">
      <p class="text-gray-500">No reagents found. Register a new one to get started.</p>
    </div>

    <div v.else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ReagentListItem
        v-for="reagent in reagentStore.reagentsList"
        :key="reagent.id"
        :reagent="reagent"
        @view-details="handleViewDetails"
        @edit-reagent="handleEditReagent"
        @delete-reagent="handleDeleteReagent"
        @update-stock="handleUpdateStock"
      />
    </div>

    <!-- Modals or further UI for edit/delete/view can be triggered from here or by parent page -->
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useReagentStore } from '../../stores/reagents';
import ReagentListItem from './ReagentListItem.vue';
// Assuming a router is set up if navigation is needed
// import { useRouter } from 'vue-router';

// const router = useRouter();
const reagentStore = useReagentStore();

onMounted(() => {
  // Fetch reagents if the list is empty or based on other logic (e.g., staleness)
  if (!reagentStore.reagentsList || reagentStore.reagentsList.length === 0) {
    reagentStore.fetchReagents();
  }
});

const retryFetch = () => {
  reagentStore.fetchReagents();
};

const handleRegisterNew = () => {
  // This would typically navigate to a new route/page for the registration form
  // or open a modal dialog containing ReagentRegistrationForm.vue
  console.log('Navigate to register new reagent form/view');
  // router.push({ name: 'ReagentCreate' }); // Example navigation
  // For now, we'll just log it as the form might be part of a different view/modal
  alert('Placeholder: Open Reagent Registration Form');
};

const handleViewDetails = (reagentId) => {
  console.log('View details for reagent ID:', reagentId);
  // router.push({ name: 'ReagentDetails', params: { id: reagentId } });
  alert(`Placeholder: View details for reagent ID: ${reagentId}`);
};

const handleEditReagent = (reagent) => {
  console.log('Edit reagent:', reagent);
  // This would typically open ReagentRegistrationForm in edit mode, possibly in a modal or new route
  // For example, set a store property or navigate:
  // reagentStore.setCurrentReagentForEdit(reagent);
  // router.push({ name: 'ReagentEdit', params: { id: reagent.id } });
  alert(`Placeholder: Edit reagent: ${reagent.name}`);
};

const handleDeleteReagent = async (reagentId) => {
  console.log('Delete reagent ID:', reagentId);
  if (confirm(`Are you sure you want to delete reagent ID ${reagentId}? This cannot be undone.`)) {
    try {
      await reagentStore.deleteReagent(reagentId);
      alert(`Reagent ID ${reagentId} deleted successfully.`);
      // List will update automatically due to store reactivity
    } catch (error) {
      alert(`Failed to delete reagent: ${error.message || 'Unknown error'}`);
    }
  }
};

const handleUpdateStock = (reagent) => {
  console.log('Update stock for reagent:', reagent);
  // This would typically open a small modal or inline form to get the stock change amount
  const changeAmount = prompt(`Enter stock change for ${reagent.name} (current: ${reagent.current_stock}):\n(e.g., 10 to add, -5 to remove)`);
  if (changeAmount !== null) {
    const change = parseInt(changeAmount, 10);
    if (!isNaN(change)) {
      try {
        // Call store action. Assuming the action handles positive/negative values.
         reagentStore.updateReagentStock(reagent.id, { change });
         alert(`Stock update for ${reagent.name} processed.`);
      } catch (error) {
        alert(`Failed to update stock: ${error.message || 'Unknown error'}`);
      }
    } else {
      alert('Invalid amount entered.');
    }
  }
};
</script>

<style scoped>
/* Tailwind is used via classes in the template */
</style>
