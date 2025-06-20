<template>
  <div class="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md space-y-6">
    <h2 class="text-2xl font-semibold text-gray-800 text-center">
      {{ isEditMode ? 'Edit Reagent' : 'Register New Reagent' }}
    </h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Name *</label>
        <input type="text" id="name" v-model="form.name" required
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label for="lot_number" class="block text-sm font-medium text-gray-700">Lot Number *</label>
        <input type="text" id="lot_number" v-model="form.lot_number" required
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label for="expiry_date" class="block text-sm font-medium text-gray-700">Expiry Date *</label>
        <input type="date" id="expiry_date" v-model="form.expiry_date" required
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label for="manufacturer" class="block text-sm font-medium text-gray-700">Manufacturer</label>
        <input type="text" id="manufacturer" v-model="form.manufacturer"
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label for="sds_link" class="block text-sm font-medium text-gray-700">SDS Link (URL)</label>
        <input type="url" id="sds_link" v-model="form.sds_link" placeholder="https://example.com/sds.pdf"
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label for="current_stock" class="block text-sm font-medium text-gray-700">Current Stock *</label>
        <input type="number" id="current_stock" v-model.number="form.current_stock" required min="0"
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div>
        <label for="min_stock_level" class="block text-sm font-medium text-gray-700">Minimum Stock Level *</label>
        <input type="number" id="min_stock_level" v-model.number="form.min_stock_level" required min="0"
               class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>

      <div v-if="localError" class="mt-2 p-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
        {{ localError }}
      </div>

      <div v-if="reagentStore.error" class="mt-2 p-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
        Store error: {{ reagentStore.error }}
      </div>

      <div class="flex justify-end space-x-3">
        <button type="button" @click="handleCancel"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
          Cancel
        </button>
        <button type="submit" :disabled="reagentStore.isLoading"
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
          {{ reagentStore.isLoading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Reagent') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, watchEffect, computed } from 'vue';
import { useReagentStore } from '../../stores/reagents';

const props = defineProps({
  reagentToEdit: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['reagent-saved', 'cancel']);

const reagentStore = useReagentStore();

const isEditMode = computed(() => !!props.reagentToEdit);

const form = ref({
  name: '',
  lot_number: '',
  expiry_date: '',
  manufacturer: '',
  sds_link: '',
  current_stock: 0,
  min_stock_level: 0,
});

const localError = ref('');

// Watch for changes in reagentToEdit to pre-fill the form
watchEffect(() => {
  if (props.reagentToEdit) {
    form.value.name = props.reagentToEdit.name || '';
    form.value.lot_number = props.reagentToEdit.lot_number || '';
    // Ensure date is in YYYY-MM-DD format for the input type="date"
    form.value.expiry_date = props.reagentToEdit.expiry_date ? props.reagentToEdit.expiry_date.split('T')[0] : '';
    form.value.manufacturer = props.reagentToEdit.manufacturer || '';
    form.value.sds_link = props.reagentToEdit.sds_link || '';
    form.value.current_stock = props.reagentToEdit.current_stock === undefined ? 0 : Number(props.reagentToEdit.current_stock);
    form.value.min_stock_level = props.reagentToEdit.min_stock_level === undefined ? 0 : Number(props.reagentToEdit.min_stock_level);
  } else {
    // Reset form for creation mode (or if prop becomes null)
    form.value = {
      name: '', lot_number: '', expiry_date: '', manufacturer: '',
      sds_link: '', current_stock: 0, min_stock_level: 0,
    };
  }
});

// Basic date validation (YYYY-MM-DD)
const isValidDate = (dateString) => {
  if (!dateString) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString);
};

const validateForm = () => {
  localError.value = '';
  if (!form.value.name.trim() || !form.value.lot_number.trim() || !form.value.expiry_date) {
    localError.value = 'Name, Lot Number, and Expiry Date are required.';
    return false;
  }
  if (!isValidDate(form.value.expiry_date)) {
    localError.value = 'Expiry Date must be in YYYY-MM-DD format.';
    return false;
  }
  if (form.value.current_stock < 0 || form.value.min_stock_level < 0) {
    localError.value = 'Stock levels cannot be negative.';
    return false;
  }
  if (form.value.sds_link) {
    try {
      new URL(form.value.sds_link);
    } catch (_) {
      localError.value = 'SDS Link must be a valid URL.';
      return false;
    }
  }
  return true;
};

async function handleSubmit() {
  if (!validateForm()) {
    return;
  }
  reagentStore.error = null; // Clear previous store errors

  try {
    if (isEditMode.value) {
      await reagentStore.updateReagent(props.reagentToEdit.id, form.value);
      alert('Reagent updated successfully!');
    } else {
      await reagentStore.createReagent(form.value);
      alert('Reagent created successfully!');
    }
    emit('reagent-saved');
    // Optionally reset form after successful creation if not navigating away
    if (!isEditMode.value) {
      form.value = { name: '', lot_number: '', expiry_date: '', manufacturer: '', sds_link: '', current_stock: 0, min_stock_level: 0 };
    }
  } catch (error) {
    // Error is already set in the store by the action, or can set localError too
    localError.value = `Operation failed: ${error.message || 'Unknown error'}`;
    console.error("Form submission error:", error);
  }
}

function handleCancel() {
  emit('cancel');
}
</script>

<style scoped>
/* Tailwind is used via classes in the template */
</style>
