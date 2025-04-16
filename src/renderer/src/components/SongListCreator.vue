<script setup lang="ts">
import { createPlay } from '../api/play'
import { ref } from 'vue'
import { getUserPlayListFn } from '../utils/userInfo'
import { ElMessage } from 'element-plus'

const visible = defineModel({ default: false })
const loading = ref(false)
const desc = ref('')
const privacy = ref(false)
const closeDialog = () => {
  visible.value = false
}
const create = async () => {
  loading.value = true
  try {
    const isPrivacy = privacy.value ? '10' : ''
    const res = await createPlay(desc.value, isPrivacy)
    getUserPlayListFn()
    closeDialog()
    ElMessage.success('创建成功')
  } catch {
    ElMessage.error('因某种原因创建失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :scrim="false" v-model="visible" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="d-flex justify-space-between align-center">
        <div class="text-h5 text-medium-emphasis ps-2">创建歌单</div>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
      </v-card-title>
      <v-card-text>
        <v-textarea
          label="歌单标题"
          :center-affix="false"
          v-model="desc"
          :counter="40"
          rows="2"
          variant="outlined"
        ></v-textarea>

        <v-checkbox-btn
          class="mb-4"
          v-model="privacy"
          label="隐私歌单"
          color="primary"
        ></v-checkbox-btn>

        <v-btn
          :loading="loading"
          class="text-none"
          color="primary"
          text="创建"
          variant="flat"
          @click="create"
        ></v-btn>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style lang="less"></style>
