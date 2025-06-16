<template>
  <div class="box storage-location-form">
    <h3 class="subtitle">{{ formTitle }}</h3>
    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label for="loc-name" class="label">Name</label>
        <div class="control">
          <input
            type="text"
            id="loc-name"
            class="input"
            v-model.trim="formData.name"
            required
          />
        </div>
        <p v-if="formErrors.name" class="help is-danger">{{ formErrors.name }}</p>
      </div>

      <div class="field">
        <label for="loc-temp" class="label">Temperature (°C)</label>
        <div class="control">
          <input
            type="number"
            step="any"
            id="loc-temp"
            class="input"
            v-model.number="formData.temperature"
          />
        </div>
         <p v-if="formErrors.temperature" class="help is-danger">{{ formErrors.temperature }}</p>
      </div>

      <div class="field">
        <label for="loc-capacity" class="label">Capacity (Units)</label>
        <div class="control">
          <input
            type="number"
            step="1"
            id="loc-capacity"
            class="input"
            v-model.number="formData.capacity"
          />
        </div>
        <p v-if="formErrors.capacity" class="help is-danger">{{ formErrors.capacity }}</p>
      </div>

      <!-- current_load is typically not manually set when creating/editing a location's definition -->

      <div class="field is-grouped">
        <div class="control">
          <button type="submit" class="button is-success">
            {{ isEditMode ? 'Save Changes' : 'Add Storage Location' }}
          </button>
        </div>
        <div class="control">
          <button type="button" @click="handleCancel" class="button is-light">
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
  initialData: {
    type: Object,
    default: () => ({ name: '', temperature: null, capacity: null })
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit-form', 'cancel-form']);

// Ensure temperature and capacity are numbers or null
const getInitialFormData = () => {
    const data = props.initialData;
    return {
        name: data.name || '',
        temperature: typeof data.temperature === 'number' ? data.temperature : null,
        capacity: typeof data.capacity === 'number' && Number.isInteger(data.capacity) ? data.capacity : null,
    };
};

const formData = ref(getInitialFormData());
const formErrors = ref({ name: '', temperature: '', capacity: '' });


watch(() => props.initialData, () => {
  formData.value = getInitialFormData();
  formErrors.value = { name: '', temperature: '', capacity: '' };
}, { deep: true, immediate: true });


const formTitle = computed(() => {
  return props.isEditMode ? 'Edit Storage Location' : 'Add New Storage Location';
});

const validateForm = () => {
  let isValid = true;
  formErrors.value = { name: '', temperature: '', capacity: '' }; // Reset

  if (!formData.value.name) {
    formErrors.value.name = 'Name is required.';
    isValid = false;
  }
  if (formData.value.temperature !== null && typeof formData.value.temperature !== 'number') {
    formErrors.value.temperature = 'Temperature must be a number if provided.';
    isValid = false;
  }
  if (formData.value.capacity !== null && (!Number.isInteger(formData.value.capacity) || formData.value.capacity < 0) ) {
    formErrors.value.capacity = 'Capacity must be a non-negative integer if provided.';
    isValid = false;
  }
  return isValid;
};

const handleSubmit = () => {
  if (validateForm()) {
    // Prepare data: Ensure empty strings for numbers become null for the backend if desired
    const dataToSubmit = {
        ...formData.value,
        temperature: formData.value.temperature === '' ? null : formData.value.temperature,
        capacity: formData.value.capacity === '' || formData.value.capacity === null ? null : parseInt(formData.value.capacity, 10),
    };
    emit('submit-form', dataToSubmit);
  }
};

const handleCancel = () => {
  emit('cancel-form');
};
</script>

<style scoped>
.storage-location-form {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background-color: #fdfdfd;
  border-radius: 6px;
}
.subtitle {
  margin-bottom: 1rem;
}
.label {
  font-weight: bold;
}
.input, .textarea { /* .textarea might not be used here but good for consistency */
  width: 100%;
  padding: 0.5em;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
}
.field:not(:last-child) {
  margin-bottom: 0.75rem;
}
.field.is-grouped {
  display: flex;
  justify-content: flex-start;
}
.field.is-grouped .control:not(:last-child) {
  margin-right: 0.75rem;
}
.button.is-success {
  background-color: #48c774;
  color: white;
}
.button.is-light {
  background-color: #f5f5f5;
  border-color: #dbdbdb;
  color: #363636;
}
.help.is-danger {
  color: #ff3860;
  font-size: 0.875em;
  margin-top: 0.25rem;
}
</style>
