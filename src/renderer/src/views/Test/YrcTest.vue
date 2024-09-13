<script setup lang="ts">
import {ref} from "vue";
import Yrc1 from "@/views/Test/yrc1.vue";
import Yrc2 from "@/views/Test/yrc2.vue";

const val = ref('yrc1')

const click = (msg: string) => {
  val.value = msg
}
</script>

<template>
  <div style="position: absolute;z-index: 999;left: 0;top: 50%">
    <base-button @click="click('yrc1')">yrc1</base-button>
    <base-button @click="click('yrc2')">yrc2</base-button>
  </div>

  <Yrc1 v-if="val === 'yrc1'"></Yrc1>
  <Yrc2 v-else-if="val === 'yrc2'"></Yrc2>
</template>

<style lang="less">

</style>
