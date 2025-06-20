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

// Experiment Management Views
import ExperimentListView from './views/ExperimentListView.vue';
import ExperimentDetailView from './views/ExperimentDetailView.vue';
import ExperimentCreateView from './views/ExperimentCreateView.vue';

// Test Definition Views
import TestListView from './views/TestListView.vue';
import TestDetailView from './views/TestDetailView.vue';
import TestCreateView from './views/TestCreateView.vue';

// Sample Test (Run) Views
import TestQueueView from './views/TestQueueView.vue';
import SampleTestDetailView from './views/SampleTestDetailView.vue';

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
 
  {
    path: '/instrument-management',
    name: 'InstrumentManagement',
    // Dynamically import the component for lazy loading
    component: () => import('./views/InstrumentManagementView.vue'),
    meta: {
      requiresAuth: true,
      // Future enhancement: Add permission check here if possible, e.g.
      // requiresPermission: ['view_instruments'] or similar
      // This would require enhancing the beforeEach guard.
    }
  },
  {
    path: '/instrument-management/:id',
    name: 'InstrumentDetailView',
    component: () => import('./views/InstrumentDetailView.vue'),
    props: true, // Passes route params as props to the component
    meta: {
      requiresAuth: true,
      // requiresPermission: ['view_instruments'] // Or specific view_instrument_details
    }


  // Experiment Routes
  {
    path: '/experiments',
    name: 'ExperimentList',
    component: ExperimentListView,
    meta: { requiresAuth: true } // Add appropriate permissions later if needed
  },
  {
    path: '/experiments/new',
    name: 'ExperimentCreate',
    component: ExperimentCreateView,
    meta: { requiresAuth: true } // Add appropriate permissions later
  },
  {
    path: '/experiments/:id',
    name: 'ExperimentDetail',
    component: ExperimentDetailView,
    props: true,
    meta: { requiresAuth: true } // Add appropriate permissions later
  },

  // Test Definition Routes
  {
    path: '/tests',
    name: 'TestList',
    component: TestListView,
    meta: { requiresAuth: true } // Add appropriate permissions later
  },
  {
    path: '/tests/new',
    name: 'TestCreate',
    component: TestCreateView,
    meta: { requiresAuth: true } // Add appropriate permissions later
  },
  {
    path: '/tests/:id',
    name: 'TestDetail',
    component: TestDetailView,
    props: true,
    meta: { requiresAuth: true } // Add appropriate permissions later
  },

  // Sample Test (Run) Routes
  {
    path: '/sample-tests', // Or '/testing-queue', '/lab-queue'
    name: 'TestQueue',
    component: TestQueueView,
    meta: { requiresAuth: true } // Permissions: e.g., view_tests, enter_test_results
  },
  {
    path: '/sample-tests/:id',
    name: 'SampleTestDetail',
    component: SampleTestDetailView,
    props: true,
    meta: { requiresAuth: true } // Permissions: e.g., view_tests, enter_test_results

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
