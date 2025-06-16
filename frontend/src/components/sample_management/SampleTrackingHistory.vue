<template>
  <div class="sample-tracking-history">
    <h3 class="subtitle is-4">Chain of Custody / Lifecycle</h3>
    <div v-if="isLoading" class="loading-indicator">Loading history...</div>
    <div v-else-if="!historyEvents || historyEvents.length === 0" class="no-data-message">
      No history events found for this sample.
    </div>
    <ul v-else class="timeline">
      <li v-for="event in historyEvents" :key="event.id" class="timeline-item">
        <div class="timeline-marker" :class="getMarkerClass(event)"></div>
        <div class="timeline-content">
          <p class="heading">{{ formatDate(event.timestamp) }}</p>
          <p><strong>Action:</strong> {{ event.action }}</p>
          <p><strong>User:</strong> {{ event.user_full_name || event.user_username || 'N/A' }}</p>
          <p v-if="event.previous_location_name">
            <strong>From:</strong> {{ event.previous_location_name }}
          </p>
          <p v-if="event.new_location_name">
            <strong>To:</strong> {{ event.new_location_name }}
          </p>
          <p v-if="event.notes" class="notes">
            <strong>Notes:</strong> {{ event.notes }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  historyEvents: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const getMarkerClass = (event) => {
  // Basic styling for timeline markers, can be expanded
  if (event.action?.toLowerCase().includes('registered')) return 'is-success';
  if (event.action?.toLowerCase().includes('status updated') || event.action?.toLowerCase().includes('moved')) return 'is-info';
  if (event.action?.toLowerCase().includes('discarded')) return 'is-danger';
  return 'is-primary'; // Default
};
</script>

<style scoped>
/* Basic Timeline CSS - can be significantly enhanced */
.sample-tracking-history {
  margin-top: 2rem;
}
.subtitle.is-4 {
  margin-bottom: 1rem;
}
.timeline {
  list-style: none;
  padding: 0;
  position: relative; /* For pseudo-element line if desired */
}
.timeline-item {
  position: relative;
  padding-left: 30px; /* Space for marker */
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-left: 2px solid #dbdbdb; /* The timeline itself */
}
.timeline-item:last-child {
  border-left: 2px solid transparent; /* No line after the last item's marker */
  margin-bottom: 0;
}
.timeline-marker {
  position: absolute;
  left: -9px; /* Center the marker on the line */
  top: 5px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #dbdbdb; /* Default marker color */
  border: 2px solid white; /* To make it pop from the line */
}
.timeline-marker.is-success { background-color: #48c774; }
.timeline-marker.is-info { background-color: #3273dc; }
.timeline-marker.is-danger { background-color: #ff3860; }
.timeline-marker.is-primary { background-color: #00d1b2; }

.timeline-content {
  background-color: #f9f9f9;
  padding: 10px 15px;
  border-radius: 4px;
  border: 1px solid #eee;
}
.timeline-content .heading { /* Bulma .heading style */
  color: #7a7a7a;
  display: block;
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 5px;
  text-transform: uppercase;
}
.timeline-content p {
  margin-bottom: 0.3em;
}
.timeline-content p:last-child {
  margin-bottom: 0;
}
.notes {
  font-style: italic;
  color: #555;
  font-size: 0.9em;
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px dashed #eee;
}
.loading-indicator, .no-data-message {
  margin-top: 1rem;
  padding: 1rem;
  text-align: center;
  background-color: #f9f9f9;
  border: 1px solid #eee;
}
</style>
