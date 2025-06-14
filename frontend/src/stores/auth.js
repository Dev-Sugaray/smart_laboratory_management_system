import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user')) || null, // User object { id, username, email, full_name, role_name }
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    currentUser: (state) => state.user,
    userRole: (state) => state.user?.role_name,
  },
  actions: {
    async login(credentials) {
      try {
        const response = await axios.post('/api/login', credentials);
        if (response.data && response.data.token && response.data.user) { // Assuming backend sends user object along with token
          this.token = response.data.token;
          this.user = response.data.user; // Backend should ensure `role_name` is included
          localStorage.setItem('token', this.token);
          localStorage.setItem('user', JSON.stringify(this.user));
          axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`; // Set for subsequent requests
          return true;
        }
        return false; // Or throw error
      } catch (error) {
        console.error('Login failed:', error.response?.data?.error || error.message);
        // Potentially clear token/user if login fails with auth error
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            this.logout(); // Ensure clean state
        }
        return false;
      }
    },
    async register(userInfo) {
      try {
        await axios.post('/api/register', userInfo);
        return true;
      } catch (error) {
        console.error('Registration failed:', error.response?.data?.error || error.message);
        return false;
      }
    },
    async fetchProfile() {
      if (!this.token) return; // No token, no profile to fetch
      try {
        // Ensure Authorization header is set if not already (e.g., on app load)
        if (!axios.defaults.headers.common['Authorization']) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        }
        const response = await axios.get('/api/profile');
        if (response.data) {
          this.user = response.data; // Expects { id, username, email, full_name, role_name }
          localStorage.setItem('user', JSON.stringify(this.user));
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error.response?.data?.error || error.message);
        // If auth error (e.g. token expired), logout user
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          this.logout(); // This will clear token and user, router guards will redirect
          // Optionally re-throw or throw a specific error to be caught by caller in App.vue
          throw error;
        }
      }
    },
    async updateProfile(profileData) {
      if (!this.token) return false;
      try {
        const response = await axios.put('/api/profile', profileData); // Auth header should be set
        if (response.data) { // Assuming backend returns the updated user profile or a success message
          // If backend returns the full updated user object:
          // this.user = { ...this.user, ...response.data };
          // Or, more robustly, merge what's returned if it's partial or just confirmation
          this.user = { ...this.user, ...profileData }; // Optimistically update with what was sent
          if(response.data.user) { // If backend sends back the full user object
            this.user = response.data.user;
          } else if (response.data.message && response.data.updatedFields) { // Or if it sends specific updated fields
             this.user = { ...this.user, ...response.data.updatedFields};
          }
          localStorage.setItem('user', JSON.stringify(this.user));
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to update profile:', error.response?.data?.error || error.message);
        return false;
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization']; // Clear auth header
      console.log('Logout action called');
      // Navigation should be handled by the component calling logout or by router guards
    },
    async fetchAllUsers() {
      if (!this.token || this.user?.role_name !== 'administrator') {
        console.warn('Fetch all users called by non-admin or unauthenticated user.');
        return []; // Or throw error
      }
      try {
        const response = await axios.get('/api/admin/users'); // Auth header should be set
        return response.data || []; // Expects an array of users
      } catch (error) {
        console.error('Failed to fetch all users:', error.response?.data?.error || error.message);
        return []; // Or throw error
      }
    },
    // Helper to set token and user, could be used on app init if needed
    // Or to rehydrate from localStorage if not done in state definition
    initAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        if (token && user) {
            this.token = token;
            this.user = user;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    }
  },
});
