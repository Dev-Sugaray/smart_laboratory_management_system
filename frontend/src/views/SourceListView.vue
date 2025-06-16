<template>
  <div class="container">
    <h1 class="title">Manage Sources</h1>

    <div class="block">
      <button
        v-if="!showAddForm && !showEditForm"
        @click="openAddSourceForm"
        class="button is-primary">
        Add New Source
      </button>
    </div>

    <!-- Form for Adding New Source -->
    <SourceForm
      v-if="showAddForm"
      :isEditMode="false"
      :initialData="newSourceData"
      @submit-form="handleAddSource"
      @cancel-form="closeAddForm"
      class="mb-5"
    />

    <!-- Form for Editing Source (in a modal) -->
    <div v-if="showEditForm && editingSource" class="modal is-active">
        <div class="modal-background" @click="closeEditForm"></div>
        <div class="modal-content">
            <SourceForm
                :initialData="editingSource"
                :isEditMode="true"
                @submit-form="handleUpdateSource"
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

    <SourceList
      v-if="!showAddForm && !showEditForm"
      :sources="sourcesList"
      :isLoading="isLoading"
      @edit-source="handleOpenEditForm"
      @delete-source="handleDeleteSource"
    />
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import { useSampleManagementStore } from '@/stores/sampleManagement';
import SourceList from '@/components/sample_management/SourceList.vue';
import SourceForm from '@/components/sample_management/SourceForm.vue';

const sampleManagementStore = useSampleManagementStore();

const sourcesList = computed(() => sampleManagementStore.sources);
const isLoading = computed(() => sampleManagementStore.isLoading);
const storeError = computed(() => sampleManagementStore.error);

const showAddForm = ref(false);
const newSourceData = ref({ name: '', description: '' });

const showEditForm = ref(false);
const editingSource = ref(null);
const successMessage = ref('');

onMounted(() => {
  sampleManagementStore.fetchSources();
});

const clearNotifications = () => {
  sampleManagementStore.error = null;
  successMessage.value = '';
};

const openAddSourceForm = () => {
  clearNotifications();
  newSourceData.value = { name: '', description: '' };
  editingSource.value = null;
  showEditForm.value = false;
  showAddForm.value = true;
};

const closeAddForm = () => {
  showAddForm.value = false;
};

const handleAddSource = async (formData) => {
  clearNotifications();
  try {
    await sampleManagementStore.addSource(formData);
    successMessage.value = `Source "${formData.name}" added successfully!`;
    closeAddForm();
  } catch (error) {
    console.error('Failed to add source (view):', error.message);
  }
};

const handleOpenEditForm = (source) => {
  clearNotifications();
  editingSource.value = { ...source };
  showAddForm.value = false;
  showEditForm.value = true;
};

const closeEditForm = () => {
  showEditForm.value = false;
  editingSource.value = null;
};

const handleUpdateSource = async (formData) => {
  clearNotifications();
  if (!editingSource.value || !editingSource.value.id) {
    sampleManagementStore.error = "Cannot update source: ID is missing.";
    return;
  }
  try {
    await sampleManagementStore.updateSource(editingSource.value.id, formData);
    successMessage.value = `Source "${formData.name}" updated successfully!`;
    closeEditForm();
  } catch (error) {
    console.error('Failed to update source (view):', error.message);
  }
};

const handleDeleteSource = async (sourceId) => {
  clearNotifications();
  if (confirm(`Are you sure you want to delete source ID ${sourceId}? This action cannot be undone.`)) {
    try {
      await sampleManagementStore.deleteSource(sourceId);
      successMessage.value = `Source ID ${sourceId} deleted successfully!`;
    } catch (error) {
      console.error(`Failed to delete source ID ${sourceId} (view):`, error.message);
    }
  }
};
</script>

<style scoped>
/* Styles are identical to SampleTypeListView, can be refactored to common styles if desired */
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
.modal-content { border-radius: 5px; max-width: 500px; width: 90%; z-index: 1001; }
.modal-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; color: white; cursor: pointer; z-index: 1002; }
</style>
