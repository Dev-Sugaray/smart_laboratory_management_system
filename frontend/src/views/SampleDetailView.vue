<template>
  <div class="container sample-detail-view">
    <div v-if="isLoadingSample && !sampleDetails" class="loading-indicator section">Loading sample details...</div>
    <div v-else-if="fetchError && !sampleDetails" class="notification is-danger section"> <!-- Show general fetch error only if no details -->
      Error loading sample details: {{ fetchError }}
       <button class="delete" @click="clearFetchError"></button>
    </div>
    <div v-else-if="!sampleDetails" class="no-data-message section">
      Sample not found.
      <router-link to="/samples" class="button is-link mt-3">Back to Sample List</router-link>
    </div>
    <div v-else class="sample-content">
      <nav class="breadcrumb" aria-label="breadcrumbs">
        <ul>
          <li><router-link to="/samples">Sample Management</router-link></li>
          <li class="is-active"><a href="#" aria-current="page">Sample Details: {{ sampleDetails.unique_sample_id }}</a></li>
        </ul>
      </nav>

      <div v-if="formSuccessMessage" class="notification is-success is-light">
        <button class="delete" @click="clearFormSuccessMessage"></button>
        {{ formSuccessMessage }}
      </div>
      <div v-if="formSubmitError" class="notification is-danger is-light">
        <button class="delete" @click="clearFormSubmitError"></button>
        Error updating status: {{ formSubmitError }}
      </div>

      <div class="columns">
        <div class="column is-two-thirds">
          <div class="box">
            <h1 class="title is-3">Sample: {{ sampleDetails.unique_sample_id }}</h1>
            <p class="subtitle is-5">Status: <span :class="getStatusClass(sampleDetails.current_status)">{{ sampleDetails.current_status }}</span></p>

            <table class="table is-fullwidth is-striped is-hoverable">
              <tbody>
                <tr><th>ID:</th><td>{{ sampleDetails.id }}</td></tr>
                <tr><th>Sample Type:</th><td>{{ sampleDetails.sample_type_name || 'N/A' }}</td></tr>
                <tr><th>Source:</th><td>{{ sampleDetails.source_name || 'N/A' }}</td></tr>
                <tr><th>Collection Date:</th><td>{{ formatDate(sampleDetails.collection_date) }}</td></tr>
                <tr><th>Registration Date:</th><td>{{ formatDate(sampleDetails.registration_date, true) }}</td></tr>
                <tr><th>Current Storage Location:</th><td>{{ sampleDetails.storage_location_name || 'Not in storage' }}</td></tr>
                <tr><th>Barcode/QR Data:</th><td>{{ sampleDetails.barcode_qr_code }}</td></tr>
                <tr><th>Notes:</th><td style="white-space: pre-wrap;">{{ sampleDetails.notes || 'No notes.' }}</td></tr>
                <tr><th>Last Updated:</th><td>{{ formatDate(sampleDetails.updated_at, true) }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="column is-one-third">
          <div class="box">
            <h2 class="title is-4">Actions</h2>
            <button @click="openUpdateStatusForm" class="button is-info is-fullwidth">Update Status / Location</button>
          </div>
        </div>
      </div>

      <!-- Modal for Updating Status -->
      <div v-if="showUpdateStatusForm" class="modal is-active">
        <div class="modal-background" @click="closeUpdateStatusForm"></div>
        <div class="modal-content">
          <div class="box">
            <h3 class="title is-4">Update Sample Status</h3>
            <form @submit.prevent="handleUpdateStatusSubmit">
              <div class="field">
                <label class="label" for="new-status">New Status <span class="has-text-danger">*</span></label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select id="new-status" v-model="updateStatusData.current_status" required>
                      <option v-for="status in statusOptions" :key="status" :value="status">
                        {{ status }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="field" v-if="updateStatusData.current_status === 'In Storage'">
                <label class="label" for="new-storage-location">New Storage Location <span class="has-text-danger">*</span></label>
                <div class="control">
                  <div class="select is-fullwidth" :class="{ 'is-loading': isLoadingStorageLocations }">
                    <select id="new-storage-location" v-model="updateStatusData.storage_location_id" :required="updateStatusData.current_status === 'In Storage'">
                      <option :value="null" disabled>Select storage location</option>
                      <option v-for="loc in availableStorageLocations" :key="loc.id" :value="loc.id">
                        {{ loc.name }} (Load: {{loc.current_load}}/{{loc.capacity || 'N/A'}})
                      </option>
                    </select>
                  </div>
                   <p v-if="formValidationErrors.storage_location_id" class="help is-danger">{{ formValidationErrors.storage_location_id }}</p>
                </div>
              </div>
              <div v-else> <!-- Ensure storage_location_id is nulled if not 'In Storage' -->
                 {{ updateStatusData.storage_location_id = null }}
              </div>


              <div class="field">
                <label class="label" for="update-notes">Notes / Reason</label>
                <div class="control">
                  <textarea id="update-notes" class="textarea" v-model="updateStatusData.notes"></textarea>
                </div>
              </div>

              <div class="field is-grouped mt-5">
                <div class="control">
                  <button type="submit" class="button is-success" :class="{ 'is-loading': isSubmittingStatusUpdate }" :disabled="isSubmittingStatusUpdate">
                    Submit Update
                  </button>
                </div>
                <div class="control">
                  <button type="button" @click="closeUpdateStatusForm" class="button is-light" :disabled="isSubmittingStatusUpdate">
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        <button @click="closeUpdateStatusForm" class="modal-close is-large" aria-label="close"></button>
      </div>


      <SampleTrackingHistory
        :historyEvents="sampleCoC"
        :isLoading="isLoadingCoC"
      />

      <!-- Test Requests Section -->
      <div class="box tests-section mt-5">
        <h2 class="title is-4">Test Requests for this Sample</h2>
        <button
            @click="showRequestTestsModal = true"
            class="button is-primary is-small mb-3"
            :disabled="isLoadingTestsForSample || isLoadingAllTests || isLoadingAllExperiments"
            title="Load test definitions and experiments before requesting"
        >
          Request New Test(s)
        </button>

        <div v-if="isLoadingTestsForSample" class="loading-indicator">Loading tests for this sample...</div>
        <div v-if="fetchSampleTestsError" class="notification is-danger is-light">
            Error loading tests: {{ fetchSampleTestsError }}
        </div>

        <div v-if="!isLoadingTestsForSample && sampleTestsForCurrent.length === 0 && !fetchSampleTestsError" class="has-text-grey">
          No tests requested for this sample yet.
        </div>

        <table v-if="sampleTestsForCurrent.length > 0" class="table is-fullwidth is-striped is-narrow is-hoverable">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Status</th>
              <th>Requested At</th>
              <th>Assigned To</th>
              <th>Results</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="st in sampleTestsForCurrent" :key="st.sample_test_id">
              <td>{{ st.test_name }} <span class="has-text-grey is-size-7">(ID: {{ st.test_id }})</span></td>
              <td><span :class="getSampleTestStatusClass(st.status)">{{ st.status }}</span></td>
              <td>{{ formatDate(st.requested_at, true) }}</td>
              <td>{{ st.assigned_to_username || 'N/A' }}</td>
              <td style="white-space: pre-wrap; max-width: 200px; overflow-wrap: break-word;">{{ st.results || 'N/A' }}</td>
              <td>
                <router-link
                  :to="`/sample-tests/${st.sample_test_id}`"
                  class="button is-small is-link is-outlined"
                  title="View/Update Test Run Details"
                >
                  Details
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- End Test Requests Section -->

      <!-- Modal for Requesting New Tests -->
      <div v-if="showRequestTestsModal" class="modal is-active">
        <div class="modal-background" @click="showRequestTestsModal = false"></div>
        <div class="modal-card">
          <header class="modal-card-head">
            <p class="modal-card-title">Request New Test(s) for Sample: {{ sampleDetails.unique_sample_id }}</p>
            <button class="delete" aria-label="close" @click="showRequestTestsModal = false"></button>
          </header>
          <section class="modal-card-body">
            <div v-if="isSubmittingTestRequestError" class="notification is-danger is-light mb-3">
              <button class="delete" @click="clearTestRequestError"></button>
              {{ isSubmittingTestRequestError }}
            </div>
            <div class="field">
              <label class="label">Select Test(s) <span class="has-text-danger">*</span></label>
              <div class="control">
                <div class="select is-multiple is-fullwidth" :class="{'is-loading': isLoadingAllTests}">
                  <select multiple size="5" v-model="newTestRequest.test_ids" :disabled="isLoadingAllTests">
                    <option v-if="isLoadingAllTests" disabled>Loading tests...</option>
                    <option v-for="testDef in allTests" :key="testDef.id" :value="testDef.id">
                      {{ testDef.name }}
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
                  <select v-model="newTestRequest.experiment_id" :disabled="isLoadingAllExperiments">
                    <option v-if="isLoadingAllExperiments" disabled>Loading experiments...</option>
                    <option :value="null">None</option>
                    <option v-for="exp in allExperiments" :key="exp.id" :value="exp.id">
                      {{ exp.name }}
                    </option>
                  </select>
                </div>
                 <p v-if="!isLoadingAllExperiments && allExperiments.length === 0" class="help is-info">No experiments available.</p>
              </div>
            </div>
          </section>
          <footer class="modal-card-foot is-justify-content-flex-end">
            <button class="button" @click="showRequestTestsModal = false" :disabled="isSubmittingTestRequest">Cancel</button>
            <button
                class="button is-success"
                @click="handleRequestNewTests"
                :class="{'is-loading': isSubmittingTestRequest}"
                :disabled="isSubmittingTestRequest || newTestRequest.test_ids.length === 0 || isLoadingAllTests || isLoadingAllExperiments"
            >
              Request Selected Test(s)
            </button>
          </footer>
        </div>
      </div>
      <!-- End Modal for Requesting New Tests -->

    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, ref, watch } from 'vue';
import { useSampleManagementStore } from '@/stores/sampleManagement';
import { useSampleTestStore } from '@/stores/sampleTests'; // Import the new store
import { useTestStore } from '@/stores/tests'; // To get test definitions for selection
import { useExperimentStore } from '@/stores/experiments'; // To get experiments for selection
import SampleTrackingHistory from '@/components/sample_management/SampleTrackingHistory.vue';
// import RequestSampleTestsForm from '@/components/RequestSampleTestsForm.vue'; // If using a separate component

const props = defineProps({
  id: { type: [String, Number], required: true }
});

const sampleMgmtStore = useSampleManagementStore();
const sampleTestStore = useSampleTestStore();
const testDefStore = useTestStore(); // For listing available tests
const experimentStore = useExperimentStore(); // For listing available experiments

// Sample Management Store Data
const sampleDetails = computed(() => sampleMgmtStore.currentSample);
const sampleCoC = computed(() => sampleMgmtStore.currentSampleCoC);
const isLoadingSample = computed(() => sampleMgmtStore.isLoadingDetails);
const isLoadingCoC = computed(() => sampleMgmtStore.isLoadingCoC);
const fetchError = computed(() => sampleMgmtStore.error);
const availableStorageLocations = computed(() => sampleMgmtStore.storageLocations);
const isLoadingStorageLocations = computed(() => sampleMgmtStore.isLoading);

// Sample Tests Store Data
const sampleTestsForCurrent = computed(() => sampleTestStore.sampleTestsForCurrentSample);
const isLoadingTestsForSample = computed(() => sampleTestStore.loading);
const fetchSampleTestsError = computed(() => sampleTestStore.error);

// Test Definitions Store Data (for modal)
const allTests = computed(() => testDefStore.tests);
const isLoadingAllTests = computed(() => testDefStore.loading);

// Experiment Store Data (for modal)
const allExperiments = computed(() => experimentStore.experiments);
const isLoadingAllExperiments = computed(() => experimentStore.loading);


const showUpdateStatusForm = ref(false);
const updateStatusData = ref({ current_status: '', storage_location_id: null, notes: '' });
const statusOptions = ['Registered', 'In Storage', 'In Analysis', 'Archived', 'Discarded'];
const isSubmittingStatusUpdate = ref(false);
const formSuccessMessage = ref(''); // Kept for status update success
const formSubmitError = ref(''); // Kept for status update error
const formValidationErrors = ref({});

// For New Test Request Modal
const showRequestTestsModal = ref(false);
const newTestRequest = ref({
  test_ids: [],
  experiment_id: null,
});
const isSubmittingTestRequest = ref(false);
const isSubmittingTestRequestError = ref(null);


const fetchData = async () => {
  sampleMgmtStore.error = null;
  sampleMgmtStore.currentSample = null;
  sampleMgmtStore.currentSampleCoC = [];
  sampleTestStore.error = null; // Clear sample test errors too
  sampleTestStore.sampleTestsForCurrentSample = [];


  isSubmittingStatusUpdate.value = false;
  formSuccessMessage.value = '';
  formSubmitError.value = '';
  formValidationErrors.value = {};
  isSubmittingTestRequestError.value = null;
  newTestRequest.value = { test_ids: [], experiment_id: null };


  console.log(`Fetching data for sample ID: ${props.id}`);
  try {
    await Promise.all([
      sampleMgmtStore.fetchSampleDetails(props.id),
      sampleMgmtStore.fetchSampleChainOfCustody(props.id),
      sampleMgmtStore.fetchStorageLocations(), // For status update form
      sampleTestStore.fetchSampleTestsForSample(props.id), // Fetch tests for this sample
      testDefStore.fetchTests(), // For "Request New Test" modal
      experimentStore.fetchExperiments() // For "Request New Test" modal
    ]);
  } catch (error) {
    console.error('Error fetching initial data for detail view:', error.message);
    // Errors are typically handled and stored within each store module
  }
};

onMounted(fetchData);

watch(() => props.id, (newId, oldId) => {
  if (newId !== oldId) fetchData();
});

const openUpdateStatusForm = () => {
  clearFormMessages();
  if (sampleDetails.value) {
    updateStatusData.value = {
      current_status: sampleDetails.value.current_status,
      storage_location_id: sampleDetails.value.storage_location_id || null,
      notes: ''
    };
  }
  if(availableStorageLocations.value.length === 0 && !isLoadingStorageLocations.value) { // check loading state too
      sampleMgmtStore.fetchStorageLocations();
  }
  showUpdateStatusForm.value = true;
};

const closeUpdateStatusForm = () => {
  showUpdateStatusForm.value = false;
  formValidationErrors.value = {};
};

const validateStatusUpdateForm = () => {
  const errors = {};
  if (updateStatusData.value.current_status === 'In Storage' && !updateStatusData.value.storage_location_id) {
    errors.storage_location_id = 'Storage Location is required when status is "In Storage".';
  }
  formValidationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const handleUpdateStatusSubmit = async () => {
  clearFormMessages();
  if (!validateStatusUpdateForm()) return;

  isSubmittingStatusUpdate.value = true;
  try {
    const payload = { ...updateStatusData.value };
    if (payload.current_status !== 'In Storage') {
      payload.storage_location_id = null;
    }

    await sampleMgmtStore.updateSampleStatus({ sampleId: props.id, statusData: payload });
    formSuccessMessage.value = 'Sample status updated successfully!';
    closeUpdateStatusForm();
  } catch (error) {
    formSubmitError.value = error.message || 'Failed to update sample status.';
    console.error('Error updating sample status (view):', error.message);
  } finally {
    isSubmittingStatusUpdate.value = false;
  }
};

const handleRequestNewTests = async () => {
  isSubmittingTestRequestError.value = null;
  if (newTestRequest.value.test_ids.length === 0) {
    isSubmittingTestRequestError.value = "Please select at least one test.";
    return;
  }
  isSubmittingTestRequest.value = true;
  try {
    await sampleTestStore.requestTestsForSample(props.id, {
      test_ids: newTestRequest.value.test_ids,
      experiment_id: newTestRequest.value.experiment_id,
    });
    showRequestTestsModal.value = false;
    newTestRequest.value = { test_ids: [], experiment_id: null }; // Reset form
    // Success message could be shown, sampleTestStore.fetchSampleTestsForSample is called in action
  } catch (error) {
    console.error('Error requesting new tests:', error);
    isSubmittingTestRequestError.value = sampleTestStore.error || error.message || "Failed to request tests.";
  } finally {
    isSubmittingTestRequest.value = false;
  }
};


const clearFetchError = () => sampleMgmtStore.error = null; // Clear general error
const clearFormSuccessMessage = () => formSuccessMessage.value = '';
const clearFormSubmitError = () => formSubmitError.value = '';

const clearTestRequestError = () => { // Added this
    isSubmittingTestRequestError.value = null;
}

const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  if (includeTime) {
    options.hour = '2-digit'; options.minute = '2-digit'; options.second = '2-digit';
  }
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const getStatusClass = (status) => { // For sample status
  switch (status) {
    case 'Registered': return 'tag is-light'; case 'In Storage': return 'tag is-info';
    case 'In Analysis': return 'tag is-warning'; case 'Discarded': return 'tag is-danger';
    case 'Archived': return 'tag is-dark'; default: return 'tag';
  }
};

const getSampleTestStatusClass = (status) => { // For sample_test status
   switch (status) {
    case 'Pending': return 'tag is-light is-rounded';
    case 'In Progress': return 'tag is-warning is-rounded';
    case 'Completed': return 'tag is-success is-rounded';
    case 'Validated': return 'tag is-primary is-rounded';
    case 'Approved': return 'tag is-link is-rounded'; // Or another distinct color
    case 'Rejected': return 'tag is-danger is-rounded';
    default: return 'tag is-rounded';
  }
};

const clearFormMessages = () => { // Combined clear messages
    formSubmitError.value = '';
    formSuccessMessage.value = ''; // Clear success from status update
    isSubmittingTestRequestError.value = null; // Clear error from test request
};

</script>

<style scoped>
.sample-detail-view { padding-top: 1.5rem; }
.box { margin-bottom: 1.5rem; box-shadow: 0 0.5em 1em -0.125em rgba(10,10,10,.1), 0 0 0 1px rgba(10,10,10,.02); }
.title.is-3 { margin-bottom: 1rem; }
.subtitle.is-5 { margin-top: -0.5rem; margin-bottom: 1.5rem; }
.table th { width: 30%; font-weight: bold; background-color: #fafafa; }
.table td { word-break: break-word; }
.loading-indicator, .no-data-message { text-align: center; padding: 2rem; font-size: 1.2rem; }
.breadcrumb { margin-bottom: 1.5rem; }
.tag { align-items: center; background-color: #f5f5f5; border-radius: 4px; color: #4a4a4a; display: inline-flex; font-size: .75rem; height: 2em; justify-content: center; line-height: 1.5; padding-left: .75em; padding-right: .75em; white-space: nowrap; }
.tag.is-light { background-color: #f5f5f5; }
.tag.is-info { background-color: #3273dc; color: #fff; }
.tag.is-warning { background-color: #ffdd57; color: rgba(0,0,0,.7); }
.tag.is-danger { background-color: #ff3860; color: #fff; }
.tag.is-dark { background-color: #363636; color: #fff; }
.mt-3 { margin-top: 1rem; }
.mt-5 { margin-top: 1.25rem; } /* For form button grouping */

.notification { margin-top: 1rem; margin-bottom: 1rem; padding: 1rem 1.5rem; border-radius: 4px; position: relative; }
.notification.is-danger.is-light { background-color: #feecf0; color: #cc0f35; }
.notification.is-success.is-light { background-color: #effaf5; color: #257953; }
.notification .delete { position: absolute; right: 0.5rem; top: 0.5rem; background: rgba(10,10,10,.2); border: none; border-radius: 290486px; cursor: pointer; display: inline-block; font-size: 1rem; height: 20px; line-height: 20px; outline: none; padding: 0; text-align: center; vertical-align: top; width: 20px; }
.notification .delete::before, .notification .delete::after { background-color: #fff; content: ""; display: block; left: 50%; position: absolute; top: 50%; transform: translateX(-50%) translateY(-50%) rotate(45deg); transform-origin: center center; }
.notification .delete::before { height: 2px; width: 50%; }
.notification .delete::after { height: 50%; width: 2px; }

/* Modal styles from previous views */
.modal.is-active { display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; }
.modal-background { background-color: rgba(0, 0, 0, 0.75); position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
.modal-content { background-color: white; padding: 20px; border-radius: 5px; max-width: 500px; width: 90%; z-index: 1001; } /* Form has its own bg and padding if using .box */
.modal-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; color: white; cursor: pointer; z-index: 1002; }

/* Form field styling (can be further refined) */
.label { font-weight: bold; }
.input, .textarea, .select select { width: 100%; }
.select { display: block; position: relative; width:100%;}
.select:not(.is-multiple):not(.is-loading)::after { border: 3px solid transparent; border-radius: 2px; border-right: 0; border-top: 0; content: " "; display: block; height: .625em; margin-top: -.4375em; pointer-events: none; position: absolute; top: 50%; transform: rotate(-45deg); transform-origin: center; width: .625em; border-color: #3273dc; right: 1.125em; z-index: 4;}
.help.is-danger { color: #ff3860; font-size: 0.875em; margin-top: 0.25rem; }
.has-text-danger { color: #ff3860; }
</style>
