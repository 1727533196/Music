<script setup lang="ts">
import { getUserAccountFn } from '@/utils/userInfo'
import { ref } from 'vue'
import { codeLogin, sendCodePhone } from '@/utils/useLogin'
import ContextMenu from '@/components/ContextMenu/index.vue'

const phone = ref('')
const code = ref('')

// 添加右键菜单配置
const testMenuItems = [
  { label: '复制', value: 'copy' },
  { label: '粘贴', value: 'paste' },
  { label: '删除', value: 'delete' }
]

const handleTestMenuSelect = (item: { label: string; value: string }) => {
  switch (item.value) {
    case 'copy':
      console.log('复制')
      break
    case 'paste':
      console.log('粘贴')
      break
    case 'delete':
      console.log('删除')
      break
  }
}

const getUserAccountHandler = () => {
  getUserAccountFn()
}
const sendPhoneHandler = () => {
  sendCodePhone(phone.value)
}
const loginHandler = () => {
  codeLogin(phone.value, code.value).then((data) => {})
}
</script>

<template>
  <div style="display: flex; justify-content: center">
    <div class="test">
      <el-button @click="getUserAccountHandler">获取账号信息</el-button>
      <el-input placeholder="输入手机号" v-model="phone"></el-input>
      <el-input placeholder="输入验证码" v-model="code"></el-input>
      <el-button @click="sendPhoneHandler" type="primary">发送验证码</el-button>
      <el-button @click="loginHandler" type="primary">登录</el-button>
    </div>
    <ContextMenu 
      :items="testMenuItems"
      @select="handleTestMenuSelect"
    >
      <div>右键点击我</div>
    </ContextMenu>
  </div>
</template>

<style lang="less" scoped>
.test {
  > * + * {
    margin-top: 10px;
  }
}
</style>
