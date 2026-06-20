<script setup lang="ts">
import { watch, ref } from 'vue'
import { useInstaller } from './composables/useInstaller'
import InstallerNav from './components/InstallerNav.vue'
import StepWelcome from './components/StepWelcome.vue'
import StepLicense from './components/StepLicense.vue'
import StepPath from './components/StepPath.vue'
import StepOptions from './components/StepOptions.vue'
import StepInstall from './components/StepInstall.vue'
import StepFinish from './components/StepFinish.vue'
import InstallerFooter from './components/InstallerFooter.vue'

const {
  // 常量
  steps,
  optionDefs,
  // 状态
  currentStep,
  licenseAgreed,
  isMac,
  installPath,
  installing,
  installFailed,
  installError,
  installProgress,
  installLog,
  installedAppPath,
  isMaximize,
  options,
  // refs (需要从子组件注入)
  logEl,
  serverWarningEl,
  // 计算属性
  progressStroke,
  canNext,
  diskAvailableGB,
  diskLabel,
  diskRequiredMB,
  diskUsedPct,
  diskNewPct,
  // 方法
  goToStep,
  next,
  prev,
  browseDir,
  startInstall,
  launchAndClose,
  openFeedback,
  // 窗口控制
  minimize,
  maximizeOrUnmaximize,
  close,
} = useInstaller()

// 子组件 refs — 用于注入 DOM refs 回 composable
const stepInstallRef = ref<InstanceType<typeof StepInstall> | null>(null)
const stepOptionsRef = ref<InstanceType<typeof StepOptions> | null>(null)

// 同步子组件暴露的 DOM refs 到 composable
watch(
  () => stepInstallRef.value?.logEl,
  (el) => { logEl.value = el ?? null }
)
watch(
  () => stepOptionsRef.value?.serverWarningEl,
  (el) => { serverWarningEl.value = el ?? null }
)
</script>

<template>
  <div class="installer-root">
    <div class="installer-window">
      <!-- 自定义标题栏拖动区（无边框窗口） -->
      <div v-if="!isMac" class="titlebar-drag" />

      <!-- 窗口控制按钮（仅 Windows 显示） -->
      <div v-if="!isMac" class="window-controls">
        <div class="handler" @click="minimize">
          <i class="iconfont icon-weibiaoti-"></i>
        </div>
        <div class="handler" @click="maximizeOrUnmaximize">
          <i :class="['iconfont', isMaximize ? 'icon-3zuidahua-3' : 'icon-3zuidahua-1']"></i>
        </div>
        <div style="margin-right: 13px" class="handler" @click="close">
          <i class="iconfont icon-guanbi"></i>
        </div>
      </div>

      <!-- 左侧步骤导航 -->
      <InstallerNav
        :steps="steps"
        :current-step="currentStep"
        :installing="installing"
        @go-to-step="goToStep"
      />

      <!-- 右侧内容区 -->
      <main class="installer-content">
        <Transition name="slide" mode="out-in">
          <!-- Step 0: 欢迎 -->
          <StepWelcome v-if="currentStep === 0" key="welcome" />

          <!-- Step 1: 许可协议 -->
          <StepLicense
            v-else-if="currentStep === 1"
            key="license"
            :agreed="licenseAgreed"
            @update:agreed="licenseAgreed = $event"
          />

          <!-- Step 2: 安装位置 -->
          <StepPath
            v-else-if="currentStep === 2"
            key="path"
            :install-path="installPath"
            :disk-available-g-b="diskAvailableGB"
            :disk-label="diskLabel"
            :disk-required-m-b="diskRequiredMB"
            :disk-used-pct="diskUsedPct"
            :disk-new-pct="diskNewPct"
            @update:install-path="installPath = $event"
            @browse="browseDir"
          />

          <!-- Step 3: 安装选项 -->
          <StepOptions
            v-else-if="currentStep === 3"
            key="options"
            ref="stepOptionsRef"
            :options="options"
            :option-defs="optionDefs"
            :show-server-warning="!options.installServer"
            @update:options="Object.assign(options, $event)"
          />

          <!-- Step 4: 安装进度 -->
          <StepInstall
            v-else-if="currentStep === 4"
            key="install"
            ref="stepInstallRef"
            :installing="installing"
            :install-failed="installFailed"
            :install-error="installError"
            :install-progress="installProgress"
            :install-log="installLog"
            :progress-stroke="progressStroke"
            @feedback="(msg: string, log: string[]) => openFeedback(msg, log)"
          />

          <!-- Step 5: 完成 -->
          <StepFinish
            v-else-if="currentStep === 5"
            key="finish"
            :installed-app-path="installedAppPath"
            :install-path="installPath"
            @launch="launchAndClose"
          />
        </Transition>

        <!-- 底部按钮 -->
        <InstallerFooter
          :current-step="currentStep"
          :installing="installing"
          :install-failed="installFailed"
          :can-next="canNext"
          @prev="prev"
          @next="next"
          @go-back="currentStep = 3; installFailed = false"
          @start-install="startInstall"
          @launch="launchAndClose"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ── 根容器 ── */
.installer-root {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #131319;
  user-select: text;
  -webkit-user-select: text;
}
.titlebar-drag {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 38px;
  -webkit-app-region: drag;
  z-index: 9999;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}
.window-controls {
  position: absolute;
  top: 12px;
  right: 14px;
  display: flex;
  align-items: center;
  z-index: 10000;
  -webkit-app-region: no-drag;
  .handler {
    display: flex;
    margin-right: 20px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.6);
    &:hover {
      color: rgb(30, 204, 148);
    }
    .iconfont {
      font-size: 14px;
    }
    .icon-weibiaoti- {
      font-size: 25px;
    }
  }
}
/* ── 主窗口 ── */
.installer-window {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
  background: transparent;
  border: none;
  box-shadow: none;
}
/* ── 右侧内容 ── */
.installer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  background: #18181f;
}
/* ── 步骤过渡 ── */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
