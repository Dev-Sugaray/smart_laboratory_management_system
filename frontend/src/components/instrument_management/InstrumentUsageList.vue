<template>
  <div class="mt-8">
    <h3 class="text-lg font-medium mb-3">Instrument Usage Logs</h3>
    <div v-if="store.isUsageLogLoading && logs.length === 0" class="text-center py-4">
      <p>Loading usage logs...</p>
    </div>
    <div v-else-if="store.getUsageLogError" class="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
      <p>Error loading usage logs: {{ store.getUsageLogError }}</p>
    </div>
    <div v-else-if="logs.length === 0" class="text-center py-4">
      <p class="text-gray-500">No usage logs found for this instrument.</p>
    </div>
    <div v-else class="flow-root">
      <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">User</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Start Time</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">End Time</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Duration</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Notes</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Logged At</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="log in logs" :key="log.id">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {{ log.user_full_name || log.user_username || 'N/A' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatDateTime(log.start_time) }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ log.end_time ? formatDateTime(log.end_time) : '-' }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ calculateDuration(log.start_time, log.end_time) }}</td>
                  <td class="whitespace-pre-wrap px-3 py-4 text-sm text-gray-500 max-w-xs break-words">{{ log.notes || '-' }}</td>
                   <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatDateTime(log.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onUnmounted } from 'vue';
import { useInstrumentManagementStore } from '@/stores/instrumentManagement';

const props = defineProps({
  instrumentId: {
    type: [String, Number],
    required: true,
  },
});

const store = useInstrumentManagementStore();
const logs = computed(() => store.getUsageLogs);

const fetchLogs = () => {
  if (props.instrumentId) {
    store.fetchUsageLogs(props.instrumentId);
  }
};

// Fetch logs when component is mounted or instrumentId changes
watch(() => props.instrumentId, fetchLogs, { immediate: true });

const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '-';
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};

const calculateDuration = (start, end) => {
  if (!start || !end) return '-';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Invalid dates';

  let diff = endDate.getTime() - startDate.getTime(); // difference in milliseconds
  if (diff < 0) return 'Invalid range';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * (1000 * 60 * 60);
  const minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * (1000 * 60);
  const seconds = Math.floor(diff / 1000);

  let durationString = '';
  if (hours > 0) durationString += `${hours}h `;
  if (minutes > 0 || hours > 0) durationString += `${minutes}m `; // show minutes if hours present
  durationString += `${seconds}s`;

  return durationString.trim() || '0s'; // if duration is 0
};

// Clear logs when component is unmounted to avoid showing stale data for another instrument
onUnmounted(() => {
  store.clearUsageLogs();
});

</script>
