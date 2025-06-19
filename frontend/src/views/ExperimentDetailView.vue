<template>
  <div class="container mx-auto p-4">
    <div v-if="store.loading && !store.currentExperiment" class="text-center">
      <p>Loading experiment details...</p>
    </div>
    <div v-if="store.error && !store.currentExperiment" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <strong class="font-bold">Error!</strong> {{ store.error }}
    </div>

    <div v-if="store.currentExperiment">
      <div class="bg-white shadow-md rounded-lg p-6 mb-6">
        <h1 class="text-3xl font-bold mb-4">{{ isEditing ? 'Edit Experiment' : store.currentExperiment.name }}</h1>

        <form @submit.prevent="handleSaveExperiment">
          <div class="mb-4">
            <label for="exp-name" class="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              id="exp-name"
              v-model="editableExperiment.name"
              :disabled="!isEditing"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50"
              required
            />
          </div>
          <div class="mb-4">
            <label for="exp-description" class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="exp-description"
              v-model="editableExperiment.description"
              :disabled="!isEditing"
              rows="3"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50"
            ></textarea>
          </div>
          <div class="flex items-center justify-end space-x-3">
            <button
              v-if="!isEditing"
              type="button"
              @click="isEditing = true"
              class="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              Edit
            </button>
            <button
              v-if="isEditing"
              type="submit"
              class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Save Changes
            </button>
            <button
              v-if="isEditing"
              type="button"
              @click="cancelEdit"
              class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
             <router-link to="/experiments" class="text-gray-600 hover:text-gray-800 py-2 px-4">Back to List</router-link>
          </div>
           <p v-if="saveError" class="text-red-500 text-sm mt-2">{{ saveError }}</p>
        </form>
      </div>

      <!-- Manage Associated Tests -->
      <div class="bg-white shadow-md rounded-lg p-6">
        <h2 class="text-2xl font-semibold mb-4">Associated Tests</h2>
        <div v-if="store.loading" class="text-sm text-gray-500">Loading tests...</div>

        <div class="mb-4">
          <label for="add-test" class="block text-sm font-medium text-gray-700">Add Test to Experiment</label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <input
              type="number"
              id="add-test-input"
              v-model.number="testIdToAdd"
              placeholder="Enter Test ID"
              class="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 px-3 py-2"
            />
            <button
              @click="handleAddTest"
              class="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              Add Test
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1">Note: A proper test selection (dropdown/search) will be implemented once the 'tests' store is available.</p>
           <p v-if="addTestError" class="text-red-500 text-sm mt-2">{{ addTestError }}</p>
        </div>

        <ul v-if="store.experimentTests.length > 0" class="divide-y divide-gray-200">
          <li v-for="test in store.experimentTests" :key="test.id" class="py-3 flex justify-between items-center">
            <div>
              <p class="text-md font-medium text-gray-900">{{ test.name }} (ID: {{ test.id }})</p>
              <p class="text-sm text-gray-500">{{ test.description || 'No description' }}</p>
            </div>
            <button
              @click="handleRemoveTest(test.id)"
              class="text-red-500 hover:text-red-700 text-sm font-semibold"
            >
              Remove
            </button>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">No tests are currently associated with this experiment.</p>
      </div>

      <!-- Experiment Results Analysis Section -->
      <div class="bg-white shadow-md rounded-lg p-6 mt-6">
        <h2 class="text-2xl font-semibold mb-4">Experiment Results Analysis</h2>
        <button
          @click="loadExperimentAnalysisData"
          class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded mb-4"
          :disabled="isAnalysisLoading || (store.experimentTests && store.experimentTests.length === 0)"
          :title="store.experimentTests && store.experimentTests.length === 0 ? 'No tests in experiment to analyze' : 'Load analysis data'"
        >
          <span v-if="isAnalysisLoading">Loading Analysis Data...</span>
          <span v-else>Load/Refresh Experiment Analysis</span>
        </button>

        <div v-if="analysisError" class="text-red-500 bg-red-100 p-3 rounded mb-3">Error: {{ analysisError }}</div>

        <div v-if="!isAnalysisLoading && experimentAnalysisData.combinedNumericStats && experimentAnalysisData.combinedNumericStats.count > 0">
          <h3 class="text-xl font-semibold mb-2">Overall Numeric Statistics (All Tests Combined)</h3>
          <ul class="list-disc list-inside mb-4 pl-4 text-gray-700">
            <li>Total Numeric Results Count: {{ experimentAnalysisData.combinedNumericStats.count }}</li>
            <li>Overall Mean: {{ experimentAnalysisData.combinedNumericStats.mean.toFixed(2) }}</li>
            <li>Overall Median: {{ experimentAnalysisData.combinedNumericStats.median.toFixed(2) }}</li>
            <li>Overall Std Deviation: {{ experimentAnalysisData.combinedNumericStats.stdDev.toFixed(2) }}</li>
            <li>Overall Min: {{ experimentAnalysisData.combinedNumericStats.min.toFixed(2) }}</li>
            <li>Overall Max: {{ experimentAnalysisData.combinedNumericStats.max.toFixed(2) }}</li>
          </ul>
        </div>
         <div v-else-if="!isAnalysisLoading && experimentAnalysisData.combinedNumericStats && experimentAnalysisData.combinedNumericStats.count === 0 && !analysisError" class="text-gray-500 mb-4">
          No numeric results found across tests in this experiment.
        </div>

        <div v-if="!isAnalysisLoading && experimentAnalysisData.combinedCategoricalStats && Object.keys(experimentAnalysisData.combinedCategoricalStats).length > 0">
          <h3 class="text-xl font-semibold mb-2 mt-4">Overall Categorical Results Frequency (All Tests Combined)</h3>
          <ul class="list-disc list-inside pl-4 text-gray-700">
            <li v-for="(count, category) in experimentAnalysisData.combinedCategoricalStats" :key="category">
              {{ category }}: {{ count }}
            </li>
          </ul>
        </div>
        <div v-else-if="!isAnalysisLoading && experimentAnalysisData.combinedCategoricalStats && Object.keys(experimentAnalysisData.combinedCategoricalStats).length === 0 && !analysisError" class="text-gray-500 mb-4">
          No categorical results found across tests in this experiment.
        </div>

        <div v-if="!isAnalysisLoading && Object.keys(experimentAnalysisData.statsByTest).length > 0" class="mt-6">
            <h3 class="text-xl font-semibold mb-2">Statistics By Test</h3>
            <div v-for="testStats in experimentAnalysisData.statsByTest" :key="testStats.name" class="analysis-sub-section">
                <h4 class="text-lg font-medium text-gray-800">{{ testStats.name }}</h4>
                <ul v-if="testStats.count > 0" class="list-disc list-inside pl-4 text-sm text-gray-600">
                    <li>Count: {{ testStats.count }}</li>
                    <li>Mean: {{ testStats.mean }}</li>
                    <li>Min: {{ testStats.min }}</li>
                    <li>Max: {{ testStats.max }}</li>
                </ul>
                <p v-else class="text-sm text-gray-500">{{ testStats.message || "No numeric data for this test."}}</p>
            </div>
        </div>
         <p v-if="!isAnalysisLoading && store.experimentTests && store.experimentTests.length > 0 && (!experimentAnalysisData.combinedNumericStats || experimentAnalysisData.combinedNumericStats.count === 0) && (!experimentAnalysisData.combinedCategoricalStats || Object.keys(experimentAnalysisData.combinedCategoricalStats).length === 0) && !analysisError" class="text-gray-500">
            No analysis data loaded or available for this experiment. Ensure results are numeric or simple strings, and that tests have associated sample results.
        </p>
         <p v-if="!isAnalysisLoading && (!store.experimentTests || store.experimentTests.length === 0) && !analysisError" class="text-gray-500">
            No tests are associated with this experiment to analyze.
        </p>
      </div>
      <!-- End Experiment Results Analysis Section -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, reactive, computed } from 'vue'; // Added computed
