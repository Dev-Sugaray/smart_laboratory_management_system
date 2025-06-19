<template>
  <div class="container mx-auto p-4">
    <div v-if="store.loading && !store.currentTest" class="text-center">
      <p>Loading test definition details...</p>
    </div>
    <div v-if="store.error && !store.currentTest" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <strong class="font-bold">Error!</strong> {{ store.error }}
    </div>

    <div v-if="store.currentTest">
      <div class="bg-white shadow-md rounded-lg p-6 mb-6">
        <h1 class="text-3xl font-bold mb-4">{{ isEditing ? 'Edit Test Definition' : store.currentTest.name }}</h1>

        <form @submit.prevent="handleSaveTest">
          <div class="mb-4">
            <label for="test-name" class="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              id="test-name"
              v-model="editableTest.name"
              :disabled="!isEditing"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50"
              required
            />
          </div>
          <div class="mb-4">
            <label for="test-description" class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="test-description"
              v-model="editableTest.description"
              :disabled="!isEditing"
              rows="3"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50"
            ></textarea>
          </div>
          <div class="mb-4">
            <label for="test-protocol" class="block text-sm font-medium text-gray-700">Protocol</label>
            <textarea
              id="test-protocol"
              v-model="editableTest.protocol"
              :disabled="!isEditing"
              rows="5"
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
             <router-link to="/tests" class="text-gray-600 hover:text-gray-800 py-2 px-4">Back to List</router-link>
          </div>
           <p v-if="saveError" class="text-red-500 text-sm mt-2">{{ saveError }}</p>
        </form>
      </div>

      <!-- Results Analysis Section -->
      <div class="bg-white shadow-md rounded-lg p-6 mt-6">
        <h2 class="text-2xl font-semibold mb-4">Results Analysis</h2>
        <button
          @click="loadAnalysisData"
          class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded mb-4"
          :disabled="isAnalysisLoading"
        >
          <span v-if="isAnalysisLoading">Loading Analysis Data...</span>
          <span v-else>Load/Refresh Analysis Data</span>
        </button>

        <div v-if="analysisError" class="text-red-500 bg-red-100 p-3 rounded mb-3">Error loading analysis data: {{ analysisError }}</div>

        <div v-if="!isAnalysisLoading && analysisData.numericStats && analysisData.numericStats.count > 0">
          <h3 class="text-xl font-semibold mb-2">Numeric Results Statistics</h3>
          <ul class="list-disc list-inside mb-4 pl-4 text-gray-700">
            <li>Count: {{ analysisData.numericStats.count }}</li>
            <li>Mean: {{ analysisData.numericStats.mean.toFixed(2) }}</li>
            <li>Median: {{ analysisData.numericStats.median.toFixed(2) }}</li>
            <li>Std Deviation: {{ analysisData.numericStats.stdDev.toFixed(2) }}</li>
            <li>Min: {{ analysisData.numericStats.min.toFixed(2) }}</li>
            <li>Max: {{ analysisData.numericStats.max.toFixed(2) }}</li>
          </ul>
        </div>
        <div v-else-if="!isAnalysisLoading && analysisData.numericStats && analysisData.numericStats.count === 0 && !analysisError" class="text-gray-500 mb-4">
          No numeric results found for statistical analysis.
        </div>

        <div v-if="!isAnalysisLoading && analysisData.categoricalStats && Object.keys(analysisData.categoricalStats).length > 0">
          <h3 class="text-xl font-semibold mb-2 mt-4">Categorical Results Frequency</h3>
          <ul class="list-disc list-inside pl-4 text-gray-700">
            <li v-for="(count, category) in analysisData.categoricalStats" :key="category">
              {{ category }}: {{ count }}
            </li>
          </ul>
        </div>
         <div v-else-if="!isAnalysisLoading && analysisData.categoricalStats && Object.keys(analysisData.categoricalStats).length === 0 && !analysisError" class="text-gray-500 mb-4">
          No categorical results found for frequency analysis.
        </div>
         <p v-if="!isAnalysisLoading && !analysisData.numericStats && !analysisData.categoricalStats && !analysisError" class="text-gray-500">
            No analysis data loaded or available for this test definition. Ensure results are numeric or simple strings.
        </p>
      </div>
      <!-- End Results Analysis Section -->

    </div>
     <div v-else-if="!store.loading && !store.error" class="text-center text-gray-500">
      Test definition not found or could not be loaded.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, reactive, computed } from 'vue'; // Added computed
