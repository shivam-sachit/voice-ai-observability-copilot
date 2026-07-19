// Frontend entry point: create the Vue app, install Pinia (state) and the router, mount it.
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router.js'

createApp(App).use(createPinia()).use(router).mount('#app')
