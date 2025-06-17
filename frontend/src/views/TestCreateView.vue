<template>
  <div class="container mx-auto p-4 max-w-lg">
    <h1 class="text-2xl font-bold mb-6">Create New Test Definition</h1>
    <form @submit.prevent="handleSubmit" class="bg-white shadow-md rounded-lg p-6">
      <div class="mb-4">
        <label for="test-name" class="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          id="test-name"
          v-model="test.name"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>
      <div class="mb-4">
        <label for="test-description" class="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="test-description"
          v-model="test.description"
          rows="3"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></textarea>
      </div>
      <div class="mb-6">
        <label for="test-protocol" class="block text-sm font-medium text-gray-700">Protocol</label>
        <textarea
          id="test-protocol"
          v-model="test.protocol"
          rows="5"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></textarea>
      </div>

      <div v-if="error" class="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline">{{ error }}</span>
      </div>

      <div class="flex items-center justify-end space-x-3">
        <router-link
          to="/tests"
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
          <span v-else>Create Test Definition</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useTestStore } from '@/stores/tests'; // Corrected store name
import { useRouter } from 'vue-router';

const store = useTestStore();
const router = useRouter();

const test = reactive({
  name: '',
  description: '',
  protocol: '',
});

const loading = ref(false);
const error = ref(null);

const handleSubmit = async () => {
  if (!test.name.trim()) {
    error.value = 'Test definition name is required.';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const success = await store.createTest({
      name: test.name,
      description: test.description,
      protocol: test.protocol,
    });
    if (success) {
      router.push('/tests'); // Navigate to list view on success
    }
  } catch (err) {
    error.value = store.error || err.message || 'Failed to create test definition.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Scoped styles if needed */
</style>
