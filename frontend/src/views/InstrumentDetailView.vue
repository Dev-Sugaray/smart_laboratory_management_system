<template>
  <div class="p-4 md:p-6">
    <div v-if="store.isLoading" class="text-center py-10">
      <p>Loading instrument details...</p>
      <!-- Consider a spinner component -->
    </div>
    <div v-else-if="store.getError && !instrument" class="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
      <p>Error loading instrument: {{ store.getError }}</p>
      <router-link to="/instrument-management" class="text-indigo-600 hover:underline">Go back to list</router-link>
    </div>
    <div v-else-if="instrument" class="max-w-4xl mx-auto">
      <header class="mb-6">
        <div class="flex justify-between items-center">
          <h1 class="text-3xl font-semibold text-gray-900">{{ instrument.name }}</h1>
          <router-link
            to="/instrument-management"
            class="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back to Instrument List
          </router-link>
        </div>
        <p class="text-sm text-gray-500">Serial Number: {{ instrument.serial_number }}</p>
      </header>

      <div class="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">Instrument Details</h3>
        </div>
        <div class="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl class="sm:divide-y sm:divide-gray-200">
            <div class="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Make</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ instrument.make || '-' }}</dd>
            </div>
            <div class="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Model</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ instrument.model || '-' }}</dd>
            </div>
            <div class="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Status</dt>
              <dd class="mt-1 text-sm sm:mt-0 sm:col-span-2">
                 <span :class="statusBadgeClass(instrument.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                    {{ instrument.status }}
                  </span>
              </dd>
            </div>
            <div class="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Next Calibration Date</dt>
              <dd class="mt-1 text-sm sm:mt-0 sm:col-span-2" :class="getCalibrationDateClass(instrument.calibration_date)">
                {{ formatDate(instrument.calibration_date) }}
                <span v-if="getCalibrationDateHint(instrument.calibration_date)" class="text-xs block opacity-75">
                  ({{ getCalibrationDateHint(instrument.calibration_date) }})
                </span>
              </dd>
            </div>
            <div class="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Maintenance Schedule</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {{ instrument.maintenance_schedule || '-' }}
                <!-- Add similar class/hint logic if maintenance_schedule becomes a date field -->
              </dd>
            </div>
             <div class="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Created At</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ formatDateTime(instrument.created_at) }}</dd>
            </div>
            <div class="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ formatDateTime(instrument.updated_at) }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Instrument Usage Log Form -->
      <InstrumentUsageLogForm :instrument-id="instrumentId" @usage-logged="handleUsageLogged" />

      <!-- Instrument Usage List -->
      <InstrumentUsageList :instrument-id="instrumentId" ref="usageListRef" />

    </div>
    <div v-else class="text-center py-10">
      <p class="text-gray-500">Instrument not found.</p>
      <router-link to="/instrument-management" class="text-indigo-600 hover:underline">Go back to list</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';
import InstrumentUsageLogForm from '@/components/instrument_management/InstrumentUsageLogForm.vue';
import InstrumentUsageList from '@/components/instrument_management/InstrumentUsageList.vue';

const route = useRoute();
const store = useInstrumentManagementStore();

const instrumentId = computed(() => route.params.id);
const instrument = computed(() => store.currentInstrument);
const usageListRef = ref(null); // To potentially call methods on child if needed

const fetchInstrumentDetails = async () => {
  if (instrumentId.value) {
    // Check if the current instrument in store is already the one we want
    if (!store.currentInstrument || store.currentInstrument.id !== parseInt(instrumentId.value)) {
      await store.fetchInstrumentById(instrumentId.value);
    }
  }
};

onMounted(() => {
  fetchInstrumentDetails();
});

// Watch for route param changes if user navigates from one detail view to another (less common)
watch(instrumentId, (newId, oldId) => {
  if (newId !== oldId) {
    store.clearCurrentInstrument(); // Clear old instrument data
    store.clearUsageLogs(); // Clear old usage logs
    fetchInstrumentDetails();
  }
});

const handleUsageLogged = () => {
  // The usage list component will automatically refresh via its own store subscription
  // or its watch effect on instrumentId if that's how it's set up.
  // If direct refresh is needed: usageListRef.value?.fetchLogs();
  // (This would require exposing fetchLogs in InstrumentUsageList)
  console.log('Usage logged, list should update.');
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '-';
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};

// --- Calibration Date Helpers (similar to InstrumentList) ---
const CALIBRATION_WARN_DAYS = 7;
const CALIBRATION_OVERDUE_DAYS = 0;

const getCalibrationDateClass = (dateString) => {
  if (!dateString) return 'text-gray-900'; // Default color in detail view
  const calDate = new Date(dateString);
  if (isNaN(calDate.getTime())) return 'text-gray-900';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((calDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < CALIBRATION_OVERDUE_DAYS) {
    return 'text-red-600 font-semibold';
  } else if (diffDays <= CALIBRATION_WARN_DAYS) {
    return 'text-yellow-600 font-semibold';
  }
  return 'text-gray-900';
};

const getCalibrationDateHint = (dateString) => {
  if (!dateString) return null;
  const calDate = new Date(dateString);
  if (isNaN(calDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((calDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < CALIBRATION_OVERDUE_DAYS) {
    return `Overdue by ${Math.abs(diffDays)}d`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays <= CALIBRATION_WARN_DAYS) {
    return `Due in ${diffDays}d`;
  }
  return null;
};
// --- End Calibration Date Helpers ---

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Available': return 'bg-green-100 text-green-800';
    case 'In Use': return 'bg-blue-100 text-blue-800';
    case 'Under Maintenance': return 'bg-yellow-100 text-yellow-800';
    case 'Retired': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

onUnmounted(() => {
  store.clearCurrentInstrument();
  store.clearUsageLogs(); // Ensure logs are cleared when leaving the detail view
});

</script>
