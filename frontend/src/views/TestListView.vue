<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Test Definitions</h1>
      <router-link
        to="/tests/new"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Create Test Definition
      </router-link>
    </div>

    <div v-if="store.loading" class="text-center">
      <p>Loading test definitions...</p>
    </div>

    <div v-if="store.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline">{{ store.error }}</span>
    </div>

    <div v-if="!store.loading && store.tests.length === 0 && !store.error" class="text-center text-gray-500">
      No test definitions found.
    </div>

    <div v-if="store.tests.length > 0" class="overflow-x-auto">
      <table class="min-w-full bg-white shadow-md rounded-lg">
        <thead class="bg-gray-200">
          <tr>
            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol Snippet</th>
            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
            <th class="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="test in store.tests" :key="test.id" class="hover:bg-gray-50">
            <td class="py-4 px-6 whitespace-nowrap">
              <router-link :to="`/tests/${test.id}`" class="text-blue-600 hover:underline">
                {{ test.name }}
              </router-link>
            </td>
            <td class="py-4 px-6 whitespace-normal break-words">{{ test.description || 'N/A' }}</td>
            <td class="py-4 px-6 whitespace-normal break-words">{{ truncate(test.protocol, 50) || 'N/A' }}</td>
            <td class="py-4 px-6 whitespace-nowrap">{{ formatDate(test.created_at) }}</td>
            <td class="py-4 px-6 whitespace-nowrap">
              <router-link
                :to="`/tests/${test.id}`"
                class="text-indigo-600 hover:text-indigo-900 mr-3"
              >
                View/Edit
              </router-link>
              <button
                @click="confirmDelete(test.id)"
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
import { useTestStore } from '@/stores/tests'; // Corrected store name
import { useRouter } from 'vue-router';

const store = useTestStore();
const router = useRouter();

onMounted(() => {
  store.fetchTests();
});

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const truncate = (text, length) => {
  if (text && text.length > length) {
    return text.substring(0, length) + '...';
  }
  return text;
};

const confirmDelete = async (id) => {
  if (window.confirm('Are you sure you want to delete this test definition? This may affect related data like experiment configurations and historical sample test records if ON DELETE CASCADE is not fully effective or if related data is not meant to be deleted.')) {
    try {
      await store.deleteTest(id);
      // store.fetchTests(); // Re-fetch or rely on optimistic update in store
    } catch (error) {
      alert(`Failed to delete test definition: ${store.error || error.message}`);
    }
  }
};
</script>

<style scoped>
/* Scoped styles if needed */
</style>
