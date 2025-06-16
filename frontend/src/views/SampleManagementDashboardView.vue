<template>
  <div class="container">
    <h1 class="title">Sample Management Dashboard</h1>

    <div class="block columns is-vcentered">
      <div class="column">
        <p>This is the main dashboard for managing samples.</p>
      </div>
      <div class="column is-narrow">
        <router-link to="/samples/register" class="button is-primary">
          Register New Sample
        </router-link>
      </div>
    </div>

    <div class="block menu-like-nav">
        <p class="menu-label">Management Sections</p>
        <ul class="menu-list">
            <li><router-link to="/manage/sample-types">Manage Sample Types</router-link></li>
            <li><router-link to="/manage/sources">Manage Sources</router-link></li>
            <li><router-link to="/manage/storage">Manage Storage Locations</router-link></li>
        </ul>
    </div>

    <div v-if="storeError" class="notification is-danger is-light">
      <button class="delete" @click="clearStoreError"></button>
      Error fetching samples: {{ storeError }}
    </div>

    <h2 class="subtitle mt-5">All Samples</h2>
    <SampleList
      :samples="samplesList"
      :isLoading="isLoading"
      @view-sample-details="handleViewDetails"
    />
    <!-- Add Pagination controls here later if needed -->

  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSampleManagementStore } from '@/stores/sampleManagement';
import SampleList from '@/components/sample_management/SampleList.vue';

const store = useSampleManagementStore();
const router = useRouter();

const samplesList = computed(() => store.samples);
const isLoading = computed(() => store.isLoading);
const storeError = computed(() => store.error);
// const pagination = computed(() => store.samplesPagination); // For future pagination

onMounted(() => {
  // Clear any previous errors when component mounts, especially for this view
  store.error = null;
  store.fetchSamples(); // Default params: { limit: 10, offset: 0 }
});

const handleViewDetails = (sample) => {
  console.log('View details for sample:', sample.id);
  // The store's fetchSampleDetails will be called by SampleDetailView on its mount
  // Or we can set currentSample here if preferred: store.currentSample = sample;
  router.push({ name: 'SampleDetail', params: { id: sample.id } });
};

const clearStoreError = () => {
    store.error = null;
}

</script>

<style scoped>
.container {
  padding: 20px;
}
.title {
  font-size: 2rem; /* Bulma .title is-2 */
  font-weight: bold;
  margin-bottom: 1.5rem;
}
.subtitle {
  font-size: 1.5rem; /* Bulma .subtitle is-4 or is-3 */
  margin-top: 1.5rem; /* mt-5 */
  margin-bottom: 1rem;
}
.block:not(:last-child) {
  margin-bottom: 1.5rem;
}
.button.is-primary {
  background-color: #00d1b2; /* Bulma's primary color */
  color: white;
  border: none;
}
.menu-like-nav .menu-label {
    color: #7a7a7a;
    font-size: 0.875em; /* Bulma .menu-label */
    letter-spacing: .1em;
    text-transform: uppercase;
    margin-bottom: 0.5em;
}
.menu-like-nav .menu-list a {
    color: #4a4a4a; /* Bulma .menu-list a */
    display: block;
    padding: .5em .75em;
    border-radius: 2px;
}
.menu-like-nav .menu-list a:hover {
    background-color: #f5f5f5; /* Bulma .menu-list a:hover */
    color: #363636;
}
.menu-like-nav .menu-list a.router-link-exact-active { /* If you want active state for these */
    background-color: #3273dc; /* Bulma primary for active */
    color: #fff;
}

.notification {
  margin-top: 1rem;
  margin-bottom: 1rem;
  padding: 1rem 1.5rem;
  border-radius: 4px;
  position: relative;
}
.notification.is-danger.is-light {
  background-color: #feecf0;
  color: #cc0f35;
}
.notification .delete {
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
    background: rgba(10,10,10,.2);
    border: none;
    border-radius: 290486px;
    cursor: pointer;
    display: inline-block;
    font-size: 1rem;
    height: 20px;
    line-height: 20px;
    outline: none;
    padding: 0;
    text-align: center;
    vertical-align: top;
    width: 20px;
}
.notification .delete::before, .notification .delete::after {
    background-color: #fff;
    content: "";
    display: block;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translateX(-50%) translateY(-50%) rotate(45deg);
    transform-origin: center center;
}
.notification .delete::before { height: 2px; width: 50%; }
.notification .delete::after { height: 50%; width: 2px; }

.mt-5 {
    margin-top: 1.25rem; /* approx Bulma .mt-5 */
}
</style>
