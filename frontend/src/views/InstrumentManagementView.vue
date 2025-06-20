<template>
  <div class="p-4 md:p-6">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-900">Instrument Management</h1>
    </header>

    <div class="mb-6">
      <button
        @click="showRegistrationForm = !showRegistrationForm"
        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {{ showRegistrationForm ? 'Cancel' : (currentInstrumentToEdit ? 'Cancel Edit' : 'Register New Instrument') }}
      </button>
    </div>

    <div v-if="showRegistrationForm || currentInstrumentToEdit" class="mb-8">
      <InstrumentRegistrationForm
        :instrument-to-edit="currentInstrumentToEdit"
        @form-submitted="handleFormSubmitted"
        @form-cancelled="handleFormCancelled"
      />
    </div>

    <div v-if="store.error && !showRegistrationForm" class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg">
      An error occurred: {{ store.getError }}
    </div>

    <InstrumentList
      @edit-instrument="handleEditInstrument"
      @view-logs="handleViewLogs"
      @delete-instrument="handleDeleteInstrument"
    />

    <!-- Basic Modal for Deletion Confirmation (example) -->
    <!-- A more robust modal solution would be preferable in a real app -->
    <div v-if="showDeleteConfirmation" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div class="p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="text-center">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Confirm Deletion</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500">
              Are you sure you want to delete this instrument? This action cannot be undone.
              Associated usage logs might also prevent deletion as per backend rules.
            </p>
          </div>
          <div v-if="store.isLoading" class="py-2">Deleting...</div>
          <div v-if="deletionError" class="py-2 text-red-500">{{ deletionError }}</div>
          <div class="flex justify-around mt-4">
            <button @click="cancelDeletion" class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Cancel</button>
            <button @click="proceedWithDeletion" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" :disabled="store.isLoading">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import InstrumentRegistrationForm from '@/components/instrument_management/InstrumentRegistrationForm.vue';
import InstrumentList from '@/components/instrument_management/InstrumentList.vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';
import { useAuthStore } from '@/stores/auth'; // For permission checks if needed later

const store = useInstrumentManagementStore();
const authStore = useAuthStore(); // For potential permission checks
const router = useRouter();

const showRegistrationForm = ref(false);
const currentInstrumentToEdit = ref(null);

const showDeleteConfirmation = ref(false);
const instrumentIdToDelete = ref(null);
const deletionError = ref(null);


const handleEditInstrument = (instrument) => {
  currentInstrumentToEdit.value = { ...instrument }; // Clone to avoid direct mutation if passed around
  showRegistrationForm.value = true;
  window.scrollTo(0, 0); // Scroll to top to see the form
};

const handleFormSubmitted = () => {
  showRegistrationForm.value = false;
  currentInstrumentToEdit.value = null;
  store.fetchInstruments(); // Refresh list
};

const handleFormCancelled = () => {
  showRegistrationForm.value = false;
  currentInstrumentToEdit.value = null;
  store.error = null; // Clear any form-specific errors
};

const handleViewLogs = (instrumentId) => {
  router.push({ name: 'InstrumentDetailView', params: { id: instrumentId } });
};

const handleDeleteInstrument = (id) => {
  instrumentIdToDelete.value = id;
  deletionError.value = null; // Clear previous deletion error
  showDeleteConfirmation.value = true;
};

const cancelDeletion = () => {
  showDeleteConfirmation.value = false;
  instrumentIdToDelete.value = null;
};

const proceedWithDeletion = async () => {
  if (instrumentIdToDelete.value === null) return;
  deletionError.value = null;
  try {
    await store.deleteInstrument(instrumentIdToDelete.value);
    showDeleteConfirmation.value = false;
    instrumentIdToDelete.value = null;
    // List will refresh via store action
  } catch (error) {
     // Error is set in store, but we can show a specific one for the modal
    deletionError.value = store.getError || 'Failed to delete instrument.';
    // Keep modal open to show error
  }
};

// Example of how you might check permissions for UI elements, though not strictly used by button visibility yet
const canManageInstruments = computed(() => authStore.hasPermission('manage_instruments'));
const canViewInstruments = computed(() => authStore.hasPermission('view_instruments'));

</script>
