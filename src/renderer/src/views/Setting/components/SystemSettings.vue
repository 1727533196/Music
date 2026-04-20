<script setup lang="ts">
import { useUserInfo } from '@/store'
import { useSettings } from '@/store/settings'
import { ElMessage } from 'element-plus'
import SettingItem from './SettingItem.vue'

const settings = useSettings()
const store = useUserInfo()

const recoverDefaultSettings = () => {
  settings.$reset()
  ElMessage.success({
    message: '已恢复默认设置'
  })
}

const quitLogin = () => {
  localStorage.clear()
  location.reload()
}
</script>

<template>
  <div class="settings-section">
    <h2 class="section-title">
      <v-icon icon="mdi-cog" size="small" class="section-icon"></v-icon>
      系统设置
    </h2>

    <div class="setting-item">
      <SettingItem
        label="恢复默认设置"
        description="将所有设置重置为默认值"
      />
      <v-btn
        @click="recoverDefaultSettings"
        color="warning"
        variant="tonal"
        size="default"
      >
        <v-icon icon="mdi-refresh" start></v-icon>
        恢复默认
      </v-btn>
    </div>

    <div class="setting-item" v-if="store.isLogin">
      <SettingItem
        label="退出登录"
        description="清除本地登录信息"
      />
      <v-btn
        @click="quitLogin"
        color="error"
        variant="tonal"
        size="default"
      >
        <v-icon icon="mdi-logout" start></v-icon>
        退出登录
      </v-btn>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '../index.less';
</style>
