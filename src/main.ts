import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Enable iOS WebKit :active pseudo-class support on touch
if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', () => {}, { passive: true });
}

createApp(App).use(router).mount('#app')
