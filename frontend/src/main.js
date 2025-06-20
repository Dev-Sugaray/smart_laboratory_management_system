import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router' // Import router
import './index.css' // Import Tailwind CSS

const app = createApp(App)
const pinia = createPinia()

app.use(pinia) // Use Pinia
app.use(router) // Use router

app.mount('#app')
