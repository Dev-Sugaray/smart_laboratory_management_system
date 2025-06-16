<template>
  <div class="container">
    <h1 class="title">Register New Sample</h1>

    <div v-if="formSubmitError" class="notification is-danger is-light">
      <button class="delete" @click="clearFormError"></button>
      Error submitting form: {{ formSubmitError }}
    </div>
    <div v-if="successMessage" class="notification is-success is-light">
      <button class="delete" @click="clearSuccessMessage"></button>
      {{ successMessage }}
    </div>
     <div v-if="storeFetchError && !formSubmitError" class="notification is-danger is-light">
      <button class="delete" @click="clearStoreFetchError"></button>
      Error loading data: {{ storeFetchError }}
    </div>

    <SampleForm
      :sampleTypes="sampleTypes"
      :sources="sources"
      :storageLocations="storageLocations"
      :isLoading="isSubmitting"
      :isEditMode="false"
      @submit-sample="handleRegisterSample"
      @cancel="handleCancelRegistration"
    />
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSampleManagementStore } from '@/stores/sampleManagement';
import SampleForm from '@/components/sample_management/SampleForm.vue';

const store = useSampleManagementStore();
const router = useRouter();

const sampleTypes = computed(() => store.sampleTypes);
const sources = computed(() => store.sources);
const storageLocations = computed(() => store.storageLocations);
const isSubmitting = computed(() => store.isLoading); // Reflects store's global loading for submission
const storeFetchError = computed(() => store.error); // For errors during initial data fetch

const successMessage = ref('');
const formSubmitError = ref(''); // Specific for submission errors to distinguish from fetch errors

onMounted(async () => {
  // Clear previous errors when component mounts
  store.error = null;

  // Fetch all necessary data for the form dropdowns
  // Run in parallel
  const fetchPromises = [
    store.fetchSampleTypes(),
    store.fetchSources(),
    store.fetchStorageLocations()
  ];
  try {
    await Promise.all(fetchPromises);
    console.log('All dropdown data fetched for sample registration.');
  } catch (error) {
    // Error is already set in the store by the actions if they fail individually
    console.error('Error fetching data for registration form:', error.message);
    // storeFetchError will display the error from the store
  }
});

const clearFormError = () => {
  formSubmitError.value = '';
  store.error = null; // Also clear store error if it was related to form submission
};
const clearSuccessMessage = () => {
  successMessage.value = '';
};
const clearStoreFetchError = () => {
    store.error = null;
}

const handleRegisterSample = async (formData) => {
  clearFormError();
  clearSuccessMessage();
  console.log('Registering sample with data:', formData);
  try {
    const newSample = await store.registerSample(formData);
    successMessage.value = `Sample "${newSample.unique_sample_id}" registered successfully! ID: ${newSample.id}`;
    // Optionally, reset form or navigate
    // For now, messages will clear on next action or component re-mount
    // Could redirect to the sample detail page: router.push(`/samples/${newSample.id}`);
    // Or to the dashboard: router.push('/samples');
  } catch (error) {
    formSubmitError.value = error.message || 'An unknown error occurred during sample registration.';
    console.error('Failed to register sample (view):', error.message);
  }
};

const handleCancelRegistration = () => {
  console.log('Sample registration cancelled.');
  // Clear form by navigating away or resetting form state if it were local
  router.back(); // Or router.push('/samples');
};
</script>

<style scoped>
.container {
  padding: 20px;
  max-width: 800px; /* Limit width for better form readability */
  margin: auto;
}
.title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
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
.notification.is-success.is-light {
  background-color: #effaf5;
  color: #257953;
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
</style>
