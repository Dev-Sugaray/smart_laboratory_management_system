import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import HomeView from './HomeView.vue';

// Mock Vue Router's components if they cause issues in simple unit tests
vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn(),
  createRouter: vi.fn(() => ({ beforeEach: vi.fn() })), // Mock createRouter if needed by imports
  createWebHistory: vi.fn(), // Mock createWebHistory
  RouterLink: { template: '<a><slot /></a>' }, // Simple stub for RouterLink
  RouterView: { template: '<div></div>' } // Simple stub for RouterView
}));

describe('HomeView.vue', () => {
  it('renders the welcome message', () => {
    const wrapper = mount(HomeView);
    expect(wrapper.text()).toContain('Welcome to the Home Page!');
  });
});
