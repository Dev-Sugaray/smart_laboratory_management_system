<template>
  <div class="container">
    <h1 class="title">Manage Storage Locations</h1>

    <div class="block">
      <button
        v-if="!showAddForm && !showEditForm"
        @click="openAddStorageLocationForm"
        class="button is-primary">
        Add New Storage Location
      </button>
    </div>

    <!-- Form for Adding New Storage Location -->
    <StorageLocationForm
      v-if="showAddForm"
      :isEditMode="false"
      :initialData="newStorageLocationData"
      @submit-form="handleAddStorageLocation"
      @cancel-form="closeAddForm"
      class="mb-5"
    />

    <!-- Form for Editing Storage Location (in a modal) -->
    <div v-if="showEditForm && editingStorageLocation" class="modal is-active">
        <div class="modal-background" @click="closeEditForm"></div>
        <div class="modal-content">
            <StorageLocationForm
                :initialData="editingStorageLocation"
                :isEditMode="true"
                @submit-form="handleUpdateStorageLocation"
                @cancel-form="closeEditForm"
            />
        </div>
        <button @click="closeEditForm" class="modal-close is-large" aria-label="close"></button>
    </div>

    <div v-if="storeError" class="notification is-danger is-light">
      <button class="delete" @click="clearStoreError"></button>
      Error: {{ storeError }}
    </div>
     <div v-if="successMessage" class="notification is-success is-light">
      <button class="delete" @click="clearSuccessMessage"></button>
      {{ successMessage }}
    </div>

    <StorageLocationList
      v-if="!showAddForm && !showEditForm"
      :storageLocations="storageLocationsList"
      :isLoading="isLoading"
      @edit-storage-location="handleOpenEditForm"
      @delete-storage-location="handleDeleteStorageLocation"
    />
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import { useSampleManagementStore } from '@/stores/sampleManagement';
import StorageLocationList from '@/components/sample_management/StorageLocationList.vue';
import StorageLocationForm from '@/components/sample_management/StorageLocationForm.vue';

const sampleManagementStore = useSampleManagementStore();

const storageLocationsList = computed(() => sampleManagementStore.storageLocations);
const isLoading = computed(() => sampleManagementStore.isLoading);
const storeError = computed(() => sampleManagementStore.error);

const showAddForm = ref(false);
const newStorageLocationData = ref({ name: '', temperature: null, capacity: null });

const showEditForm = ref(false);
const editingStorageLocation = ref(null);
const successMessage = ref('');

onMounted(() => {
  sampleManagementStore.fetchStorageLocations();
});

const clearNotifications = () => {
  sampleManagementStore.error = null;
  successMessage.value = '';
};

const openAddStorageLocationForm = () => {
  clearNotifications();
  newStorageLocationData.value = { name: '', temperature: null, capacity: null };
  editingStorageLocation.value = null;
  showEditForm.value = false;
  showAddForm.value = true;
};

const closeAddForm = () => {
  showAddForm.value = false;
};

const handleAddStorageLocation = async (formData) => {
  clearNotifications();
  try {
    await sampleManagementStore.addStorageLocation(formData);
    successMessage.value = `Storage Location "${formData.name}" added successfully!`;
    closeAddForm();
  } catch (error) {
    console.error('Failed to add storage location (view):', error.message);
  }
};

const handleOpenEditForm = (location) => {
  clearNotifications();
  editingStorageLocation.value = { ...location };
  showAddForm.value = false;
  showEditForm.value = true;
};

const closeEditForm = () => {
  showEditForm.value = false;
  editingStorageLocation.value = null;
};

const handleUpdateStorageLocation = async (formData) => {
  clearNotifications();
  if (!editingStorageLocation.value || !editingStorageLocation.value.id) {
    sampleManagementStore.error = "Cannot update storage location: ID is missing.";
    return;
  }
  try {
    await sampleManagementStore.updateStorageLocation(editingStorageLocation.value.id, formData);
    successMessage.value = `Storage Location "${formData.name}" updated successfully!`;
    closeEditForm();
  } catch (error) {
    console.error('Failed to update storage location (view):', error.message);
  }
};

const handleDeleteStorageLocation = async (locationId) => {
  clearNotifications();
  if (confirm(`Are you sure you want to delete storage location ID ${locationId}? This action cannot be undone.`)) {
    try {
      await sampleManagementStore.deleteStorageLocation(locationId);
      successMessage.value = `Storage Location ID ${locationId} deleted successfully!`;
    } catch (error) {
      console.error(`Failed to delete storage location ID ${locationId} (view):`, error.message);
    }
  }
};
</script>

<style scoped>
/* Styles are identical to SampleTypeListView and SourceListView, can be refactored */
.container { padding: 20px; }
.title { font-size: 2rem; font-weight: bold; margin-bottom: 1.5rem; }
.block:not(:last-child) { margin-bottom: 1.5rem; }
.button.is-primary { background-color: #00d1b2; color: white; border: none; padding: 0.75em 1.5em; cursor: pointer; }
.notification { margin-top: 1rem; margin-bottom: 1rem; padding: 1rem 1.5rem; border-radius: 4px; position: relative; }
.notification.is-danger.is-light { background-color: #feecf0; color: #cc0f35; }
.notification.is-success.is-light { background-color: #effaf5; color: #257953; }
.notification .delete { position: absolute; right: 0.5rem; top: 0.5rem; background: rgba(10,10,10,.2); border: none; border-radius: 290486px; cursor: pointer; display: inline-block; font-size: 1rem; height: 20px; line-height: 20px; outline: none; padding: 0; text-align: center; vertical-align: top; width: 20px; }
.notification .delete::before, .notification .delete::after { background-color: #fff; content: ""; display: block; left: 50%; position: absolute; top: 50%; transform: translateX(-50%) translateY(-50%) rotate(45deg); transform-origin: center center; }
.notification .delete::before { height: 2px; width: 50%; }
.notification .delete::after { height: 50%; width: 2px; }
.mb-5 { margin-bottom: 1.25rem; }
.modal.is-active { display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; }
.modal-background { background-color: rgba(0, 0, 0, 0.75); position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
.modal-content { border-radius: 5px; max-width: 500px; width: 90%; z-index: 1001; } /* Form has its own bg and padding */
.modal-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; color: white; cursor: pointer; z-index: 1002; }
</style>
