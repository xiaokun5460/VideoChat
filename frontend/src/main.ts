// 导入深空极光设计系统样式
import '@/styles/globals.css'
import '@/styles/themes.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import { initializeStores } from '@/stores'
import App from './App.vue'

const app = createApp(App)

// 配置Pinia
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 初始化所有stores
initializeStores()

app.mount('#app')
