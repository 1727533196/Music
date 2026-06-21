<script setup lang="ts">
defineProps<{ agreed: boolean }>()
const emit = defineEmits<{ 'update:agreed': [value: boolean] }>()
</script>

<template>
  <div class="step-panel step-panel--license">
    <div class="panel-header">
      <h2 class="panel-title">许可协议</h2>
      <p class="panel-sub">请阅读并同意以下条款，方可继续安装。</p>
    </div>
    <div class="content-card content-card--flex">
      <div class="license-box">
        <h3>MIT 开源许可证</h3>
        <p>版权所有 © 2024 YSH。保留所有权利。</p>
        <p>特此授予任何获得本软件及相关文档文件（"软件"）副本的人员免费许可，允许其不受限制地处理本软件，包括但不限于使用、复制、修改、合并、发布、分发、再许可和/或销售软件副本的权利，以及允许向其提供软件的人员这样做，但须符合以下条件：</p>
        <p>上述版权声明和本许可声明应包含在软件的所有副本或实质性部分中。</p>
        <p>本软件"按原样"提供，不附有任何明示或暗示的担保，包括但不限于对适销性、特定用途适用性和非侵权性的担保。在任何情况下，作者或版权持有人均不对任何索赔、损害或其他责任负责，无论是在合同诉讼、侵权行为还是其他方面，无论是由软件或软件的使用或其他交易引起的、产生的或与之相关的。</p>
        <h3>隐私政策</h3>
        <p>本应用程序会连接网易云音乐官方 API 以提供音乐播放功能。我们不会收集或存储你的个人数据到服务器。你的登录凭证仅存储在本地设备中。</p>
        <h3>免责声明</h3>
        <p>本软件为非官方第三方客户端，与网易云音乐官方无任何关联。请确保你拥有相关内容的合法访问权限。</p>
      </div>
      <label class="agree-row">
        <span
          class="checkbox-custom"
          :class="{ checked: agreed }"
          @click="emit('update:agreed', !agreed)"
        >
          <svg v-if="agreed" viewBox="0 0 24 24">
            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
        </span>
        <span>我已阅读并同意上述许可协议和隐私政策</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.step-panel {
  flex: 1;
  overflow-y: auto;
  padding: 32px 36px 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  display: flex;
  flex-direction: column;
}
.step-panel--license {
  display: flex;
  flex-direction: column;
}
.panel-header {
  margin-bottom: 24px;
  .panel-title {
    font-size: 21px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.92);
    margin: 0 0 5px;
    letter-spacing: -0.3px;
  }
  .panel-sub {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.38);
    margin: 0;
    line-height: 1.6;
  }
}
.content-card {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 20px 22px;
}
.content-card--flex {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.license-box {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: none;
  border-radius: 0;
  padding: 4px 0;
  background: transparent;
  margin-bottom: 18px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  h3 {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.72);
    margin: 0 0 7px;
    margin-top: 14px;
    &:first-child {
      margin-top: 0;
    }
  }
  p {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.38);
    line-height: 1.8;
    margin: 0 0 10px;
  }
}
.agree-row {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  flex-shrink: 0;
}
.checkbox-custom {
  width: 19px;
  height: 19px;
  border-radius: 5px;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
  cursor: pointer;
  svg {
    width: 12px;
    height: 12px;
    fill: #4ade80;
  }
  &.checked {
    background: rgba(74, 222, 128, 0.15);
    border-color: rgba(74, 222, 128, 0.5);
  }
}
</style>
