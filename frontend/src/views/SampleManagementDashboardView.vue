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

    <!-- Batch Test Request Section -->
    <div class="box batch-request-section mt-5">
      <h2 class="title is-4">Batch Test Request</h2>
      <form @submit.prevent="handleBatchTestRequestSubmit">
        <p class="mb-3 help">Select samples from the list below (checkboxes will be added). Then choose tests and an optional experiment.</p>

        <div class="field">
          <label class="label">Selected Samples Count:</label>
          <div class="control">
            <p class="is-size-7 py-2">{{ selectedSampleIds.length }} sample(s) selected.</p>
             <!-- Displaying IDs can be too noisy if many are selected:
             <p v-if="selectedSampleIds.length === 0" class="is-size-7 has-text-grey">None (select from table below)</p>
             <p v-else class="is-size-7">IDs: {{ selectedSampleIds.join(', ') }}</p>
             -->
          </div>
        </div>

        <div class="field">
          <label class="label">Select Test(s) to Request <span class="has-text-danger">*</span></label>
          <div class="control">
            <div class="select is-multiple is-fullwidth" :class="{'is-loading': isLoadingAllTests}">
              <select multiple size="5" v-model="batchTestData.test_ids" :disabled="isLoadingAllTests">
                <option v-if="isLoadingAllTests" disabled>Loading test definitions...</option>
                <option v-for="testDef in allTests" :key="testDef.id" :value="testDef.id">
                  {{ testDef.name }} (ID: {{ testDef.id }})
                </option>
              </select>
            </div>
            <p v-if="!isLoadingAllTests && allTests.length === 0" class="help is-info">No test definitions available. Please create test definitions first.</p>
          </div>
        </div>

        <div class="field">
          <label class="label">Associate with Experiment (Optional)</label>
          <div class="control">
            <div class="select is-fullwidth" :class="{'is-loading': isLoadingAllExperiments}">
              <select v-model="batchTestData.experiment_id" :disabled="isLoadingAllExperiments">
                <option v-if="isLoadingAllExperiments" disabled>Loading experiments...</option>
                <option :value="null">None</option>
                <option v-for="exp in allExperiments" :key="exp.id" :value="exp.id">
                  {{ exp.name }} (ID: {{ exp.id }})
                </option>
              </select>
            </div>
            <p v-if="!isLoadingAllExperiments && allExperiments.length === 0" class="help is-info">No experiments available.</p>
          </div>
        </div>

        <div v-if="batchRequestError" class="notification is-danger is-light mt-3 py-2 px-3">
            <button class="delete is-small" @click="batchRequestError = null"></button>
            {{ batchRequestError }}
        </div>
        <div v-if="batchRequestSuccessMessage" class="notification is-success is-light mt-3 py-2 px-3">
            <button class="delete is-small" @click="batchRequestSuccessMessage = ''"></button>
            {{ batchRequestSuccessMessage }}
        </div>

        <div class="field mt-4">
          <div class="control">
            <button
              type="submit"
              class="button is-link"
              :class="{'is-loading': isSubmittingBatchRequest}"
              :disabled="isSubmittingBatchRequest || selectedSampleIds.length === 0 || batchTestData.test_ids.length === 0 || isLoadingAllTests || isLoadingAllExperiments"
            >
              Submit Batch Request
            </button>
          </div>
        </div>
      </form>
    </div>
    <!-- End Batch Test Request Section -->

    <h2 class="subtitle mt-5">All Samples</h2>
    <SampleList
      :samples="samplesList"
      :isLoading="isLoadingSamples" <!-- Corrected prop name -->
      :enableSelection="true"
      :selectedSamples="selectedSampleIds" <!-- Pass down for two-way binding (though emit is one-way up) -->
      @selected-samples-changed="handleSelectedSamplesChanged"
      @view-sample-details="handleViewDetails"
    />
    <!-- Add Pagination controls here later if needed -->

  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue'; // Added ref
import { useRouter } from 'vue-router';
import { useSampleManagementStore } from '@/stores/sampleManagement';
import { useTestStore } from '@/stores/tests'; // For selecting tests
import { useExperimentStore } from '@/stores/experiments'; // For selecting experiments
import { useSampleTestStore } from '@/stores/sampleTests'; // For batch action
import SampleList from '@/components/sample_management/SampleList.vue';

const sampleMgmtStore = useSampleManagementStore();
const testDefStore = useTestStore();
const experimentStore = useExperimentStore();
const sampleTestStore = useSampleTestStore(); // For the batch request action

const router = useRouter();

const samplesList = computed(() => sampleMgmtStore.samples);
const isLoadingSamples = computed(() => sampleMgmtStore.isLoading); // Renamed for clarity
const storeError = computed(() => sampleMgmtStore.error);

const allTests = computed(() => testDefStore.tests);
const isLoadingAllTests = computed(() => testDefStore.loading);
const allExperiments = computed(() => experimentStore.experiments);
const isLoadingAllExperiments = computed(() => experimentStore.loading);

// Batch Request Data
const selectedSampleIds = ref([]); // This will be updated by SampleList component
const batchTestData = ref({
  test_ids: [],
  experiment_id: null,
});
const isSubmittingBatchRequest = ref(false);
const batchRequestError = ref(null);
const batchRequestSuccessMessage = ref('');


onMounted(() => {
  sampleMgmtStore.error = null;
  sampleMgmtStore.fetchSamples();
  testDefStore.fetchTests(); // Fetch all test definitions
  experimentStore.fetchExperiments(); // Fetch all experiments
});

// This method will be called by the SampleList component when selections change
const handleSelectedSamplesChanged = (newSelectedSampleIds) => {
    selectedSampleIds.value = newSelectedSampleIds;
};

const handleBatchTestRequestSubmit = async () => {
  batchRequestError.value = null;
  batchRequestSuccessMessage.value = '';

  if (selectedSampleIds.value.length === 0) {
    batchRequestError.value = 'Please select at least one sample from the list below.';
    return;
  }
  if (batchTestData.value.test_ids.length === 0) {
    batchRequestError.value = 'Please select at least one test definition.';
    return;
  }

  isSubmittingBatchRequest.value = true;
  try {
    const payload = {
      sample_ids: selectedSampleIds.value,
      test_ids: batchTestData.value.test_ids,
      experiment_id: batchTestData.value.experiment_id || null, // Ensure null if not set
    };
    const response = await sampleTestStore.batchRequestTests(payload);
    batchRequestSuccessMessage.value = response.message || `Batch test request for ${response.created_entries_count} entries submitted successfully.`;
    // Clear selections after successful submission
    selectedSampleIds.value = [];
    batchTestData.value = { test_ids: [], experiment_id: null };
    // TODO: Need a way to clear selections in SampleList component, or SampleList needs to watch selectedSampleIds
  } catch (error) {
    batchRequestError.value = sampleTestStore.error || error.message || 'Failed to submit batch test request.';
  } finally {
    isSubmittingBatchRequest.value = false;
  }
};

const handleViewDetails = (sample) => {
  console.log('View details for sample:', sample.id);
  router.push({ name: 'SampleDetail', params: { id: sample.id } });
};

const clearStoreError = () => {
    sampleMgmtStore.error = null; // Corrected store name
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
