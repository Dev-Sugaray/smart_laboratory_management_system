import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import AboutView from './views/AboutView.vue';
import LoginView from './views/LoginView.vue';
import RegisterView from './views/RegisterView.vue';
import ProfileView from './views/ProfileView.vue';
import UserManagementView from './views/UserManagementView.vue'; // Placeholder

// Sample Management Views
import SampleManagementDashboardView from './views/SampleManagementDashboardView.vue';
import SampleRegistrationView from './views/SampleRegistrationView.vue';
import SampleDetailView from './views/SampleDetailView.vue';
import StorageListView from './views/StorageListView.vue';
import SampleTypeListView from './views/SampleTypeListView.vue';
import SourceListView from './views/SourceListView.vue';

import { useAuthStore } from './stores/auth';

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/about', name: 'About', component: AboutView },
  { path: '/login', name: 'Login', component: LoginView, meta: { guestOnly: true } },
  { path: '/register', name: 'Register', component: RegisterView, meta: { guestOnly: true } },
  { path: '/profile', name: 'Profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/admin/users', name: 'UserManagement', component: UserManagementView, meta: { requiresAuth: true, requiresRole: 'administrator' } }, // Example admin route

  // Sample Management Routes
  {
    path: '/samples',
    name: 'SampleManagementDashboard',
    component: SampleManagementDashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/samples/register',
    name: 'SampleRegistration',
    component: SampleRegistrationView,
    meta: { requiresAuth: true }
  },
  {
    path: '/samples/:id',
    name: 'SampleDetail',
    component: SampleDetailView,
    props: true,
    meta: { requiresAuth: true }
  },
  {
    path: '/manage/storage',
    name: 'StorageList',
    component: StorageListView,
    meta: { requiresAuth: true }
  },
  {
    path: '/manage/sample-types',
    name: 'SampleTypeList',
    component: SampleTypeListView,
    meta: { requiresAuth: true }
  },
  {
    path: '/manage/sources',
    name: 'SourceList',
    component: SourceListView,
    meta: { requiresAuth: true }
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Ensure BASE_URL is correctly configured if not root
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore(); // Initialize store here, as it's outside component setup

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' });
  } else if (to.meta.guestOnly && authStore.isAuthenticated) {
    next({ name: 'Profile' }); // Or 'Home'
  } else if (to.meta.requiresRole && authStore.userRole !== to.meta.requiresRole) {
    // Optional: Check role if route requires a specific role
    // You might want a more sophisticated role check (e.g., array of roles, permissions check)
    alert('You do not have access to this page.'); // Simple feedback
    next(from.path === to.path ? {name: 'Home'} : false); // Stay on the current page or go home
  }
  else {
    next();
  }
});

export default router;
