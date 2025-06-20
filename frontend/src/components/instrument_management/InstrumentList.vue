<template>
  <div class="mt-8 flow-root">
    <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <div v-if="store.isLoading" class="text-center py-4">
          <p>Loading instruments...</p>
          <!-- Consider adding a spinner component here -->
        </div>
        <div v-else-if="store.getError" class="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          <p>Error loading instruments: {{ store.getError }}</p>
        </div>
        <div v-else-if="instruments.length === 0" class="text-center py-4">
          <p class="text-gray-500">No instruments found. Register a new one to get started.</p>
        </div>
        <div v-else class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table class="min-w-full divide-y divide-gray-300">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Serial Number</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Make</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Model</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Next Calibration</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Maintenance Schedule</th>
                <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="instrument in instruments" :key="instrument.id">
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{{ instrument.name }}</td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ instrument.serial_number }}</td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ instrument.make || '-' }}</td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ instrument.model || '-' }}</td>
                <td class="whitespace-nowrap px-3 py-4 text-sm">
                  <span :class="statusBadgeClass(instrument.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                    {{ instrument.status }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm" :class="getCalibrationDateClass(instrument.calibration_date)">
                  {{ formatDate(instrument.calibration_date) }}
                  <span v-if="getCalibrationDateHint(instrument.calibration_date)" class="text-xs block opacity-75">
                    ({{ getCalibrationDateHint(instrument.calibration_date) }})
                  </span>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <!-- For now, just display text. Date parsing for schedule can be complex if not a standard date format -->
                  {{ instrument.maintenance_schedule || '-' }}
                </td>
                <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                  <button @click="$emit('edit-instrument', instrument)" class="text-indigo-600 hover:text-indigo-900">Edit</button>
                  <button @click="$emit('view-logs', instrument.id)" class="text-green-600 hover:text-green-900">Logs</button>
                  <button @click="confirmDelete(instrument.id)" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';

const store = useInstrumentManagementStore();
const instruments = computed(() => store.allInstruments);

const emit = defineEmits(['edit-instrument', 'view-logs', 'delete-instrument']);

onMounted(() => {
  store.fetchInstruments();
});

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const CALIBRATION_WARN_DAYS = 7; // Warn if calibration is within 7 days
const CALIBRATION_OVERDUE_DAYS = 0; // Overdue if past this many days from today

const getCalibrationDateClass = (dateString) => {
  if (!dateString) return 'text-gray-500';
  const calDate = new Date(dateString);
  if (isNaN(calDate.getTime())) return 'text-gray-500'; // Invalid date

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to start of day for comparison

  const calDateTime = calDate.getTime();
  const todayTime = today.getTime();

  const diffDays = Math.ceil((calDateTime - todayTime) / (1000 * 60 * 60 * 24));

  if (diffDays < CALIBRATION_OVERDUE_DAYS) {
    return 'text-red-600 font-semibold'; // Overdue
  } else if (diffDays <= CALIBRATION_WARN_DAYS) {
    return 'text-yellow-600 font-semibold'; // Warning
  }
  return 'text-gray-500'; // Normal
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


// Placeholder for maintenance schedule parsing - this is complex if it's free text.
// For now, we assume maintenance_schedule is just displayed as text.
// If it were a date, similar logic to calibration_date could be applied.

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Available': return 'bg-green-100 text-green-800';
    case 'In Use': return 'bg-blue-100 text-blue-800';
    case 'Under Maintenance': return 'bg-yellow-100 text-yellow-800';
    case 'Retired': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const confirmDelete = (id) => {
  if (window.confirm('Are you sure you want to delete this instrument? This action cannot be undone.')) {
    emit('delete-instrument', id);
  }
};
</script>
