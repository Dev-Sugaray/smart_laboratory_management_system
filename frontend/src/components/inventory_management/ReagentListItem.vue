<template>
  <div class="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
    <h3 class="text-lg font-semibold text-gray-700">{{ reagent.name }}</h3>
    <p class="text-sm text-gray-500">Lot #: {{ reagent.lot_number }}</p>
    <p class="text-sm" :class="isExpired ? 'text-red-500 font-medium' : 'text-gray-600'">
      Expiry Date: {{ formatDate(reagent.expiry_date) }}
      <span v-if="isExpired" class="font-bold"> (EXPIRED)</span>
      <span v-else-if="isExpiringSoon" class="text-yellow-500 font-medium"> (Expiring Soon)</span>
    </p>
    <p class="text-sm text-gray-600">Manufacturer: {{ reagent.manufacturer || 'N/A' }}</p>
    <div class="mt-2">
      <p class="text-sm text-gray-600">
        Current Stock:
        <span :class="stockLevelClass">{{ reagent.current_stock }}</span>
      </p>
      <p class="text-sm text-gray-600">Min Stock: {{ reagent.min_stock_level }}</p>
    </div>
    <div v-if="reagent.sds_link" class="mt-2">
      <a :href="reagent.sds_link" target="_blank" rel="noopener noreferrer" class="text-sm text-blue-500 hover:text-blue-700 hover:underline">
        View SDS
      </a>
    </div>
    <div class="mt-3 flex space-x-2">
      <!-- Placeholder for action buttons/links -->
      <button @click="$emit('view-details', reagent.id)" class="px-3 py-1 text-xs font-medium text-center text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300">
        Details
      </button>
      <button @click="$emit('edit-reagent', reagent)" class="px-3 py-1 text-xs font-medium text-center text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 focus:ring-4 focus:outline-none focus:ring-yellow-300">
        Edit
      </button>
       <button @click="$emit('update-stock', reagent)" class="px-3 py-1 text-xs font-medium text-center text-white bg-green-500 rounded-lg hover:bg-green-600 focus:ring-4 focus:outline-none focus:ring-green-300">
        Update Stock
      </button>
      <button @click="$emit('delete-reagent', reagent.id)" class="px-3 py-1 text-xs font-medium text-center text-white bg-red-500 rounded-lg hover:bg-red-600 focus:ring-4 focus:outline-none focus:ring-red-300">
        Delete
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  reagent: {
    type: Object,
    required: true,
  },
});

defineEmits(['view-details', 'edit-reagent', 'delete-reagent', 'update-stock']);

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const isExpired = computed(() => {
  if (!props.reagent.expiry_date) return false;
  return new Date(props.reagent.expiry_date) < new Date();
});

const isExpiringSoon = computed(() => {
  if (!props.reagent.expiry_date || isExpired.value) return false;
  const today = new Date();
  const expiry = new Date(props.reagent.expiry_date);
  const thirtyDaysFromNow = new Date(today.setDate(today.getDate() + 30));
  return expiry < thirtyDaysFromNow;
});

const stockLevelClass = computed(() => {
  if (props.reagent.current_stock < props.reagent.min_stock_level) {
    return 'font-bold text-red-500';
  } else if (props.reagent.current_stock < props.reagent.min_stock_level * 1.2) { // Within 20% of min stock
    return 'font-semibold text-yellow-500';
  }
  return 'font-semibold text-green-600';
});
</script>

<style scoped>
/* Scoped styles if needed, Tailwind is preferred via classes */
</style>