import { useTestStore } from '@/stores/tests';
import { useRoute } from 'vue-router';

const props = defineProps({
  id: {
    type: [String, Number],
    required: true,
  },
});

const store = useTestStore();
const route = useRoute(); // useRouter is not needed here currently

const isEditing = ref(false);
const editableTest = reactive({ id: null, name: '', description: '', protocol: '' });
const saveError = ref(null);

// For Analysis Section
const isAnalysisLoading = ref(false);
const analysisError = ref(null);
const analysisData = ref({ numericStats: null, categoricalStats: null });
const samplesForAnalysis = computed(() => store.samplesForAnalysis);

const syncEditableTest = () => {
  if (store.currentTest) {
    editableTest.id = store.currentTest.id;
    editableTest.name = store.currentTest.name;
    editableTest.description = store.currentTest.description || '';
    editableTest.protocol = store.currentTest.protocol || '';
  } else {
    editableTest.id = null;
    editableTest.name = '';
    editableTest.description = '';
    editableTest.protocol = '';
  }
};

onMounted(async () => {
  await store.fetchTest(props.id);
  syncEditableTest();
  // Do not auto-load analysis data, let user click button
});

watch(() => props.id, async (newId) => {
  if (newId) {
    await store.fetchTest(newId);
    syncEditableTest();
    isEditing.value = false;
    // Reset analysis data when navigating to a new test
    analysisData.value = { numericStats: null, categoricalStats: null };
    analysisError.value = null;
    store.samplesForCurrentTestDefinition = []; // Clear previous analysis data in store
  }
});

// Watch for changes in the store's currentTest (e.g., after a save)
watch(() => store.currentTest, (newTest) => {
  if (newTest) {
    syncEditableTest();
  }
}, { deep: true });


const handleSaveTest = async () => {
  saveError.value = null;
  if (!editableTest.name.trim()) {
    saveError.value = 'Test definition name cannot be empty.';
    return;
  }
  try {
    await store.updateTest(editableTest.id, {
      name: editableTest.name,
      description: editableTest.description,
      protocol: editableTest.protocol,
    });
    isEditing.value = false;
    // Optionally show success message
  } catch (error) {
    saveError.value = `Failed to update test definition: ${store.error || error.message}`;
  }
};

const cancelEdit = () => {
  syncEditableTest(); // Reset to original values from store
  isEditing.value = false;
  saveError.value = null;
};

const loadAnalysisData = async () => {
  isAnalysisLoading.value = true;
  analysisError.value = null;
  analysisData.value = { numericStats: null, categoricalStats: null }; // Reset
  try {
    await store.fetchSamplesForTestDefinition(props.id);
    processAnalysisData();
  } catch (err) {
    analysisError.value = store.error || err.message || "Failed to load analysis data.";
  } finally {
    isAnalysisLoading.value = false;
  }
};

const processAnalysisData = () => {
  const results = samplesForAnalysis.value
    .filter(st => st.results !== null && st.results !== undefined && st.results.trim() !== '')
    .map(st => st.results);

  const numericResults = results.map(r => parseFloat(r)).filter(n => !isNaN(n));
  const categoricalResults = results.filter(r => isNaN(parseFloat(r))); // Simple check for non-numeric

  if (numericResults.length > 0) {
    numericResults.sort((a, b) => a - b);
    const sum = numericResults.reduce((acc, val) => acc + val, 0);
    const mean = sum / numericResults.length;
    const median = numericResults.length % 2 === 0
      ? (numericResults[numericResults.length / 2 - 1] + numericResults[numericResults.length / 2]) / 2
      : numericResults[Math.floor(numericResults.length / 2)];
    const variance = numericResults.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericResults.length;
    const stdDev = Math.sqrt(variance);

    analysisData.value.numericStats = {
      count: numericResults.length,
      mean,
      median,
      stdDev,
      min: numericResults[0],
      max: numericResults[numericResults.length - 1],
    };
  } else {
    analysisData.value.numericStats = { count: 0 };
  }

  if (categoricalResults.length > 0) {
    const frequencies = {};
    categoricalResults.forEach(cat => {
      frequencies[cat] = (frequencies[cat] || 0) + 1;
    });
    analysisData.value.categoricalStats = frequencies;
  } else {
     analysisData.value.categoricalStats = {};
  }
};


</script>

<style scoped>
/* Scoped styles if needed */
.list-disc { list-style-type: disc; }
.list-inside { list-style-position: inside; }
</style>
