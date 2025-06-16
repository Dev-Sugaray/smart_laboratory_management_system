<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
      <h1 class="text-2xl font-bold text-center text-gray-900">Login</h1>
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            id="username"
            v.model="username"
            required
            class="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            id="password"
            v.model="password"
            required
            class="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div v-if="errorMessage" class="text-red-500 text-sm">
          {{ errorMessage }}
        </div>
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <span v-if="isLoading">Logging in...</span>
            <span v-else>Login</span>
          </button>
        </div>
      </form>
      <p class="text-sm text-center text-gray-600">
        Don't have an account?
        <router-link to="/register" class="font-medium text-indigo-600 hover:text-indigo-500">Register here</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const success = await authStore.login({ username: username.value, password: password.value });
    if (success) {
      // Navigate to profile or intended page (if any was stored by router guard)
      const redirectPath = router.currentRoute.value.query.redirect || '/profile';
      router.push(redirectPath);
    } else {
      errorMessage.value = 'Login failed. Please check your username and password.';
    }
  } catch (error) {
    // This catch block might be redundant if store action handles all errors and returns false
    errorMessage.value = error.message || 'An unexpected error occurred.';
  } finally {
    isLoading.value = false;
  }
};
</script>
