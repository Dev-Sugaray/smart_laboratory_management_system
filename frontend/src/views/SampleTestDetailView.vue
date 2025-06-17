<template>
  <div class="container sample-test-detail-view p-4">
    <div v-if="isLoading" class="text-center p-6">Loading test run details...</div>
    <div v-else-if="error && !currentSampleTest" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      Error loading details: {{ error }}
    </div>
    <div v-else-if="!currentSampleTest" class="text-center p-6 text-gray-500">
      Sample Test record not found.
      <router-link to="/sample-tests" class="block mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-max mx-auto">
        Back to Test Queue
      </router-link>
    </div>

    <div v-else class="bg-white shadow-md rounded-lg">
      <header class="bg-gray-100 p-4 border-b rounded-t-lg">
        <h1 class="text-2xl font-bold">
          Test Run Details: {{ currentSampleTest.test_name }} for Sample {{ currentSampleTest.unique_sample_id }}
        </h1>
        <p class="text-sm text-gray-600">Record ID: {{ currentSampleTest.id }}</p>
      </header>

      <form @submit.prevent="handleUpdate" class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 class="text-lg font-semibold mb-2 text-gray-700">Overview</h3>
            <dl class="space-y-2">
              <div><dt class="font-medium text-gray-500">Sample ID:</dt><dd class="text-gray-900">{{ currentSampleTest.unique_sample_id }}</dd></div>
              <div><dt class="font-medium text-gray-500">Test Name:</dt><dd class="text-gray-900">{{ currentSampleTest.test_name }}</dd></div>
              <div v-if="currentSampleTest.experiment_name"><dt class="font-medium text-gray-500">Experiment:</dt><dd class="text-gray-900">{{ currentSampleTest.experiment_name }}</dd></div>
              <div><dt class="font-medium text-gray-500">Requested By:</dt><dd class="text-gray-900">{{ currentSampleTest.requested_by_username }} at {{ formatDate(currentSampleTest.requested_at) }}</dd></div>
            </dl>
          </div>
          <div>
            <h3 class="text-lg font-semibold mb-2 text-gray-700">Current Status & Assignment</h3>
             <dl class="space-y-2">
              <div><dt class="font-medium text-gray-500">Status:</dt><dd class="text-gray-900 font-semibold" :class="statusColor(currentSampleTest.status)">{{ currentSampleTest.status }}</dd></div>
              <div v-if="currentSampleTest.result_entry_date"><dt class="font-medium text-gray-500">Results Entered:</dt><dd class="text-gray-900">{{ formatDate(currentSampleTest.result_entry_date) }}</dd></div>
              <div v-if="currentSampleTest.validated_by_username"><dt class="font-medium text-gray-500">Validated By:</dt><dd class="text-gray-900">{{ currentSampleTest.validated_by_username }} at {{ formatDate(currentSampleTest.validated_at) }}</dd></div>
              <div v-if="currentSampleTest.approved_by_username"><dt class="font-medium text-gray-500">Approved By:</dt><dd class="text-gray-900">{{ currentSampleTest.approved_by_username }} at {{ formatDate(currentSampleTest.approved_at) }}</dd></div>
            </dl>
          </div>
        </div>

        <div class="border-t pt-6">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Update Test Run</h3>

          <!-- Status Update -->
          <div class="mb-4" v-if="canUpdateStatus">
            <label for="status" class="block text-sm font-medium text-gray-700">Change Status</label>
            <select id="status" v-model="editableFields.status" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option v-for="s in availableStatusTransitions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <!-- Results Entry -->
          <div class="mb-4" v-if="canEnterResults">
            <label for="results" class="block text-sm font-medium text-gray-700">Results</label>
            <textarea id="results" v-model="editableFields.results" rows="4" class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"></textarea>
          </div>

          <!-- Assign User -->
          <div class="mb-4" v-if="canAssignUser">
            <label for="assigned_to_user_id" class="block text-sm font-medium text-gray-700">Assign to User</label>
            <!-- TODO: Replace with a user selection component/dropdown -->
            <input type="number" id="assigned_to_user_id" v-model.number="editableFields.assigned_to_user_id" placeholder="Enter User ID" class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2">
             <p class="text-xs text-gray-500 mt-1">Currently requires User ID. A user selection dropdown will be implemented later.</p>
          </div>

          <!-- Notes -->
          <div class="mb-4">
            <label for="notes" class="block text-sm font-medium text-gray-700">Notes (append new notes or edit existing)</label>
            <textarea id="notes" v-model="editableFields.notes" rows="3" class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"></textarea>
          </div>

          <div v-if="updateError" class="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Update Error: {{ updateError }}
          </div>
           <div v-if="updateSuccessMessage" class="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {{ updateSuccessMessage }}
          </div>

          <div class="flex justify-end space-x-3">
            <router-link :to="lastViewPath" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
              Back
            </router-link>
            <button
              type="submit"
              :disabled="isSubmittingUpdate || !isAnythingToUpdate"
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              <span v-if="isSubmittingUpdate">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useSampleTestStore } from '@/stores/sampleTests';
import { useAuthStore } from '@/stores/auth'; // To check permissions
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';

