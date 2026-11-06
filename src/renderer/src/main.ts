import { createApp } from 'vue'
import router from './router'
import pinia from '@/store/sotre'
// icon
import './assets/iconfont/iconfont.css'
import './assets/iconfont/iconfont.js'
import ElementPlus from 'element-plus'
import ElementIcon from '@/plugins/element-icon'
// Vuetify
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
// Load component styles after Vuetify's global reset so button colors are preserved.
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'element-plus/dist/index.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import './theme/themes.less'
import './assets/fonts.css'
import { initializeAppTheme } from '@/theme'
// Components
import App from './App.vue'
import InitComponent from '@/plugins/component'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#121314',
          surface: '#1c1e20',
          primary: '#ffffff',
          'on-primary': '#101216',
          'on-surface': '#f2f3f5',
          secondary: '#c5c8ce',
          error: '#ed8fa1'
        }
      },
      light: {
        dark: false,
        colors: {
          background: '#f6f7f8',
          surface: '#ffffff',
          primary: '#262626',
          'on-primary': '#ffffff',
          'on-surface': '#202328',
          secondary: '#535a64',
          error: '#bd3452'
        }
      }
    }
  }
})
const stopThemeSync = initializeAppTheme((scheme, accent) => {
  vuetify.theme.themes.value[scheme].colors.primary = accent
  vuetify.theme.global.name.value = scheme
})
const app = createApp(App)
  .use(router)
  .use(pinia)
  .use(vuetify)
  .use(ElementPlus, { size: 'small', zIndex: 3000 })
  .use(ElementIcon)
  .use(InitComponent)

app.onUnmount(stopThemeSync)
app.mount('#app')
