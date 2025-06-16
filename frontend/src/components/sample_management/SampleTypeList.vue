<template>
  <div>
    <div v-if="isLoading" class="loading-indicator">Loading sample types...</div>
    <div v-else-if="sampleTypes && sampleTypes.length === 0" class="no-data-message">
      No sample types found.
    </div>
    <table v-else-if="sampleTypes && sampleTypes.length > 0" class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="sampleType in sampleTypes" :key="sampleType.id">
          <td>{{ sampleType.name }}</td>
          <td>{{ sampleType.description }}</td>
          <td>
            <button @click="$emit('edit-sample-type', sampleType)" class="button is-small is-info mr-2">Edit</button>
            <button @click="$emit('delete-sample-type', sampleType.id)" class="button is-small is-danger">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="no-data-message">
        <!-- Fallback if sampleTypes is null or undefined initially, though store initializes to [] -->
        No data available or error loading.
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  sampleTypes: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['edit-sample-type', 'delete-sample-type']);
</script>

<style scoped>
.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.table th, .table td {
  border: 1px solid #dbdbdb;
  padding: 0.5em 0.75em;
  text-align: left;
}
.table th {
  background-color: #f5f5f5;
  font-weight: bold;
}
.button.is-small {
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}
.button.is-info {
  background-color: #3273dc;
  color: white;
  border: none;
  cursor: pointer;
}
.button.is-danger {
  background-color: #ff3860;
  color: white;
  border: none;
  cursor: pointer;
}
.mr-2 {
  margin-right: 0.5rem;
}
.loading-indicator, .no-data-message {
  margin-top: 1rem;
  padding: 1rem;
  text-align: center;
  background-color: #f9f9f9;
  border: 1px solid #eee;
}
</style>
