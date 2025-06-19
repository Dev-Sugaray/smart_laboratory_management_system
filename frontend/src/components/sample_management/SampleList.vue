<template>
  <div>
    <div v-if="isLoading" class="loading-indicator">Loading samples...</div>
    <div v-else-if="!samples || samples.length === 0" class="no-data-message">
      No samples found.
    </div>
    <table v-else class="table is-striped is-hoverable is-fullwidth">
      <thead>
        <tr>
          <th v-if="enableSelection" style="width: 3em;">
            <input
              type="checkbox"
              @change="toggleSelectAll"
              :checked="areAllSelected && samples.length > 0"
              :disabled="samples.length === 0"
            />
          </th>
          <th>Unique ID</th>
          <th>Sample Type</th>
          <th>Source</th>
          <th>Collection Date</th>
          <th>Status</th>
          <th>Storage Location</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="sample in samples" :key="sample.id" :class="{'is-selected': isSelected(sample.id) && enableSelection }">
          <td v-if="enableSelection">
            <input
              type="checkbox"
              :value="sample.id"
              v-model="localSelectedSampleIds"
              @change="emitSelectionChange"
            />
          </td>
          <td>{{ sample.unique_sample_id }}</td>
          <td>{{ sample.sample_type_name || sample.sample_type_id }}</td>
          <td>{{ sample.source_name || sample.source_id }}</td>
          <td>{{ formatDate(sample.collection_date) }}</td>
          <td><span :class="getStatusClass(sample.current_status)">{{ sample.current_status }}</span></td>
          <td>{{ sample.storage_location_name || 'N/A' }}</td>
          <td>
            <button @click="$emit('view-sample-details', sample)" class="button is-small is-link">
              View Details
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <!-- Basic Pagination Placeholder - Functionality to be added if API supports & store handles it -->
    <!--
    <nav v-if="samples && samples.length > 0 && pagination" class="pagination is-centered" role="navigation" aria-label="pagination">
      <a class="pagination-previous" :disabled="pagination.offset === 0">Previous</a>
      <a class="pagination-next" :disabled="(pagination.offset + pagination.limit) >= pagination.total_count">Next page</a>
      <ul class="pagination-list">
        <li><span class="pagination-ellipsis">&hellip;</span></li>
      </ul>
    </nav>
    -->
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch, computed } from 'vue'; // Added ref, watch, computed

const props = defineProps({
  samples: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  enableSelection: { // New prop
    type: Boolean,
    default: false
  },
  selectedSamples: { // New prop to allow parent to clear selections
    type: Array,
    default: () => []
  }
  // pagination: { ... }
});

const emit = defineEmits(['view-sample-details', 'selected-samples-changed']); // Added new emit

const localSelectedSampleIds = ref([]);

// Watch for external changes to selectedSamples prop (e.g., parent clearing selection)
watch(() => props.selectedSamples, (newSelection) => {
  if (Array.isArray(newSelection)) {
    localSelectedSampleIds.value = [...newSelection];
  }
}, { deep: true });

// Watch for changes in the samples list itself (e.g., after filtering or data refresh)
// and ensure selected IDs that are no longer in the list are removed.
watch(() => props.samples, (newSamples) => {
  if (!props.enableSelection) return;
  const validSampleIds = new Set(newSamples.map(s => s.id));
  localSelectedSampleIds.value = localSelectedSampleIds.value.filter(id => validSampleIds.has(id));
  emitSelectionChange(); // Emit change if selection was pruned
}, { deep: true });


const emitSelectionChange = () => {
  if (props.enableSelection) {
    emit('selected-samples-changed', [...localSelectedSampleIds.value]);
  }
};

const isSelected = (sampleId) => {
  return localSelectedSampleIds.value.includes(sampleId);
};

const areAllSelected = computed(() => {
  if (!props.samples || props.samples.length === 0 || !props.enableSelection) {
    return false;
  }
  return props.samples.every(sample => localSelectedSampleIds.value.includes(sample.id));
});

const toggleSelectAll = (event) => {
  if (!props.enableSelection) return;
  if (event.target.checked) {
    localSelectedSampleIds.value = props.samples.map(sample => sample.id);
  } else {
    localSelectedSampleIds.value = [];
  }
  emitSelectionChange();
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString(); // Adjust format as needed
};

const getStatusClass = (status) => {
  // Basic styling for status, can be expanded
  switch (status) {
    case 'Registered': return 'tag is-light';
    case 'In Storage': return 'tag is-info';
    case 'In Analysis': return 'tag is-warning';
    case 'Discarded': return 'tag is-danger';
    case 'Archived': return 'tag is-dark';
    default: return 'tag';
  }
};
</script>

<style scoped>
.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.table th, .table td {
  border: 1px solid #dbdbdb;
  padding: 0.75em; /* Bulma default is 0.5em 0.75em */
  text-align: left;
  vertical-align: middle;
}
.table th {
  background-color: #f5f5f5;
  font-weight: bold;
}
.button.is-small {
  font-size: 0.875rem;
}
.loading-indicator, .no-data-message {
  margin-top: 1rem;
  padding: 1rem;
  text-align: center;
  background-color: #f9f9f9;
  border: 1px solid #eee;
}
/* Bulma tag styling (simplified, include Bulma CSS for full styles) */
.tag {
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: #4a4a4a;
  display: inline-flex;
  font-size: .75rem;
  height: 2em;
  justify-content: center;
  line-height: 1.5;
  padding-left: .75em;
  padding-right: .75em;
  white-space: nowrap;
}
.tag.is-light { background-color: #f5f5f5; }
.tag.is-info { background-color: #3273dc; color: #fff; }
.tag.is-warning { background-color: #ffdd57; color: rgba(0,0,0,.7); }
.tag.is-danger { background-color: #ff3860; color: #fff; }
.tag.is-dark { background-color: #363636; color: #fff; }

/* For pagination (if added later) */
/* .pagination { margin-top: 1rem; } */
</style>
