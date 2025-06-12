import { defineStore } from 'pinia';

export const useTestStore = defineStore('test', {
  state: () => ({
    name: 'Initial Pinia Name',
  }),
  actions: {
    setName(newName) {
      this.name = newName;
    },
  },
});
