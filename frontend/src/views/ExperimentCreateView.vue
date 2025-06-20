<template>
  <div class="container mx-auto p-4 max-w-lg">
    <h1 class="text-2xl font-bold mb-6">Create New Experiment</h1>
    <form @submit.prevent="handleSubmit" class="bg-white shadow-md rounded-lg p-6">
      <div class="mb-4">
        <label for="exp-name" class="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          id="exp-name"
          v-model="experiment.name"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>
      <div class="mb-6">
        <label for="exp-description" class="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="exp-description"
          v-model="experiment.description"
          rows="4"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></textarea>
      </div>

      <div v-if="error" class="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline">{{ error }}</span>
      </div>

      <div class="flex items-center justify-end space-x-3">
        <router-link
          to="/experiments"
          class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
        >
          Cancel
        </router-link>
        <button
          type="submit"
          :disabled="loading"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          <span v-if="loading">Creating...</span>
          <span v-else>Create Experiment</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useExperimentStore } from '@/stores/experiments';
import { useRouter } from 'vue-router';

const store = useExperimentStore();
const router = useRouter();

const experiment = reactive({
  name: '',
  description: '',
});

const loading = ref(false);
const error = ref(null);

const handleSubmit = async () => {
  if (!experiment.name.trim()) {
    error.value = 'Experiment name is required.';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const success = await store.createExperiment({
      name: experiment.name,
      description: experiment.description,
    });
    if (success) {
      router.push('/experiments'); // Navigate to list view on success
    }
  } catch (err) {
    error.value = store.error || err.message || 'Failed to create experiment.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Scoped styles if needed */
</style>
