import Tabs from '@/components/Tabs/index.vue'
import TabPane from '@/components/Tabs/TabPane.vue'
import BaseButton from '@/components/BaseButton/index.vue'
import Card from '@/components/Card/index.vue'
import { App } from 'vue'

const componentArr = [Tabs, TabPane, BaseButton, Card]

export default (app: App) => {
  componentArr.forEach((component) => {
    if (component.name) {
      app.component(component.name, component)
    }
  })
}
