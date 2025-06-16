<template>
  <div class="box sample-form">
    <h3 class="subtitle">{{ formTitle }}</h3>
    <form @submit.prevent="handleSubmit">
      <!-- Sample Type Dropdown -->
      <div class="field">
        <label for="sample-type-id" class="label">Sample Type <span class="has-text-danger">*</span></label>
        <div class="control">
          <div class="select is-fullwidth" :class="{ 'is-loading': !sampleTypes.length && !isEditMode }">
            <select id="sample-type-id" v-model="formData.sample_type_id" required>
              <option :value="null" disabled>Select sample type</option>
              <option v-for="st in sampleTypes" :key="st.id" :value="st.id">
                {{ st.name }}
              </option>
            </select>
          </div>
        </div>
        <p v-if="formErrors.sample_type_id" class="help is-danger">{{ formErrors.sample_type_id }}</p>
      </div>

      <!-- Source Dropdown -->
      <div class="field">
        <label for="source-id" class="label">Source <span class="has-text-danger">*</span></label>
        <div class="control">
          <div class="select is-fullwidth" :class="{ 'is-loading': !sources.length && !isEditMode }">
            <select id="source-id" v-model="formData.source_id" required>
              <option :value="null" disabled>Select source</option>
              <option v-for="s in sources" :key="s.id" :value="s.id">
                {{ s.name }}
              </option>
            </select>
          </div>
        </div>
        <p v-if="formErrors.source_id" class="help is-danger">{{ formErrors.source_id }}</p>
      </div>

      <!-- Collection Date -->
      <div class="field">
        <label for="collection-date" class="label">Collection Date <span class="has-text-danger">*</span></label>
        <div class="control">
          <input type="date" id="collection-date" class="input" v-model="formData.collection_date" required />
        </div>
        <p v-if="formErrors.collection_date" class="help is-danger">{{ formErrors.collection_date }}</p>
      </div>

      <!-- Status Dropdown -->
      <div class="field">
        <label for="current-status" class="label">Status <span class="has-text-danger">*</span></label>
        <div class="control">
          <div class="select is-fullwidth">
            <select id="current-status" v-model="formData.current_status" required>
              <option v-for="status in statusOptions" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </div>
        </div>
         <p v-if="formErrors.current_status" class="help is-danger">{{ formErrors.current_status }}</p>
      </div>

      <!-- Storage Location Dropdown (Conditional) -->
      <div class="field" v-if="isStorageLocationRequired">
        <label for="storage-location-id" class="label">Storage Location <span class="has-text-danger">*</span></label>
        <div class="control">
          <div class="select is-fullwidth" :class="{ 'is-loading': !storageLocations.length && !isEditMode && isStorageLocationRequired }">
            <select id="storage-location-id" v-model="formData.storage_location_id" :required="isStorageLocationRequired">
              <option :value="null" disabled>Select storage location</option>
              <option v-for="sl in storageLocations" :key="sl.id" :value="sl.id">
                {{ sl.name }} (Capacity: {{ sl.current_load }}/{{ sl.capacity || 'N/A' }})
              </option>
            </select>
          </div>
        </div>
        <p v-if="formErrors.storage_location_id" class="help is-danger">{{ formErrors.storage_location_id }}</p>
      </div>

      <!-- Notes Textarea -->
      <div class="field">
        <label for="notes" class="label">Notes</label>
        <div class="control">
          <textarea id="notes" class="textarea" v-model="formData.notes"></textarea>
        </div>
      </div>

      <div class="field is-grouped">
        <div class="control">
          <button type="submit" class="button is-success" :class="{ 'is-loading': isLoading } " :disabled="isLoading">
            {{ isEditMode ? 'Save Changes' : 'Register Sample' }}
          </button>
        </div>
        <div class="control">
          <button type="button" @click="handleCancel" class="button is-light" :disabled="isLoading">
            Cancel
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  sampleTypes: { type: Array, default: () => [] },
  sources: { type: Array, default: () => [] },
  storageLocations: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  initialData: {
    type: Object,
    default: () => ({
      sample_type_id: null,
      source_id: null,
      collection_date: new Date().toISOString().split('T')[0],
      current_status: 'Registered',
      storage_location_id: null,
      notes: ''
    })
  },
  isEditMode: { type: Boolean, default: false }
});

