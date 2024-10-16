import { createApp } from 'vue'
import VueFullscreen from 'vue-fullscreen'
import App from './App.vue'

export const app = createApp(App)
app.use(VueFullscreen)
app.mount('#app')
