import Tabs from '@/components/Tabs/index.vue'
import TabPane from '@/components/Tabs/TabPane.vue'
import BaseButton from '@/components/BaseButton/index.vue'
import Card from '@/components/Card/index.vue'

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    Tabs: typeof Tabs;
    TabPane: typeof TabPane;
    BaseButton: typeof BaseButton;
    Card: typeof Card;
  }
}

export {}