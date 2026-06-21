import {createApp} from 'vue'
import App from './App.vue'

console.log('main start mount')

// 监听主进程日志，输出到浏览器控制台
window.installer?.onLog?.((msg: string) => {
  console.log('%c[Main]', 'color: #4CAF50; font-weight: bold;', msg)
})

window.installer?.onLogError?.((msg: string) => {
  console.error('%c[Main Error]', 'color: #f44336; font-weight: bold;', msg)
})

createApp(App).mount('#app')

