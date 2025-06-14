<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
      <h1 class="text-2xl font-bold text-center text-gray-900">Create an Account</h1>
      <form @submit.prevent="handleRegister" class="space-y-6">
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
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            v.model="email"
            required
            class="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label for="full_name" class="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            id="full_name"
            v.model="full_name"
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
         <div>
          <label for="confirm_password" class="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input
            type="password"
            id="confirm_password"
            v.model="confirm_password"
            required
            class="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div v-if="errorMessage" class="text-red-500 text-sm">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="text-green-500 text-sm">
          {{ successMessage }}
        </div>
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <span v-if="isLoading">Registering...</span>
            <span v-else>Register</span>
          </button>
        </div>
      </form>
      <p class="text-sm text-center text-gray-600">
        Already have an account?
        <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">Login here</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const username = ref('');
const email = ref('');
const full_name = ref('');
const password = ref('');
const confirm_password = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);

const authStore = useAuthStore();
const router = useRouter();

const handleRegister = async () => {
  if (password.value !== confirm_password.value) {
    errorMessage.value = 'Passwords do not match.';
    return;
  }
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const success = await authStore.register({
      username: username.value,
      email: email.value,
      full_name: full_name.value,
      password: password.value,
    });

    if (success) {
      successMessage.value = 'Registration successful! Please login.';
      // Clear form
      username.value = '';
      email.value = '';
      full_name.value = '';
      password.value = '';
      confirm_password.value = '';
      // Optionally redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      errorMessage.value = 'Registration failed. Please try again. The username or email might already be taken.';
    }
  } catch (error) {
    errorMessage.value = error.message || 'An unexpected error occurred during registration.';
  } finally {
    isLoading.value = false;
  }
};
</script>
