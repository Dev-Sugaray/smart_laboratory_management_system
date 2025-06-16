import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth'; // Assuming this path is correct from within stores directory
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('Auth Store', () => {
  let mockAxios;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockAxios = new MockAdapter(axios);
    localStorage.clear();
    // Reset any default headers that might persist between tests
    axios.defaults.headers.common['Authorization'] = undefined;
  });

  afterEach(() => {
    mockAxios.restore();
    localStorage.clear();
     // Clear all mocks
    vi.clearAllMocks();
  });

  it('initial state is correct from localStorage (empty)', () => {
    const store = useAuthStore();
    expect(store.token).toBe(null);
    expect(store.user).toBe(null);
    expect(store.isAuthenticated).toBe(false);
  });

  it('initial state loads from localStorage (populated)', () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('user', JSON.stringify({ id: 2, username: 'localuser', role_name: 'editor' }));
    const store = useAuthStore(); // Store initialization reads from localStorage
    expect(store.token).toBe('stored-token');
    expect(store.user).toEqual({ id: 2, username: 'localuser', role_name: 'editor' });
    expect(store.isAuthenticated).toBe(true);
  });

  it('login action success', async () => {
    const store = useAuthStore();
    const userData = { id: 1, username: 'test', email: 'test@example.com', full_name: 'Test User', role_name: 'researcher' };
    const token = 'fake-jwt-token';
    mockAxios.onPost('/api/login').reply(200, { token, user: userData });

    const result = await store.login({ username: 'test', password: 'password' });

    expect(result).toBe(true);
    expect(store.token).toBe(token);
    expect(store.user).toEqual(userData);
    expect(store.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe(token);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(userData);
    expect(axios.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`);
  });

  it('login action failure (network error)', async () => {
    const store = useAuthStore();
    mockAxios.onPost('/api/login').networkError();

    const result = await store.login({ username: 'test', password: 'password' });

    expect(result).toBe(false);
    expect(store.token).toBe(null);
    expect(store.user).toBe(null);
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBe(null);
  });

  it('login action failure (401)', async () => {
    const store = useAuthStore();
    mockAxios.onPost('/api/login').reply(401, { error: 'Invalid credentials' });

    const result = await store.login({ username: 'test', password: 'wrongpassword' });

    expect(result).toBe(false);
    expect(store.token).toBe(null);
    expect(store.user).toBe(null);
    expect(store.isAuthenticated).toBe(false);
  });


  it('register action success', async () => {
    const store = useAuthStore();
    mockAxios.onPost('/api/register').reply(201, { message: 'User registered successfully' });
    const result = await store.register({ username: 'newuser', password: 'password', email: 'new@example.com', full_name: 'New User'});
    expect(result).toBe(true);
  });

  it('register action failure', async () => {
    const store = useAuthStore();
    mockAxios.onPost('/api/register').reply(400, { error: 'Username already exists' });
    const result = await store.register({ username: 'newuser', password: 'password', email: 'new@example.com', full_name: 'New User'});
    expect(result).toBe(false);
  });

  it('logout action clears state, localStorage, and axios header', () => {
    const store = useAuthStore();
    // Simulate logged-in state
    const token = 'fake-token-for-logout';
    const userData = { id: 1, username: 'testlogout', role_name: 'tester' };
    store.token = token;
    store.user = userData;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    store.logout();

    expect(store.token).toBe(null);
    expect(store.user).toBe(null);
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBe(null);
    expect(localStorage.getItem('user')).toBe(null);
    expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
  });

  it('fetchProfile success', async () => {
    const store = useAuthStore();
    const initialToken = 'profile-token';
    store.token = initialToken; // Simulate token being present (e.g. from localStorage on app load)
    localStorage.setItem('token', initialToken); // Ensure localStorage has it for store's init logic too if it re-reads
    axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;


    const profileData = { id: 3, username: 'profileUser', email: 'profile@example.com', full_name: 'Profile User', role_name: 'editor' };
    mockAxios.onGet('/api/profile').reply(200, profileData);

    await store.fetchProfile();

    expect(store.user).toEqual(profileData);
    expect(store.isAuthenticated).toBe(true); // Assuming token was already set for this call
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(profileData);
  });

  it('fetchProfile failure (401) should logout user', async () => {
    const store = useAuthStore();
    const initialToken = 'invalid-profile-token';
    store.token = initialToken;
    localStorage.setItem('token', initialToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;

    mockAxios.onGet('/api/profile').reply(401);

    try {
        await store.fetchProfile();
    } catch (e) {
        // Error is expected to be thrown by fetchProfile on auth failure
    }

    expect(store.token).toBe(null);
    expect(store.user).toBe(null);
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBe(null);
    expect(localStorage.getItem('user')).toBe(null);
    expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
  });

  it('updateProfile success', async () => {
    const store = useAuthStore();
    const initialToken = 'update-token';
    const initialUser = { id: 1, username: 'updater', email: 'old@example.com', full_name: 'Old Name', role_name: 'user' };
    store.token = initialToken;
    store.user = initialUser;
    localStorage.setItem('token', initialToken);
    localStorage.setItem('user', JSON.stringify(initialUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;

    const updates = { email: 'new@example.com', full_name: 'New Name' };
    const expectedUser = { ...initialUser, ...updates };
    // Assume backend returns the updated user object or a success message with the new fields
    mockAxios.onPut('/api/profile').reply(200, { user: expectedUser });

    const result = await store.updateProfile(updates);

    expect(result).toBe(true);
    expect(store.user).toEqual(expectedUser);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(expectedUser);
  });

  it('fetchAllUsers success (as admin)', async () => {
    const store = useAuthStore();
    const adminToken = 'admin-token';
    const adminUser = { id: 1, username: 'admin', role_name: 'administrator' };
    store.token = adminToken;
    store.user = adminUser; // Set user as admin
    axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

    const usersList = [{ id: 2, username: 'user1' }, { id: 3, username: 'user2' }];
    mockAxios.onGet('/api/admin/users').reply(200, usersList);

    const result = await store.fetchAllUsers();
    expect(result).toEqual(usersList);
  });

  it('fetchAllUsers fails for non-admin', async () => {
    const store = useAuthStore();
    const userToken = 'user-token';
    const regularUser = { id: 2, username: 'user', role_name: 'researcher' };
    store.token = userToken;
    store.user = regularUser; // Set user as non-admin
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;

    // No mock for /api/admin/users as it shouldn't be called by client-side check
    const result = await store.fetchAllUsers();
    expect(result).toEqual([]); // Action returns empty array for non-admins
  });

});
