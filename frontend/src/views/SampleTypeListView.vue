<template>
  <div class="container">
    <h1 class="title">Manage Sample Types</h1>

    <div class="block">
      <button
        v-if="!showAddForm && !showEditForm"
        @click="openAddSampleTypeForm"
        class="button is-primary">
        Add New Sample Type
      </button>
    </div>

    <!-- Form for Adding New Sample Type -->
    <SampleTypeForm
      v-if="showAddForm"
      :isEditMode="false"
      :initialData="newSampleTypeData"
      @submit-form="handleAddSampleType"
      @cancel-form="closeAddForm"
      class="mb-5"
    />

    <div v-if="storeError" class="notification is-danger is-light">
      <button class="delete" @click="clearStoreError"></button>
      Error: {{ storeError }}
    </div>
     <div v-if="successMessage" class="notification is-success is-light">
      <button class="delete" @click="clearSuccessMessage"></button>
      {{ successMessage }}
    </div>

    <SampleTypeList
      v-if="!showAddForm && !showEditForm"
      :sampleTypes="sampleTypesList"
      :isLoading="isLoading"
      @edit-sample-type="handleOpenEditForm"
      @delete-sample-type="handleDeleteSampleType"
    />

    <!-- Modal for Editing Sample Type -->
    <div v-if="showEditForm && editingSampleType" class="modal is-active">
        <div class="modal-background" @click="closeEditForm"></div>
        <div class="modal-content">
            <SampleTypeForm
                :initialData="editingSampleType"
                :isEditMode="true"
                @submit-form="handleUpdateSampleType"
                @cancel-form="closeEditForm"
            />
        </div>
        <button @click="closeEditForm" class="modal-close is-large" aria-label="close"></button>
    </div>

  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import { useSampleManagementStore } from '@/stores/sampleManagement';
import SampleTypeList from '@/components/sample_management/SampleTypeList.vue';
import SampleTypeForm from '@/components/sample_management/SampleTypeForm.vue';

const sampleManagementStore = useSampleManagementStore();

const sampleTypesList = computed(() => sampleManagementStore.sampleTypes);
const isLoading = computed(() => sampleManagementStore.isLoading);
const storeError = computed(() => sampleManagementStore.error);

const showAddForm = ref(false);
const newSampleTypeData = ref({ name: '', description: '' }); // For clearing add form

const showEditForm = ref(false);
const editingSampleType = ref(null);
const successMessage = ref('');

onMounted(() => {
  sampleManagementStore.fetchSampleTypes();
});

const clearNotifications = () => {
  sampleManagementStore.error = null;
  successMessage.value = '';
};

const openAddSampleTypeForm = () => {
  clearNotifications();
  newSampleTypeData.value = { name: '', description: '' }; // Reset for add
  editingSampleType.value = null;
  showEditForm.value = false;
  showAddForm.value = true;
};

const closeAddForm = () => {
  showAddForm.value = false;
};

const handleAddSampleType = async (formData) => {
  clearNotifications();
  try {
    await sampleManagementStore.addSampleType(formData);
    successMessage.value = `Sample type "${formData.name}" added successfully!`;
    closeAddForm();
    // List updates via fetchSampleTypes in store action
  } catch (error) {
    // error is set in store and displayed by computed 'storeError'
    console.error('Failed to add sample type view:', error.message);
  }
};

const handleOpenEditForm = (sampleType) => {
  clearNotifications();
  editingSampleType.value = { ...sampleType }; // Use a copy for the form
  showAddForm.value = false;
  showEditForm.value = true;
};

const closeEditForm = () => {
  showEditForm.value = false;
  editingSampleType.value = null;
};

const handleUpdateSampleType = async (formData) => {
  clearNotifications();
  if (!editingSampleType.value || !editingSampleType.value.id) {
    sampleManagementStore.error = "Cannot update sample type: ID is missing.";
    return;
  }
  try {
    await sampleManagementStore.updateSampleType(editingSampleType.value.id, formData);
    successMessage.value = `Sample type "${formData.name}" updated successfully!`;
    closeEditForm();
    // List updates via fetchSampleTypes in store action
  } catch (error) {
    console.error('Failed to update sample type view:', error.message);
  }
};

const handleDeleteSampleType = async (sampleTypeId) => {
  clearNotifications();
  if (confirm(`Are you sure you want to delete sample type ID ${sampleTypeId}? This action cannot be undone.`)) {
    console.log(`Attempting to delete sample type ID: ${sampleTypeId}`);
    try {
      await sampleManagementStore.deleteSampleType(sampleTypeId);
      successMessage.value = `Sample type ID ${sampleTypeId} deleted successfully!`;
      // The list will refresh via fetchSampleTypes in the store action.
    } catch (error) {
      // Error is already set in the store by the action, so it will display via computed 'storeError'
      // No need to set it directly here, but good to log for debugging the view/component level.
      console.error(`Failed to delete sample type ID ${sampleTypeId} from view:`, error.message);
    }
  } else {
    console.log(`Deletion cancelled for sample type ID ${sampleTypeId}`);
  }
};

</script>

<style scoped>
.container {
  padding: 20px;
}
.title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
}
.block:not(:last-child) {
  margin-bottom: 1.5rem;
}
.button.is-primary {
  background-color: #00d1b2;
  color: white;
  border: none;
  padding: 0.75em 1.5em;
  cursor: pointer;
}
.notification {
  margin-top: 1rem;
  margin-bottom: 1rem;
  padding: 1rem 1.5rem 1rem 1.5rem; /* Adjusted padding to be consistent */
  border-radius: 4px;
  position: relative;
}
.notification.is-danger.is-light {
  background-color: #feecf0;
  color: #cc0f35;
}
.notification.is-success.is-light {
  background-color: #effaf5;
  color: #257953;
}
.notification .delete {
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
    background: rgba(10,10,10,.2);
    border: none;
    border-radius: 290486px;
    cursor: pointer;
    display: inline-block;
    font-size: 1rem;
    height: 20px;
    line-height: 20px;
    outline: none;
    padding: 0;
    text-align: center;
    vertical-align: top;
    width: 20px;
}
.notification .delete::before, .notification .delete::after {
    background-color: #fff;
    content: "";
    display: block;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translateX(-50%) translateY(-50%) rotate(45deg);
    transform-origin: center center;
}
.notification .delete::before {
    height: 2px;
    width: 50%;
}
.notification .delete::after {
    height: 50%;
    width: 2px;
}
.mb-5 {
    margin-bottom: 1.25rem;
}
.modal.is-active {
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}
.modal-background {
  background-color: rgba(0, 0, 0, 0.75);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.modal-content {
  /* background-color: white; - Handled by SampleTypeForm's .box style */
  /* padding: 20px; - Handled by SampleTypeForm's .box style */
  border-radius: 5px; /* Or ensure form has it */
  max-width: 500px;
  width: 90%;
  z-index: 1001;
}
.modal-close {
    position: absolute;
    top: 15px;
    right: 15px;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: white; /* Ensure visibility against dark background */
    cursor: pointer;
    z-index: 1002; /* Above modal content */
}
</style>
