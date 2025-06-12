<template>
  <div>
    <p>{{ msg }}</p>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  msg: {
    type: String,
    default: 'Hello'
  }
});
</script>