import { useExperimentStore } from '@/stores/experiments';
import { useTestStore } from '@/stores/tests'; // For fetching results for each test in experiment
import { useRoute, useRouter } from 'vue-router';

const props = defineProps({
  id: {
    type: [String, Number],
    required: true,
  },
});

const store = useExperimentStore();
const testDefStore = useTestStore(); // For analysis
const route = useRoute();
const router = useRouter();

const isEditing = ref(false);
const editableExperiment = reactive({ id: null, name: '', description: '' });
const saveError = ref(null);

const testIdToAdd = ref(null);
const addTestError = ref(null);

// For Analysis Section
const isAnalysisLoading = ref(false);
const analysisError = ref(null);
// Structure: { combinedNumericStats: {...}, combinedCategoricalStats: {...}, statsByTest: { testId1: {...}, testId2: {...} } }
const experimentAnalysisData = ref({
  combinedNumericStats: null,
  combinedCategoricalStats: null,
  statsByTest: {}
});


const syncEditableExperiment = () => {
  if (store.currentExperiment) {
    editableExperiment.id = store.currentExperiment.id;
    editableExperiment.name = store.currentExperiment.name;
    editableExperiment.description = store.currentExperiment.description || '';
  }
};

onMounted(async () => {
  await store.fetchExperiment(props.id);
  await store.fetchExperimentTests(props.id); // Fetches tests associated with the experiment
  syncEditableExperiment();
});

