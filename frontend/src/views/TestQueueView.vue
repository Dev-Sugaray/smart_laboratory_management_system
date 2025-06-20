<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">Sample Test Queue & Dashboard</h1>

    <!-- Filters Section (Basic Example) -->
    <div class="bg-white shadow-md rounded-lg p-4 mb-6">
      <h2 class="text-xl font-semibold mb-3">Filters</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label for="filter-status" class="block text-sm font-medium text-gray-700">Status</label>
          <select id="filter-status" v-model="filters.status" @change="applyFilters" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="">All Statuses</option>
            <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label for="filter-test-id" class="block text-sm font-medium text-gray-700">Test ID</label>
          <input type="number" id="filter-test-id" v-model.number="filters.test_id" @input="debouncedApplyFilters" placeholder="Enter Test ID" class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2">
        </div>
         <div>
          <label for="filter-sample-id" class="block text-sm font-medium text-gray-700">Sample ID (Numeric)</label>
          <input type="number" id="filter-sample-id" v-model.number="filters.sample_id" @input="debouncedApplyFilters" placeholder="Enter Sample ID" class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2">
        </div>
        <div>
          <button @click="resetFilters" class="mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
            Reset Filters
          </button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="text-center p-6">Loading all sample test requests...</div>
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      Error loading data: {{ error }}
    </div>
    <div v-else-if="allSampleTestRequests.length === 0" class="text-center p-6 text-gray-500">
      No sample test requests found matching your criteria.
    </div>

    <div v-else class="overflow-x-auto bg-white shadow-md rounded-lg">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample ID</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested At</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="req in allSampleTestRequests" :key="req.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ req.unique_sample_id }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ req.test_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" :class="statusBadgeClass(req.status)">
                {{ req.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ req.requested_by_username }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(req.requested_at) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ req.assigned_to_username || 'N/A' }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <router-link :to="`/sample-tests/${req.id}`" class="text-indigo-600 hover:text-indigo-900">
                View/Update
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useSampleTestStore } from '@/stores/sampleTests';
import debounce from 'lodash/debounce';

const store = useSampleTestStore();

const allSampleTestRequests = computed(() => store.allSampleTestRequests);
const isLoading = computed(() => store.loading);
const error = computed(() => store.error);

const filters = ref({
  status: '',
  test_id: null,
  sample_id: null,
  // assigned_to_user_id: null, // Add if backend supports
});

const statusOptions = ['Pending', 'In Progress', 'Completed', 'Validated', 'Approved', 'Rejected'];

const fetchData = () => {
  const activeFilters = {};
  for (const key in filters.value) {
    if (filters.value[key] !== '' && filters.value[key] !== null) {
      activeFilters[key] = filters.value[key];
    }
  }
  store.fetchAllSampleTestRequests(activeFilters);
};

onMounted(fetchData);

const applyFilters = () => {
  fetchData();
};

const debouncedApplyFilters = debounce(applyFilters, 500);

const resetFilters = () => {
  filters.value = { status: '', test_id: null, sample_id: null };
  fetchData();
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'In Progress': return 'bg-blue-100 text-blue-800';
    case 'Completed': return 'bg-green-100 text-green-800';
    case 'Validated': return 'bg-indigo-100 text-indigo-800';
    case 'Approved': return 'bg-purple-100 text-purple-800';
    case 'Rejected': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
</script>

<style scoped>
/* Tailwind utility classes are used primarily. Add custom styles if needed. */
</style>