const emit = defineEmits(['submit-sample', 'cancel']);

const formData = ref({ ...props.initialData });
const formErrors = ref({});

const statusOptions = ['Registered', 'In Storage', 'In Analysis', 'Archived', 'Discarded'];

watch(() => props.initialData, (newData) => {
  formData.value = { ...newData };
  if (props.isEditMode && newData.collection_date) { // Ensure date format for input type="date"
    formData.value.collection_date = newData.collection_date.split('T')[0];
  }
  formErrors.value = {};
}, { deep: true, immediate: true });

const formTitle = computed(() => {
  return props.isEditMode ? 'Edit Sample Details' : 'Register New Sample';
});

const isStorageLocationRequired = computed(() => {
  return formData.value.current_status === 'In Storage';
});

const validateForm = () => {
  const errors = {};
  if (!formData.value.sample_type_id) errors.sample_type_id = 'Sample Type is required.';
  if (!formData.value.source_id) errors.source_id = 'Source is required.';
  if (!formData.value.collection_date) errors.collection_date = 'Collection Date is required.';
  if (!formData.value.current_status) errors.current_status = 'Status is required.';
  if (isStorageLocationRequired.value && !formData.value.storage_location_id) {
    errors.storage_location_id = 'Storage Location is required when status is "In Storage".';
  }
  formErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const handleSubmit = () => {
  if (validateForm()) {
    // Ensure numeric IDs are numbers, not strings from select
    const dataToSubmit = {
      ...formData.value,
      sample_type_id: parseInt(formData.value.sample_type_id, 10),
      source_id: parseInt(formData.value.source_id, 10),
      storage_location_id: formData.value.storage_location_id ? parseInt(formData.value.storage_location_id, 10) : null,
    };
    emit('submit-sample', dataToSubmit);
  }
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.sample-form {
  margin-top: 1.5rem; margin-bottom: 1.5rem; padding: 1.5rem;
  background-color: #fdfdfd; border-radius: 6px;
}
.subtitle { margin-bottom: 1rem; }
.label { font-weight: bold; }
.input, .textarea, .select select {
  width: 100%; padding: 0.5em; border: 1px solid #dbdbdb; border-radius: 4px;
}
.select { display: block; position: relative; }
.select.is-fullwidth { width: 100%; }
.select:not(.is-multiple):not(.is-loading)::after { /* Bulma arrow style */
    border: 3px solid transparent;
    border-radius: 2px;
    border-right: 0;
    border-top: 0;
    content: " ";
    display: block;
    height: .625em;
    margin-top: -.4375em;
    pointer-events: none;
    position: absolute;
    top: 50%;
    transform: rotate(-45deg);
    transform-origin: center;
    width: .625em;
    border-color: #3273dc; /* Arrow color */
    right: 1.125em; /* Position of arrow */
    z-index: 4;
}
.textarea { min-height: 80px; }
.field:not(:last-child) { margin-bottom: 0.75rem; }
.field.is-grouped { display: flex; justify-content: flex-start; }
.field.is-grouped .control:not(:last-child) { margin-right: 0.75rem; }
.button.is-success { background-color: #48c774; color: white; }
.button.is-light { background-color: #f5f5f5; border-color: #dbdbdb; color: #363636; }
.help.is-danger { color: #ff3860; font-size: 0.875em; margin-top: 0.25rem; }
.has-text-danger { color: #ff3860; }
.is-loading select {
  opacity: 0.5;
  pointer-events: none;
}
</style>
