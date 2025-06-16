<template>
  <div class="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">User Management</h1>
    <div v-if="isLoading" class="text-center text-gray-500">
      <p>Loading users...</p>
      <!-- Optional: Add a spinner or more elaborate loading indicator -->
    </div>
    <div v-else-if="fetchError" class="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
      <span class="font-medium">Error!</span> {{ fetchError }}
    </div>
    <div v-else-if="users.length === 0" class="text-center text-gray-500">
      <p>No users found.</p>
    </div>
    <div v-else class="overflow-x-auto bg-white rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in users" :key="user.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ user.id }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.username }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.full_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{{ user.role_name }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const users = ref([]);
const isLoading = ref(false);
const fetchError = ref('');
const authStore = useAuthStore();

onMounted(async () => {
  if (authStore.userRole === 'administrator') {
    isLoading.value = true;
    fetchError.value = '';
    try {
      // The fetchAllUsers action in the store is expected to handle actual API call
      // and return the list of users or throw an error.
      const fetchedUsers = await authStore.fetchAllUsers();
      users.value = fetchedUsers;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      fetchError.value = error.message || 'An unexpected error occurred while fetching users.';
    } finally {
      isLoading.value = false;
    }
  } else {
    fetchError.value = 'You do not have permission to view this page.';
    // Or redirect, though router guards should primarily handle this.
  }
});
</script>
