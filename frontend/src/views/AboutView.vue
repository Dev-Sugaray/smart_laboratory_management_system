<template>
  <div class="about">
    <h1>About Us</h1>
    <p>This is the about page. Pinia state: {{ testStore.name }}</p>
    <input v-model="newName" placeholder="Set new name in Pinia store" />
    <button @click="setName">Set Name</button>
    <br/><router-link to="/">Go to Home Page</router-link>
  </div>
</template>
<script setup>
import { useTestStore } from '@/stores/testStore';
import { ref } from 'vue';

const testStore = useTestStore();
const newName = ref('');

const setName = () => {
  if (newName.value.trim()) {
    testStore.setName(newName.value);
    newName.value = '';
  }
};
</script>
<style scoped>
.about {
  text-align: center;
  margin-top: 20px;
}
</style>
