<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Experiments</h1>
      <router-link
        to="/experiments/new"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Create Experiment
      </router-link>
    </div>

    <div v-if="store.loading" class="text-center">
      <p>Loading experiments...</p>
      <!-- You can add a spinner or more sophisticated loading indicator here -->
    </div>

    <div v-if="store.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline">{{ store.error }}</span>
    </div>

    <div v-if="!store.loading && store.experiments.length === 0 && !store.error" class="text-center text-gray-500">
      No experiments found.
    </div>

    <div v-if="store.experiments.length > 0" class="overflow-x-auto">
      <table class="min-w-full bg-white shadow-md rounded-lg">
        <thead class="bg-gray-200">
          <tr>
            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="experiment in store.experiments" :key="experiment.id" class="hover:bg-gray-50">
            <td class="py-4 px-6 whitespace-nowrap">
              <router-link :to="`/experiments/${experiment.id}`" class="text-blue-600 hover:underline">
                {{ experiment.name }}
              </router-link>
            </td>
            <td class="py-4 px-6 whitespace-normal break-words">{{ experiment.description || 'N/A' }}</td>
            <td class="py-4 px-6 whitespace-nowrap">{{ formatDate(experiment.created_at) }}</td>
            <td class="py-4 px-6 whitespace-nowrap">
              <router-link
                :to="`/experiments/${experiment.id}`"
                class="text-indigo-600 hover:text-indigo-900 mr-3"
              >
                View/Edit
              </router-link>
              <button
                @click="confirmDelete(experiment.id)"
                class="text-red-600 hover:text-red-900"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useExperimentStore } from '@/stores/experiments';
import { useRouter } from 'vue-router';

const store = useExperimentStore();
const router = useRouter();

onMounted(() => {
  store.fetchExperiments();
});

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const confirmDelete = async (id) => {
  if (window.confirm('Are you sure you want to delete this experiment? This may affect related data.')) {
    try {
      await store.deleteExperiment(id);
      // Optionally, show a success notification
      // No need to manually refetch, deleteExperiment action handles list update
    } catch (error) {
      // Error should be set in store, or handle specific delete error display here
      alert(`Failed to delete experiment: ${store.error || error.message}`);
    }
  }
};
</script>

<style scoped>
/* Scoped styles if needed */
</style>
