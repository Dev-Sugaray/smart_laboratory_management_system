<template>
  <div class="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
    <div v-if="authStore.currentUser" class="space-y-6">
      <h1 class="text-3xl font-bold text-gray-900">User Profile</h1>

      <!-- Display Profile Section -->
      <div v-if="!editMode" class="p-6 bg-white rounded-lg shadow">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p class="text-sm font-medium text-gray-500">Username</p>
            <p class="mt-1 text-lg text-gray-900">{{ authStore.currentUser.username }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Email</p>
            <p class="mt-1 text-lg text-gray-900">{{ authStore.currentUser.email }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Full Name</p>
            <p class="mt-1 text-lg text-gray-900">{{ authStore.currentUser.full_name }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Role</p>
            <p class="mt-1 text-lg text-gray-900 capitalize">{{ authStore.currentUser.role_name }}</p>
          </div>
        </div>
        <button
          @click="toggleEditMode"
          class="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Edit Profile
        </button>
      </div>

      <!-- Edit Profile Section -->
      <div v-else class="p-6 bg-white rounded-lg shadow">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Edit Profile</h2>
        <form @submit.prevent="handleProfileUpdate" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              v.model="editableProfile.email"
              required
              class="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="full_name" class="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              id="full_name"
              v.model="editableProfile.full_name"
              required
              class="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div v-if="updateMessage" :class="isError ? 'text-red-500' : 'text-green-500'" class="text-sm">
            {{ updateMessage }}
          </div>
          <div class="flex space-x-3">
            <button
              type="submit"
              :disabled="isLoading"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <span v-if="isLoading">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
            <button
              type="button"
              @click="toggleEditMode"
              class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
    <div v-else class="text-center text-gray-500">
      <p>Loading profile...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const editMode = ref(false);
const isLoading = ref(false);
const updateMessage = ref('');
const isError = ref(false);

// Use reactive for editableProfile to ensure two-way binding works as expected for form fields
const editableProfile = reactive({
  email: '',
  full_name: '',
});

// Initialize editableProfile when component mounts or currentUser changes
onMounted(() => {
  if (authStore.currentUser) {
    editableProfile.email = authStore.currentUser.email;
    editableProfile.full_name = authStore.currentUser.full_name;
  }
});

const toggleEditMode = () => {
  editMode.value = !editMode.value;
  if (editMode.value && authStore.currentUser) {
    // Reset form fields to current user data when entering edit mode
    editableProfile.email = authStore.currentUser.email;
    editableProfile.full_name = authStore.currentUser.full_name;
    updateMessage.value = ''; // Clear previous messages
    isError.value = false;
  }
};

const handleProfileUpdate = async () => {
  isLoading.value = true;
  updateMessage.value = '';
  isError.value = false;

  try {
    // Only send fields that are being updated if backend supports partial updates.
    // For simplicity, sending both. Backend should handle if they are unchanged.
    const success = await authStore.updateProfile({
      email: editableProfile.email,
      full_name: editableProfile.full_name,
    });

    if (success) {
      updateMessage.value = 'Profile updated successfully!';
      isError.value = false;
      setTimeout(() => {
        editMode.value = false; // Exit edit mode on success
        updateMessage.value = ''; // Clear message
      }, 2000);
    } else {
      updateMessage.value = 'Failed to update profile. The email might be taken or an error occurred.';
      isError.value = true;
    }
  } catch (error) {
    updateMessage.value = error.message || 'An unexpected error occurred.';
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};
</script>
