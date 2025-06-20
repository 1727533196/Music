<script lang="ts" setup>
import { ref, onUnmounted } from 'vue'
import { loginQrCheck, loginQrCreate, loginQrKey } from '@/api/login'
import { ElMessage } from 'element-plus'
import { getUserAccountFn } from '@/utils/userInfo'

const dialogVisible = ref(false)
const key = ref('')
const qrUrl = ref('')
const flag = ref(false) // 是否授权中
const isSucceed = ref(false)
let timer: NodeJS.Timer
const mode = ref<'qr' | 'phone'>('qr')
const passVisible = ref(true)

const init = async () => {
  const {
    data: { unikey }
  } = await loginQrKey()
  key.value = unikey
  const {
    data: { qrimg }
  } = await loginQrCreate(key.value, true)
  qrUrl.value = qrimg

  timer = setInterval(async () => {
    // 800二维码不存在或已过期 801等待扫码  802授权中 803授权登陆成功
    const { code, message, cookie } = await loginQrCheck(key.value)
    if (code === 800) {
      clearInterval(timer)
      init()
    } else if (code === 802) {
      flag.value = true
    } else if (code === 803) {
      clearInterval(timer)
      isSucceed.value = true
      localStorage.setItem(`MUSIC_U`, cookie)
      ElMessage.success('授权登陆成功')
      dialogVisible.value = false
      getUserAccountFn()
    }
  }, 3000)
  return timer
}

onUnmounted(() => {
  clearInterval(timer)
})

const show = () => {
  init()
  dialogVisible.value = true
}

const close = (val) => {
  clearInterval(timer)
}

const setMode = (val: 'qr' | 'phone') => {
  mode.value = val
}

defineExpose({
  dialogVisible,
  show
})
</script>

<template>
  <v-dialog scrim="rgba(0,0,0,1)" @update:model-value="close" v-model="dialogVisible" width="auto">
    <v-card v-if="mode === 'qr'" title="扫码登录">
      <div class="login-container">
        <img v-if="!flag" :src="qrUrl" alt="" id="qr-img" />
        <h1 v-else>{{ isSucceed ? '授权登陆成功' : '授权中...' }}</h1>

        <div class="desc">使用网易云音乐APP扫码登录</div>

<!--        <v-card-text class="text-center">-->
<!--          <a-->
<!--            class="text-blue text-decoration-none"-->
<!--            rel="noopener noreferrer"-->
<!--            style="cursor: pointer"-->
<!--            @click="setMode('phone')"-->
<!--          >-->
<!--            选用手机号登录<v-icon icon="mdi-chevron-right"></v-icon>-->
<!--          </a>-->
<!--        </v-card-text>-->
      </div>
      <template v-slot:actions>
        <v-btn
          class="ms-auto"
          variant="tonal"
          text="关闭"
          @click="
            () => {
              dialogVisible = false
              close(dialogVisible)
            }
          "
        />
      </template>
    </v-card>
    <v-card
      width="400"
      v-else
      class="mx-auto pa-12 pb-8"
      elevation="8"
      max-width="448"
      rounded="lg"
    >
      <div class="text-subtitle-1 text-medium-emphasis">手机号</div>

      <v-text-field
        density="compact"
        placeholder="请输入手机号"
        prepend-inner-icon="mdi-phone-outline"
        variant="outlined"
      ></v-text-field>

      <div class="text-subtitle-1 text-medium-emphasis d-flex align-center justify-space-between">
        密码

        <!--        <a-->
        <!--          class="text-caption text-decoration-none text-blue"-->
        <!--          href="#"-->
        <!--          rel="noopener noreferrer"-->
        <!--          target="_blank"-->
        <!--        >-->
        <!--          Forgot login password?</a-->
        <!--        >-->
      </div>

      <v-text-field
        :append-inner-icon="passVisible ? 'mdi-eye-off' : 'mdi-eye'"
        :type="passVisible ? 'password' : 'text'"
        density="compact"
        placeholder="请输入密码"
        prepend-inner-icon="mdi-lock-outline"
        variant="outlined"
        @click:append-inner="passVisible = !passVisible"
      ></v-text-field>
      <div style="margin-bottom: 10px">
        <a
          style="cursor: pointer"
          class="text-caption text-decoration-none text-blue"
          rel="noopener noreferrer"
        >
          验证码登录</a
        >
      </div>

      <v-card class="mb-12" color="surface-variant" variant="tonal">
        <v-card-text class="text-medium-emphasis text-caption">
          可以选用手机号密码登录或验证码
        </v-card-text>
      </v-card>

      <v-btn class="mb-8" color="blue" size="large" variant="tonal" block> 登录 </v-btn>

      <v-card-text class="text-center">
        <a
          class="text-blue text-decoration-none"
          rel="noopener noreferrer"
          style="cursor: pointer"
          @click="setMode('qr')"
        >
          扫码登录<v-icon icon="mdi-chevron-right"></v-icon>
        </a>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style lang="less">
.el-dialog.login {
  backdrop-filter: blur(60px) saturate(210%);
  background-color: rgba(40, 40, 40, 0.7);

  .el-dialog__title {
    color: @text;
  }
  .el-dialog__body {
    display: flex;
    justify-content: center;
  }
}
</style>
<style scoped lang="less">
.login-container {
  //display: flex;
  //flex-wrap: wrap;
  //align-items: center;
  //justify-content: center;
  width: 400px;
  display: grid;
  row-gap: 10px;
  grid-template-columns: repeat(1, auto);
  place-items: center;

  .desc {
    font-size: 12px;
  }
}
</style>
