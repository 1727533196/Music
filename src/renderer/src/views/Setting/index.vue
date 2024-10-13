<script setup lang="ts">
import { reactive, useTemplateRef } from 'vue'
import { useSettings } from '@/store/settings'
import type { FormInstance, FormRules } from 'element-plus'
import { checkUrlValidity } from '@/utils'

const settings = useSettings()

const form = reactive({
  url: settings.state.baseUrl,
  lyricBg: settings.state.lyricBg
})
const ruleFormRef = useTemplateRef<FormInstance>('ruleFormRef')

const validateUrl = (rule: any, value: any, callback: any) => {
  if (value === '') {
    return callback(new Error('地址不能为空'))
  }
  const validation = checkUrlValidity(value)
  if (!validation.isValid) {
    return callback(new Error(validation.message))
  }
  callback()
}
const rules = reactive<FormRules<typeof form>>({
  url: [{ validator: validateUrl, trigger: 'blur' }]
})

const onSubmit = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  formEl.validate((valid) => {
    if (valid) {
      settings.setState({
        baseUrl: form.url,
        lyricBg: form.lyricBg
      })
    } else {
      console.log('error submit!')
    }
  })
}
</script>

<template>
  <div class="padding-container">
    <el-form label-width="auto" ref="ruleFormRef" :rules="rules" :model="form">
      <el-form-item label="设置网络域" prop="url">
        <el-input v-model="form.url" />
      </el-form-item>
      <el-form-item label="背景模式" prop="url">
        <el-segmented v-model="form.lyricBg" :options="['rhythm', 'rgb']" />
      </el-form-item>
      <el-form-item>
        <el-button @click="onSubmit(ruleFormRef)">确认</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style lang="less" scoped></style>
