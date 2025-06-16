<template>
  <div id="app">
    <nav class="bg-gray-800 text-white p-4">
      <router-link to="/" class="mr-4 hover:text-gray-300">Home</router-link>
      <router-link to="/about" class="mr-4 hover:text-gray-300">About</router-link>
      <router-link v-if="!authStore.isAuthenticated" to="/login" class="mr-4 hover:text-gray-300">Login</router-link>
      <router-link v-if="!authStore.isAuthenticated" to="/register" class="mr-4 hover:text-gray-300">Register</router-link>
      <router-link v-if="authStore.isAuthenticated" to="/profile" class="mr-4 hover:text-gray-300">Profile</router-link>
      <router-link v-if="authStore.isAuthenticated" to="/samples" class="mr-4 hover:text-gray-300">Sample Management</router-link>
      <router-link v-if="authStore.isAuthenticated && authStore.userRole === 'administrator'" to="/admin/users" class="mr-4 hover:text-gray-300">User Management</router-link>
      <button v-if="authStore.isAuthenticated" @click="handleLogout" class="hover:text-gray-300">Logout</button>
    </nav>
    <router-view class="p-4"/>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  // It's good practice to also ensure router is ready before pushing
  router.isReady().then(() => {
    router.push('/login');
  });
};

onMounted(() => {
  // Attempt to initialize auth from localStorage first (in case of page refresh)
  // The store's state definition already does this, but an explicit call can ensure headers etc. are set.
  // authStore.initAuth(); // If you added this helper in the store

  if (authStore.token && !authStore.isAuthenticated) { // Check isAuthenticated which relies on user object
    authStore.fetchProfile().catch(error => {
      console.error("Failed to fetch profile on app load:", error.message);
      // If token is invalid (e.g., expired or server rejected), logout might have already been called in fetchProfile
      // If not, or to be sure:
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        // The store's fetchProfile should ideally call logout() internally on auth failure.
        // If it doesn't, or to be absolutely sure the router reacts:
        if (authStore.isAuthenticated) { // check if logout was already done by store
            authStore.logout();
        }
        router.isReady().then(() => {
            router.push('/login');
        });
      }
    });
  }
});
</script>

<style>
/* Basic styles, Tailwind will handle most */
/* You can remove this if index.css @tailwind base; covers global font styles sufficiently */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align: center; */ /* Often not desired for full-page apps */
  color: #2c3e50;
}
/* Ensure router-link-exact-active styles are compatible with Tailwind if needed, or rely on Tailwind for active states */
/* nav a.router-link-exact-active {
  color: #42b983;
} */
</style>
