import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoginView from './LoginView.vue'; // Adjust path as necessary
// import { useAuthStore } from '@/stores/auth'; // Not directly used here if fully mocking
import { describe, it, expect, beforeEach, vi }_from 'vitest';
import { nextTick } from 'vue';
import { createRouter, createWebHistory } from 'vue-router'; // Import for router setup

// Minimal routes for router initialization, can be empty if not testing navigation
const routes = [
  { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/profile', name: 'Profile', component: { template: '<div>Profile</div>' } },
  { path: '/register', name: 'Register', component: { template: '<div>Register</div>' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Mock the auth store
const mockLogin = vi.fn();
const mockUseAuthStore = vi.fn(() => ({
  login: mockLogin,
  isAuthenticated: false, // Default mock state
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: mockUseAuthStore,
}));

describe('LoginView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset mocks before each test
    mockLogin.mockReset();
    // Ensure router is in a known state if needed, though for these tests it's mainly a dependency
    router.push('/login').catch(() => {}); // Reset route to /login for each test
  });

  it('renders login form correctly', () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [router] // Provide the router instance
      }
    });
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.find('input#username').exists()).toBe(true);
    expect(wrapper.find('input#password').exists()).toBe(true);
    const button = wrapper.find('button[type="submit"]');
    expect(button.exists()).toBe(true);
    expect(button.text()).toBe('Login');
  });

  it('calls authStore.login on form submission and redirects on success', async () => {
    mockLogin.mockResolvedValue(true); // Simulate successful login

    const wrapper = mount(LoginView, {
      global: {
        plugins: [router]
      }
    });

    // Spy on router.push
    const routerPushSpy = vi.spyOn(router, 'push');

    await wrapper.find('input#username').setValue('testuser');
    await wrapper.find('input#password').setValue('password');
    await wrapper.find('form').trigger('submit.prevent');

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith({ username: 'testuser', password: 'password' });

    // Wait for Vue to process async updates (router navigation)
    await nextTick(); // For store action to resolve
    await nextTick(); // For router.push to be called and processed

    expect(routerPushSpy).toHaveBeenCalledWith('/profile'); // Default redirect path on success

    routerPushSpy.mockRestore(); // Clean up spy
  });

  it('displays error message on login failure (store returns false)', async () => {
    mockLogin.mockResolvedValue(false); // Simulate failed login

    const wrapper = mount(LoginView, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.find('input#username').setValue('testuser');
    await wrapper.find('input#password').setValue('wrongpassword');
    await wrapper.find('form').trigger('submit.prevent');

    await nextTick(); // Wait for error message to appear

    expect(mockLogin).toHaveBeenCalledTimes(1);
    // Check for an error message element. This assumes LoginView.vue has an element
    // that displays `errorMessage.value` when it's set.
    const errorMessageElement = wrapper.find('.text-red-500'); // As per LoginView.vue template
    expect(errorMessageElement.exists()).toBe(true);
    expect(errorMessageElement.text()).toContain('Login failed. Please check your username and password.');
  });

   it('shows loading state during login attempt', async () => {
    // Make login resolve slowly to check loading state
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 50)));

    const wrapper = mount(LoginView, {
      global: {
        plugins: [router]
      }
    });

    await wrapper.find('input#username').setValue('testuser');
    await wrapper.find('input#password').setValue('password');
    wrapper.find('form').trigger('submit.prevent'); // No await here to check intermediate state

    await nextTick(); // Allow Vue to react to isLoading = true

    const button = wrapper.find('button[type="submit"]');
    expect(button.text()).toBe('Logging in...');
    expect(button.attributes('disabled')).toBeDefined();

    // Wait for the login promise to resolve to avoid Vitest errors about unfinished async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    await nextTick(); // Allow Vue to react to isLoading = false
    expect(button.text()).toBe('Login'); // Assuming login was successful and it reset
  });

});
