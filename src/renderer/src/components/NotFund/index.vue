<script lang="ts" setup>
import {watch} from "vue";

const visible = defineModel({default: false})

watch(visible, (val) => {
  console.log('12312',val)
})
const onClose = () => {
  visible.value = false
}
</script>

<template>
  <VDialog
    v-model="visible"
    :scrim="false"
    max-width="400"
  >
    <VCard rounded="lg">
      <VCardTitle class="d-flex justify-space-between align-center">
        <div class="text-h5 text-medium-emphasis ps-2">当前歌曲暂无音源</div>
        <VBtn icon="mdi-close" variant="text" @click="onClose"></VBtn>
      </VCardTitle>
      <VCardText class="d-flex justify-center align-center">
        <VBtn variant="tonal" @click="onClose">好</VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

