<script lang="ts" setup>
import { ref } from 'vue'

interface Props {
  loading: boolean
}
const props = defineProps<Props>()
const cards = ref([
  {
    title: 'Homemade Dulce de Leche Ice Cream with Chocolate Chips',
    subtitle: 'Happy Foods',
    src: 'https://cdn.vuetifyjs.com/docs/images/graphics/dulce-ice-cream.png'
  },
  {
    title: 'Salted Caramel Swirl Ice Cream',
    subtitle: 'Stone Kitchen',
    src: 'https://cdn.vuetifyjs.com/docs/images/graphics/salted-caramel-ice-cream.png'
  },
  {
    title: 'Peanut Butter No-Churn Ice Cream',
    subtitle: 'The Sweeter Side',
    src: 'https://cdn.vuetifyjs.com/docs/images/graphics/peanut-butter-ice-cream.png'
  }
])
</script>

<template>
  <div>
    <v-container v-if="loading">
      <v-row>
        <v-col v-for="{ src, title, subtitle } in cards" :key="title" cols="12" lg="4" md="6">
          <v-skeleton-loader :loading="loading" height="240" type="image, list-item-two-line">
          </v-skeleton-loader>
        </v-col>
      </v-row>
    </v-container>
    <template v-else>
      <slot></slot>
    </template>
  </div>
</template>
