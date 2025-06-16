<template>
  <div class="box sample-type-form">
    <h3 class="subtitle">{{ formTitle }}</h3>
    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label for="type-name" class="label">Name</label>
        <div class="control">
          <input
            type="text"
            id="type-name"
            class="input"
            v-model.trim="formData.name"
            required
          />
        </div>
        <p v-if="formErrors.name" class="help is-danger">{{ formErrors.name }}</p>
      </div>

      <div class="field">
        <label for="type-desc" class="label">Description</label>
        <div class="control">
          <textarea
            id="type-desc"
            class="textarea"
            v-model="formData.description"
          ></textarea>
        </div>
      </div>

      <div class="field is-grouped">
        <div class="control">
          <button type="submit" class="button is-success">
            {{ isEditMode ? 'Save Changes' : 'Add Sample Type' }}
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
    default: () => ({ name: '', description: '' })
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit-form', 'cancel-form']);

const formData = ref({ ...props.initialData });
const formErrors = ref({ name: '' });

// Watch for changes in initialData to reset form (e.g., when opening edit modal)
watch(() => props.initialData, (newData) => {
  formData.value = { ...newData };
  formErrors.value = { name: '' }; // Reset errors
}, { deep: true, immediate: true });


const formTitle = computed(() => {
  return props.isEditMode ? 'Edit Sample Type' : 'Add New Sample Type';
});

const validateForm = () => {
  let isValid = true;
  formErrors.value.name = '';
  if (!formData.value.name) {
    formErrors.value.name = 'Name is required.';
    isValid = false;
  }
  // Add other validations if needed
  return isValid;
};

const handleSubmit = () => {
  if (validateForm()) {
    emit('submit-form', { ...formData.value });
  }
};

const handleCancel = () => {
  emit('cancel-form');
};
</script>

<style scoped>
.sample-type-form {
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
.input, .textarea {
  width: 100%;
  padding: 0.5em;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
}
.textarea {
  min-height: 80px;
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
