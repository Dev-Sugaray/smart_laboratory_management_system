<template>
  <div class="p-4 border rounded-lg shadow-md bg-white mt-6">
    <h3 class="text-lg font-medium mb-3">Log New Usage</h3>
    <form @submit.prevent="handleSubmitUsage">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="start_time" class="block text-sm font-medium text-gray-700">Start Time <span class="text-red-500">*</span></label>
          <input type="datetime-local" id="start_time" v-model="usageFormData.start_time" required
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
        <div>
          <label for="end_time" class="block text-sm font-medium text-gray-700">End Time</label>
          <input type="datetime-local" id="end_time" v.model="usageFormData.end_time"
                 :min="usageFormData.start_time"
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
      </div>
      <div class="mt-4">
        <label for="notes" class="block text-sm font-medium text-gray-700">Notes</label>
        <textarea id="notes" v-model="usageFormData.notes" rows="3"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
      </div>

      <div v-if="store.getUsageLogError" class="mt-3 p-2 text-sm text-red-700 bg-red-100 rounded-md">
        Error logging usage: {{ store.getUsageLogError }}
      </div>
       <div v-if="submissionError" class="mt-3 p-2 text-sm text-red-700 bg-red-100 rounded-md">
        Error: {{ submissionError }}
      </div>


      <div class="mt-4 flex justify-end">
        <button type="submit" :disabled="store.isUsageLogLoading"
                class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
          {{ store.isUsageLogLoading ? 'Logging...' : 'Log Usage' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';

const props = defineProps({
  instrumentId: {
    type: [String, Number],
    required: true,
  },
});

const emit = defineEmits(['usage-logged']);

const store = useInstrumentManagementStore();

const initialUsageFormData = {
  start_time: '',
  end_time: '',
  notes: '',
};
const usageFormData = ref({ ...initialUsageFormData });
const submissionError = ref(null);

// Watch for instrumentId changes to clear the form if needed, though typically this form is tied to one instrument at a time.
watch(() => props.instrumentId, () => {
  usageFormData.value = { ...initialUsageFormData };
  store.usageLogError = null; // Clear store error when instrument context changes
  submissionError.value = null;
});

const handleSubmitUsage = async () => {
  submissionError.value = null;
  if (!usageFormData.value.start_time) {
    submissionError.value = 'Start time is required.';
    return;
  }
  if (usageFormData.value.end_time && new Date(usageFormData.value.end_time) < new Date(usageFormData.value.start_time)) {
    submissionError.value = 'End time cannot be before start time.';
    return;
  }

  try {
    await store.logInstrumentUsage({
      instrument_id: props.instrumentId,
      ...usageFormData.value,
    });
    usageFormData.value = { ...initialUsageFormData }; // Reset form
    emit('usage-logged'); // Notify parent to refresh list or give feedback
  } catch (error) {
    // Error is already set in the store and displayed.
    // If not using store error display directly, set submissionError.value here.
    // submissionError.value = store.getUsageLogError || 'An unexpected error occurred.';
    console.error("Usage log submission error:", error);
  }
};
</script>