const props = defineProps({
  id: { type: [String, Number], required: true }
});

const sampleTestStore = useSampleTestStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const currentSampleTest = computed(() => sampleTestStore.currentSampleTest);
const isLoading = computed(() => sampleTestStore.loading);
const error = computed(() => sampleTestStore.error);

const editableFields = ref({
  status: '',
  results: '',
  assigned_to_user_id: null,
  notes: '',
});

const isSubmittingUpdate = ref(false);
const updateError = ref(null);
const updateSuccessMessage = ref('');
const originalFields = ref({}); // To track if anything changed

const lastViewPath = ref('/sample-tests'); // Default back path

// Store the path from where the user navigated to this view
onBeforeRouteLeave((to, from, next) => {
  if (from.name !== 'Login') { // Avoid setting login page as last view
    lastViewPath.value = from.fullPath || '/sample-tests';
  }
  next();
});


const syncEditableFields = () => {
  if (currentSampleTest.value) {
    editableFields.value.status = currentSampleTest.value.status;
    editableFields.value.results = currentSampleTest.value.results || '';
    editableFields.value.assigned_to_user_id = currentSampleTest.value.assigned_to_user_id || null;
    editableFields.value.notes = currentSampleTest.value.notes || '';
    // Store original values to compare for changes
    originalFields.value = { ...editableFields.value };
  }
};

onMounted(async () => {
  await sampleTestStore.fetchSampleTestDetails(props.id);
  syncEditableFields();
});

watch(() => props.id, async (newId) => {
  if (newId) {
    await sampleTestStore.fetchSampleTestDetails(newId);
    syncEditableFields();
  }
});
watch(currentSampleTest, () => { // If store changes (e.g. after update)
    syncEditableFields();
});


const isAnythingToUpdate = computed(() => {
  if (!currentSampleTest.value) return false;
  return originalFields.value.status !== editableFields.value.status ||
         originalFields.value.results !== editableFields.value.results ||
         originalFields.value.assigned_to_user_id !== editableFields.value.assigned_to_user_id ||
         originalFields.value.notes !== editableFields.value.notes;
});

// Define valid status transitions (could be moved to a config or helper)
const validStatusTransitions = {
  'Pending': ['In Progress', 'Rejected'],
  'In Progress': ['Completed', 'Pending', 'Rejected'],
  'Completed': ['Validated', 'Rejected'],
  'Validated': ['Approved', 'Rejected'],
  'Approved': [],
  'Rejected': []
};

const availableStatusTransitions = computed(() => {
  if (!currentSampleTest.value) return [];
  return [currentSampleTest.value.status, ...(validStatusTransitions[currentSampleTest.value.status] || [])];
});

// Permissions logic (simplified, assumes authStore.user has permissions array or similar)
// In a real app, authStore.user.permissions might be an array of permission strings
const canEnterResults = computed(() => {
  if (!currentSampleTest.value || !authStore.userPermissions) return false;
  const can = authStore.userPermissions.includes('enter_test_results');
  const modifiableStatus = ['In Progress', 'Completed'].includes(currentSampleTest.value.status);
  // Also allow if status is being changed TO 'Completed' by someone with permission
  const changingToCompleted = editableFields.value.status === 'Completed' && currentSampleTest.value.status !== 'Completed';
  return can && (modifiableStatus || changingToCompleted);
});

