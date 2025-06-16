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
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, ref, watch } from 'vue';
import { useSampleManagementStore } from '@/stores/sampleManagement';
import SampleTrackingHistory from '@/components/sample_management/SampleTrackingHistory.vue';

const props = defineProps({
  id: { type: [String, Number], required: true }
});

const store = useSampleManagementStore();

const sampleDetails = computed(() => store.currentSample);
const sampleCoC = computed(() => store.currentSampleCoC);
const isLoadingSample = computed(() => store.isLoadingDetails);
const isLoadingCoC = computed(() => store.isLoadingCoC);
const fetchError = computed(() => store.error); // General fetch error from store
const availableStorageLocations = computed(() => store.storageLocations);
const isLoadingStorageLocations = computed(() => store.isLoading); // Assuming global isLoading for this

const showUpdateStatusForm = ref(false);
const updateStatusData = ref({ current_status: '', storage_location_id: null, notes: '' });
const statusOptions = ['Registered', 'In Storage', 'In Analysis', 'Archived', 'Discarded'];
const isSubmittingStatusUpdate = ref(false);
const formSuccessMessage = ref('');
const formSubmitError = ref('');
const formValidationErrors = ref({});


const fetchData = async () => {
  store.error = null;
  store.currentSample = null;
  store.currentSampleCoC = [];

  isSubmittingStatusUpdate.value = false; // Reset submission state
  formSuccessMessage.value = '';
  formSubmitError.value = '';
  formValidationErrors.value = {};


  console.log(`Fetching data for sample ID: ${props.id}`);
  try {
    await Promise.all([
      store.fetchSampleDetails(props.id),
      store.fetchSampleChainOfCustody(props.id),
      store.fetchStorageLocations() // Ensure locations are available for the form
    ]);
  } catch (error) {
    console.error('Error fetching initial data for detail view:', error.message);
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
  // Fetch storage locations if not already loaded or might be stale
  if(availableStorageLocations.value.length === 0) {
      store.fetchStorageLocations();
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
    // Ensure storage_location_id is null if not 'In Storage'
    const payload = { ...updateStatusData.value };
    if (payload.current_status !== 'In Storage') {
      payload.storage_location_id = null;
    }

    await store.updateSampleStatus({ sampleId: props.id, statusData: payload });
    formSuccessMessage.value = 'Sample status updated successfully!';
    closeUpdateStatusForm();
    // Data refreshes via store actions (fetchSampleDetails, fetchSampleChainOfCustody)
  } catch (error) {
    formSubmitError.value = error.message || 'Failed to update sample status.';
    console.error('Error updating sample status (view):', error.message);
  } finally {
    isSubmittingStatusUpdate.value = false;
  }
};

const clearFetchError = () => store.error = null;
const clearFormSuccessMessage = () => formSuccessMessage.value = '';
const clearFormSubmitError = () => formSubmitError.value = '';


const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  if (includeTime) {
    options.hour = '2-digit'; options.minute = '2-digit'; options.second = '2-digit';
  }
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const getStatusClass = (status) => {
  switch (status) {
    case 'Registered': return 'tag is-light'; case 'In Storage': return 'tag is-info';
    case 'In Analysis': return 'tag is-warning'; case 'Discarded': return 'tag is-danger';
    case 'Archived': return 'tag is-dark'; default: return 'tag';
  }
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