watch(() => props.id, async (newId) => {
  if (newId) {
    await store.fetchExperiment(newId);
    await store.fetchExperimentTests(newId);
    syncEditableExperiment();
    isEditing.value = false;
    // Reset analysis data when navigating to a new experiment
    experimentAnalysisData.value = { combinedNumericStats: null, combinedCategoricalStats: null, statsByTest: {} };
    analysisError.value = null;
  }
});

watch(() => store.currentExperiment, (newExp) => {
  if (newExp) {
    syncEditableExperiment();
  }
}, { deep: true });


const handleSaveExperiment = async () => {
  saveError.value = null;
  if (!editableExperiment.name.trim()) {
    saveError.value = 'Experiment name cannot be empty.';
    return;
  }
  try {
    await store.updateExperiment(editableExperiment.id, {
      name: editableExperiment.name,
      description: editableExperiment.description,
    });
    isEditing.value = false;
    // Optionally show success message
  } catch (error) {
    saveError.value = `Failed to update experiment: ${store.error || error.message}`;
  }
};

const cancelEdit = () => {
  syncEditableExperiment(); // Reset to original values from store
  isEditing.value = false;
  saveError.value = null;
};

const handleAddTest = async () => {
  addTestError.value = null;
  if (!testIdToAdd.value) {
    addTestError.value = 'Please enter a Test ID.';
    return;
  }
  try {
    await store.addTestToExperiment(props.id, testIdToAdd.value);
    testIdToAdd.value = null; // Clear input
    // Optionally show success message
  } catch (error) {
     addTestError.value = `Failed to add test: ${store.error || error.message}`;
  }
};

const handleRemoveTest = async (testIdToRemove) => {
  if (window.confirm(`Are you sure you want to remove test ID ${testIdToRemove} from this experiment?`)) {
    try {
      await store.removeTestFromExperiment(props.id, testIdToRemove);
      // Optionally show success message
    } catch (error) {
      alert(`Failed to remove test: ${store.error || error.message}`);
    }
  }
};

