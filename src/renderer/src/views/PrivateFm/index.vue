<script setup lang="ts">

const resetApp = () => {
  window.electronAPI.reset()
}

</script>

<template>
  <h1>私人FM</h1>
  <el-button style="width: 80px;margin-left: 20px" @click="resetApp()">重启app</el-button>
</template>

<style scoped>

</style>