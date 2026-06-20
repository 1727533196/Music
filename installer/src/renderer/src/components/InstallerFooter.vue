<script setup lang="ts">
defineProps<{
  currentStep: number
  installing: boolean
  installFailed: boolean
  canNext: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
  'go-back': []
  'start-install': []
  launch: []
}>()
</script>

<template>
  <div class="installer-footer">
    <!-- 步骤 1-3：上一步 -->
    <button v-if="currentStep > 0 && currentStep < 4" class="btn btn-ghost" @click="emit('prev')">
      ← 上一步
    </button>

    <!-- 步骤 4（安装中/失败）：返回修改 -->
    <button
      v-if="currentStep === 4"
      class="btn btn-ghost"
      :class="{ disabled: installing }"
      :disabled="installing"
      @click="emit('go-back')"
    >
      <svg viewBox="0 0 24 24">
        <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
      </svg>
      返回修改
    </button>

    <div class="spacer" />

    <!-- 步骤 0-3：下一步 -->
    <button
      v-if="currentStep < 4"
      class="btn btn-primary"
      :class="{ disabled: !canNext }"
      @click="emit('next')"
    >
      {{ currentStep === 3 ? '开始安装' : '下一步 →' }}
    </button>

    <!-- 步骤 4（安装中/失败）：重新安装 -->
    <button
      v-else-if="currentStep === 4"
      class="btn btn-primary"
      :class="{ loading: installing }"
      :disabled="installing"
      @click="emit('start-install')"
    >
      <svg v-if="installing" class="btn-spinner" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round" />
      </svg>
      <svg v-else viewBox="0 0 24 24">
        <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
      </svg>
      {{ installing ? '安装中…' : '重新安装' }}
    </button>

    <!-- 步骤 5：启动 -->
    <button v-else-if="currentStep === 5" class="btn btn-finish" @click="emit('launch')">
      <svg viewBox="0 0 24 24"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
      立即启动
    </button>
  </div>
</template>

<style scoped>
.installer-footer {
  display: flex;
  align-items: center;
  padding: 14px 40px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  gap: 10px;
  flex-shrink: 0;
  .spacer { flex: 1; }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 24px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    outline: none;
    white-space: nowrap;
    svg { width: 15px; height: 15px; flex-shrink: 0; }
    &.btn-ghost {
      background: transparent;
      color: rgba(255, 255, 255, 0.42);
      border: 1px solid rgba(255, 255, 255, 0.12);
      &:hover {
        color: rgba(255, 255, 255, 0.85);
        border-color: rgba(255, 255, 255, 0.22);
        background: rgba(255, 255, 255, 0.06);
      }
    }
    &.btn-primary {
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: #fff;
      border: 1px solid rgba(99, 102, 241, 0.3);
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
      svg { fill: #fff; }
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(99, 102, 241, 0.48);
      }
      &:active { transform: translateY(0); }
      &.disabled {
        opacity: 0.35;
        cursor: not-allowed;
        transform: none !important;
      }
      &.loading {
        opacity: 0.85;
        cursor: not-allowed;
        transform: none !important;
        pointer-events: none;
      }
    }
    &.btn-finish {
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.25), rgba(34, 197, 94, 0.38));
      color: #4ade80;
      border: 1px solid rgba(74, 222, 128, 0.32);
      box-shadow: 0 4px 14px rgba(74, 222, 128, 0.18);
      padding: 10px 30px;
      font-size: 13.5px;
      svg { fill: #4ade80; }
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 22px rgba(74, 222, 128, 0.28);
      }
    }
  }
}
@keyframes btnSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.btn-spinner {
  width: 15px !important;
  height: 15px !important;
  animation: btnSpin 0.8s linear infinite;
  flex-shrink: 0;
}
</style>
