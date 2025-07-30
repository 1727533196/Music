import { createApp } from 'vue'
import router from './router'
import pinia from '@/store/sotre'
// icon
import './assets/iconfont/iconfont.css'
import './assets/iconfont/iconfont.js'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
import ElementIcon from '@/plugins/element-icon'
// Vuetify
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
// Components
import App from './App.vue'
import InitComponent from '@/plugins/component'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark'
  }
})
const app = createApp(App)
  .use(router)
  .use(pinia)
  .use(vuetify)
  .use(ElementPlus, { size: 'small', zIndex: 3000 })
  .use(ElementIcon)
  .use(InitComponent)

app.mount('#app')
