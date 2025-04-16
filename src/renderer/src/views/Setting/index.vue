<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useSettings } from '@/store/settings.ts'
import { checkUrlValidity, isElectron } from '@/utils'
import Versions from '@/components/Versions.vue'
import { ElMessage } from 'element-plus'
import { useUserInfo } from '@/store'

const settings = useSettings()
const store = useUserInfo()
const snackbar = ref(false)
const urlVerify = ref({
  message: '',
  isValid: true
})
let form = reactive({
  url: settings.state.baseUrl,
  font: settings.state.font
})
const validateUrl = (value: string) => {
  let result = {
    message: '',
    isValid: true
  }
  if (value === '') {
    result = {
      message: '地址不能为空',
      isValid: false
    }
    result.message = '地址不能为空'
    result.isValid = false
  }
  result = checkUrlValidity(value)
  urlVerify.value = result

  return result.isValid || result.message
}

const setBaseUrl = () => {
  snackbar.value = true
  settings.setState({
    baseUrl: form.url
  })
  ElMessage.success({
    message: '修改网络域成功'
  })
}
const test = () => {}
const updateBg = (value) => {
  settings.setState({
    lyricBg: value
  })
}
const updateBold = (value) => {
  settings.setState({
    bold: value
  })
  if (value) {
    document.body.classList.add('bold')
  } else {
    document.body.classList.remove('bold')
  }
}
const setFont = () => {
  settings.setState({
    font: form.font
  })
  const appEl = document.querySelector('#app') as HTMLDivElement
  if (appEl) {
    appEl.style.fontFamily = form.font
    ElMessage.success({
      message: '字体设置成功'
    })
  }
}

const recoverDefaultSettings = () => {
  settings.$reset()
}

const quitLogin = () => {
  localStorage.clear()
  location.reload()
}
</script>

<template>
  <div class="padding-container">
    <div>
      <v-btn-toggle
        density="compact"
        @update:modelValue="updateBg"
        v-model="settings.state.lyricBg"
      >
        <v-btn class="small" size="default" value="rhythm">模糊背景</v-btn>
        <v-btn size="default" value="rgb">纯色模式</v-btn>
      </v-btn-toggle>
      <v-tooltip>
        <template v-slot:activator="{ props }">
          <v-btn
            class="ma-2"
            size="small"
            variant="text"
            icon="mdi-help-circle-outline"
            v-bind="props"
          >
          </v-btn>
        </template>
        <div>
          <h3>设置歌词页背</h3>
          <p>模糊背景：通过图片拼接的方式在四角旋转来呈现动态背景方式</p>
          <p>纯色模式：通过取图片的两种主色调来呈现的背景颜色，对于网络环境和电脑性能支持更好</p>
        </div>
      </v-tooltip>
    </div>
    <v-text-field
      v-model="form.url"
      width="600"
      density="compact"
      :persistent-clear="!urlVerify.isValid"
      clearable
      hide-details="auto"
      single-line
      variant="solo-filled"
      prepend-inner-icon="mdi-network-pos"
      :rules="[validateUrl]"
      :placeholder="settings.state.baseUrl"
    >
      <template #append-inner>
        <v-btn
          :disabled="!urlVerify.isValid"
          @click="setBaseUrl"
          base-color="rgba(76, 175, 80, 0.8)"
          >确认</v-btn
        >
      </template>
      <template #append>
        <v-tooltip>
          <template v-slot:activator="{ props }">
            <v-btn size="small" variant="text" icon="mdi-help-circle-outline" v-bind="props">
            </v-btn>
          </template>
          <div>
            <p>用来动态设置网络域,例如服务器ip地址可能会有变动</p>
            <p>注意：如果第一次没有连接上服务器，则需要重新启动应用加载</p>
          </div>
        </v-tooltip>
      </template>
    </v-text-field>
    <v-text-field
      v-model="form.font"
      width="600"
      density="compact"
      clearable
      hide-details="auto"
      single-line
      variant="solo-filled"
      prepend-inner-icon="mdi-format-font"
      placeholder="设置全局字体"
    >
      <template #append-inner>
        <v-btn :disabled="!urlVerify.isValid" @click="setFont" base-color="rgba(76, 175, 80, 0.8)"
          >确认</v-btn
        >
      </template>
      <template #append>
        <v-tooltip>
          <template v-slot:activator="{ props }">
            <v-btn size="small" variant="text" icon="mdi-help-circle-outline" v-bind="props">
            </v-btn>
          </template>
          <div>
            <p>设置全局字体</p>
          </div>
        </v-tooltip>
      </template>
    </v-text-field>
    <v-switch
      @update:modelValue="updateBold"
      v-model="settings.state.bold"
      label="全局字体加粗"
    ></v-switch>
    <v-btn style="width: 110px" @click="recoverDefaultSettings" base-color="rgba(255,255,255,0.1)"
      >恢复默认设置</v-btn
    >
    <v-btn v-if="store.isLogin" style="width: 110px; margin-top: 20px" @click="quitLogin"
      >退出登录</v-btn
    >
    <!--    <v-snackbar color="rgba(76, 175, 80, 0.8)" location="top" v-model="snackbar">-->
    <!--      <div style="color: white">修改成功</div>-->
    <!--    </v-snackbar>-->
    <Versions v-if="isElectron()"></Versions>
  </div>
</template>

<style lang="less" scoped>
.padding-container {
  display: grid;
  gap: 10px;
}
</style>
