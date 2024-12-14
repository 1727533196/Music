<template>
  <span>
    <div class="common-popover-container" ref="popper"></div>
    <div ref="reference">
      <slot name="reference"></slot>
    </div>
  </span>
</template>
<script setup>
import { onMounted, useTemplateRef } from 'vue'

const reference = useTemplateRef('reference')

onMounted(() => {
  console.log('reference', reference)
})
</script>
