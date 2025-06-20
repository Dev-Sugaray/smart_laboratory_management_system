<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h2 class="text-xl font-semibold mb-4">{{ isEditing ? 'Edit Instrument' : 'Register New Instrument' }}</h2>
    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Name <span class="text-red-500">*</span></label>
          <input type="text" id="name" v.model="formData.name" required
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
        <div>
          <label for="serial_number" class="block text-sm font-medium text-gray-700">Serial Number <span class="text-red-500">*</span></label>
          <input type="text" id="serial_number" v.model="formData.serial_number" required
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
        <div>
          <label for="make" class="block text-sm font-medium text-gray-700">Make</label>
          <input type="text" id="make" v.model="formData.make"
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
        <div>
          <label for="model" class="block text-sm font-medium text-gray-700">Model</label>
          <input type="text" id="model" v.model="formData.model"
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
        <div>
          <label for="calibration_date" class="block text-sm font-medium text-gray-700">Calibration Date</label>
          <input type="date" id="calibration_date" v.model="formData.calibration_date"
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
        <div>
          <label for="maintenance_schedule" class="block text-sm font-medium text-gray-700">Maintenance Schedule</label>
          <input type="text" id="maintenance_schedule" v.model="formData.maintenance_schedule" placeholder="e.g., Annually, Every 6 months"
                 class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
        <div>
          <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
          <select id="status" v-model="formData.status"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="Available">Available</option>
            <option value="In Use">In Use</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Retired">Retired</option>
          </select>
        </div>
      </div>

      <div v-if="store.error" class="mt-4 p-2 text-sm text-red-700 bg-red-100 rounded-md">
        Error: {{ store.getError }}
      </div>

      <div class="mt-6 flex justify-end space-x-3">
        <button type="button" @click="handleCancel"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Cancel
        </button>
        <button type="submit" :disabled="store.isLoading"
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          {{ store.isLoading ? (isEditing ? 'Updating...' : 'Registering...') : (isEditing ? 'Update Instrument' : 'Register Instrument') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement'; // Correct path based on typical Vue setup

const props = defineProps({
  instrumentToEdit: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['form-submitted', 'form-cancelled']);

const store = useInstrumentManagementStore();

const initialFormData = {
  name: '',
  make: '',
  model: '',
  serial_number: '',
  calibration_date: '',
  maintenance_schedule: '',
  status: 'Available',
};

const formData = ref({ ...initialFormData });
const isEditing = ref(false);

watch(() => props.instrumentToEdit, (newVal) => {
  if (newVal) {
    formData.value = {
      ...newVal,
      // Ensure date is in YYYY-MM-DD for input type="date"
      calibration_date: newVal.calibration_date ? newVal.calibration_date.split('T')[0] : '',
    };
    isEditing.value = true;
  } else {
    formData.value = { ...initialFormData };
    isEditing.value = false;
  }
}, { immediate: true, deep: true });


const handleSubmit = async () => {
  // Basic validation
  if (!formData.value.name || !formData.value.serial_number) {
    alert('Name and Serial Number are required.'); // Replace with better UX later
    return;
  }

  try {
    if (isEditing.value && props.instrumentToEdit) {
      await store.updateInstrument(props.instrumentToEdit.id, formData.value);
    } else {
      await store.registerInstrument(formData.value);
    }
    formData.value = { ...initialFormData }; // Reset form
    isEditing.value = false;
    emit('form-submitted');
  } catch (error) {
    // Error is already set in the store, and displayed in the template
    // Optionally, add more specific error handling here or notifications
    console.error("Form submission error:", error);
  }
};

const handleCancel = () => {
  formData.value = { ...initialFormData };
  isEditing.value = false;
  emit('form-cancelled');
};

// Clear any existing store error when component is mounted or form is reset
onMounted(() => {
  store.error = null;
});

</script>