const canUpdateStatus = computed(() => {
  if (!currentSampleTest.value || !authStore.userPermissions) return false;
  const currentStatus = currentSampleTest.value.status;
  const targetStatus = editableFields.value.status;

  if (targetStatus === 'Completed') return authStore.userPermissions.includes('enter_test_results');
  if (targetStatus === 'Validated') return authStore.userPermissions.includes('validate_test_results');
  if (targetStatus === 'Approved') return authStore.userPermissions.includes('approve_test_results');
  // For other transitions like to 'In Progress', 'Pending', 'Rejected'
  if (['In Progress', 'Pending', 'Rejected'].includes(targetStatus)) {
    return authStore.userPermissions.includes('manage_tests') || authStore.userPermissions.includes('enter_test_results');
  }
  return false; // Default deny if no specific permission matches target status change
});

const canAssignUser = computed(() => {
  if (!authStore.userPermissions) return false;
  // Lab managers or admins can assign tests
  return authStore.userPermissions.includes('manage_tests') || authStore.userPermissions.includes('assign_sample_tests'); // assign_sample_tests is hypothetical
});


const handleUpdate = async () => {
  updateError.value = null;
  updateSuccessMessage.value = '';
  if (!isAnythingToUpdate.value) {
    updateError.value = "No changes detected.";
    return;
  }

  isSubmittingUpdate.value = true;
  const payload = {};
  if (originalFields.value.status !== editableFields.value.status) payload.status = editableFields.value.status;
  if (originalFields.value.results !== editableFields.value.results) payload.results = editableFields.value.results;
  if (originalFields.value.assigned_to_user_id !== editableFields.value.assigned_to_user_id) payload.assigned_to_user_id = editableFields.value.assigned_to_user_id;
  if (originalFields.value.notes !== editableFields.value.notes) payload.notes = editableFields.value.notes;

  // Permission check for status change specifically
  if (payload.status && payload.status !== currentSampleTest.value.status) {
      let requiredPermForStatusChange;
      if (payload.status === 'Completed') requiredPermForStatusChange = 'enter_test_results';
      else if (payload.status === 'Validated') requiredPermForStatusChange = 'validate_test_results';
      else if (payload.status === 'Approved') requiredPermForStatusChange = 'approve_test_results';
      else if (['In Progress', 'Pending', 'Rejected'].includes(payload.status)) {
        requiredPermForStatusChange = authStore.userPermissions.includes('manage_tests') ? 'manage_tests' : 'enter_test_results';
      }

      if (requiredPermForStatusChange && !authStore.userPermissions.includes(requiredPermForStatusChange)) {
          updateError.value = `You do not have permission to change status to '${payload.status}'. Required: ${requiredPermForStatusChange}`;
          isSubmittingUpdate.value = false;
          return;
      }
  }
  // Permission check for results entry
  if (payload.results !== undefined && payload.results !== currentSampleTest.value.results && !authStore.userPermissions.includes('enter_test_results')) {
      updateError.value = "You do not have permission to enter/edit results.";
      isSubmittingUpdate.value = false;
      return;
  }
   // Permission check for assignment
  if (payload.assigned_to_user_id !== undefined && payload.assigned_to_user_id !== currentSampleTest.value.assigned_to_user_id && !canAssignUser.value) {
      updateError.value = "You do not have permission to assign users to this test.";
      isSubmittingUpdate.value = false;
      return;
  }


  try {
    await sampleTestStore.updateSampleTest(props.id, payload);
    updateSuccessMessage.value = 'Test run details updated successfully!';
    // The store action should refetch details, which will trigger the watch and syncEditableFields
    // No, this is not always true, the PUT /api/sample-tests/:id returns only a success message, not the object
    // So, we must explicitly call fetch again or update the store.
    // The store's updateSampleTest action already calls fetchSampleTestDetails.
    originalFields.value = { ...editableFields.value }; // Update original to prevent re-submit of same data
  } catch (err) {
    updateError.value = sampleTestStore.error || err.message || 'Failed to update.';
  } finally {
    isSubmittingUpdate.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const statusColor = (status) => {
  switch (status) {
    case 'Pending': return 'text-gray-600';
    case 'In Progress': return 'text-yellow-600';
    case 'Completed': return 'text-green-600';
    case 'Validated': return 'text-blue-600';
    case 'Approved': return 'text-purple-600';
    case 'Rejected': return 'text-red-600';
    default: return 'text-gray-700';
  }
};

</script>

<style scoped>
/* Tailwind utility classes are used primarily. Add custom styles if needed. */
</style>
