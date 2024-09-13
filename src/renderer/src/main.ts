import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './assets/iconfont/iconfont.css'
import './assets/iconfont/iconfont.js'
import ElementIcon from '@/plugins/element-icon'
import InitComponent from '@/plugins/component'
import pinia from '@/store/sotre'
// import { logWrite } from './utils/errLog'

const app = createApp(App)
  .use(router)
  .use(pinia)
  .use(ElementPlus, { zIndex: 3000 })
  .use(ElementIcon)
  .use(InitComponent)

// window.onerror = function(message, source, lineno, colno, error) {
//   console.log('window.onerror捕获到异常：',{message, source, lineno, colno, error});
//   const fileContent = `window.onerror捕获到异常：${JSON.stringify({message, source, lineno, colno, error})}`;
//   logWrite(fileContent)
// }

// // 全局错误处理程序
// app.config.errorHandler = (err, vm, info) => {
//   console.error('vue组件全局错误捕获：', err, vm, info);
//   const fileContent = `Vue组件错误信息：${err}\n附加信息：${info}\n vm：${JSON.stringify(vm)}`;
//   logWrite(fileContent)
// };

app.mount('#app')