const loadExperimentAnalysisData = async () => {
  isAnalysisLoading.value = true;
  analysisError.value = null;
  experimentAnalysisData.value = { combinedNumericStats: null, combinedCategoricalStats: null, statsByTest: {} };

  if (!store.currentExperiment || !store.experimentTests || store.experimentTests.length === 0) {
    analysisError.value = "No tests associated with this experiment to analyze.";
    isAnalysisLoading.value = false;
    return;
  }

  const allNumericResultsForExperiment = [];
  const allCategoricalResultsForExperiment = {};
  let errorsEncounteredDuringFetch = [];

  for (const testInExperiment of store.experimentTests) {
    try {
      // Fetch sample_tests data for this specific test_id
      await testDefStore.fetchSamplesForTestDefinition(testInExperiment.id);
      const samplesAndResultsForTest = testDefStore.samplesForCurrentTestDefinition; // This is an array of sample_tests objects

      const resultsForThisTest = samplesAndResultsForTest
        .filter(st => st.results !== null && st.results !== undefined && st.results.trim() !== '')
        .map(st => st.results);

      const numericResultsThisTest = resultsForThisTest.map(r => parseFloat(r)).filter(n => !isNaN(n));
      const categoricalResultsThisTest = resultsForThisTest.filter(r => isNaN(parseFloat(r)));

      if (numericResultsThisTest.length > 0) {
        allNumericResultsForExperiment.push(...numericResultsThisTest);

        numericResultsThisTest.sort((a, b) => a - b);
        const sum = numericResultsThisTest.reduce((acc, val) => acc + val, 0);
        const mean = sum / numericResultsThisTest.length;
        // Store per-test stats
        experimentAnalysisData.value.statsByTest[testInExperiment.id] = {
          name: testInExperiment.name, // Assuming testInExperiment has a name property
          count: numericResultsThisTest.length,
          mean: mean.toFixed(2),
          min: numericResultsThisTest[0].toFixed(2),
          max: numericResultsThisTest[numericResultsThisTest.length - 1].toFixed(2),
        };
      } else {
         experimentAnalysisData.value.statsByTest[testInExperiment.id] = {
           name: testInExperiment.name,
           count: 0,
           message: "No numeric results."
         };
      }

      categoricalResultsThisTest.forEach(cat => {
        allCategoricalResultsForExperiment[cat] = (allCategoricalResultsForExperiment[cat] || 0) + 1;
      });

    } catch (err) {
      errorsEncounteredDuringFetch.push(`Failed to load/process data for test ${testInExperiment.name || testInExperiment.id}: ${err.message}`);
    }
  }
   // Clear the temporary state in testDefStore if it was used globally
  testDefStore.samplesForCurrentTestDefinition = [];


  if (errorsEncounteredDuringFetch.length > 0) {
    analysisError.value = errorsEncounteredDuringFetch.join('; ');
  }

  // Calculate combined stats for the whole experiment
  if (allNumericResultsForExperiment.length > 0) {
    allNumericResultsForExperiment.sort((a, b) => a - b);
    const sum = allNumericResultsForExperiment.reduce((acc, val) => acc + val, 0);
    const mean = sum / allNumericResultsForExperiment.length;
    const median = allNumericResultsForExperiment.length % 2 === 0
      ? (allNumericResultsForExperiment[allNumericResultsForExperiment.length / 2 - 1] + allNumericResultsForExperiment[allNumericResultsForExperiment.length / 2]) / 2
      : allNumericResultsForExperiment[Math.floor(allNumericResultsForExperiment.length / 2)];
    const variance = allNumericResultsForExperiment.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / allNumericResultsForExperiment.length;
    const stdDev = Math.sqrt(variance);
    experimentAnalysisData.value.combinedNumericStats = {
      count: allNumericResultsForExperiment.length,
      mean,
      median,
      stdDev,
      min: allNumericResultsForExperiment[0],
      max: allNumericResultsForExperiment[allNumericResultsForExperiment.length - 1],
    };
  } else {
     experimentAnalysisData.value.combinedNumericStats = { count: 0 };
  }
  experimentAnalysisData.value.combinedCategoricalStats = allCategoricalResultsForExperiment;

  isAnalysisLoading.value = false;
};

</script>

<style scoped>
/* Scoped styles if needed */
.list-disc { list-style-type: disc; }
.list-inside { list-style-position: inside; }
.analysis-sub-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; }
</style>
