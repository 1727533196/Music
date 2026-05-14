<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
// import FluidCanvas from './components/FluidCanvas.vue'

// ─── 步骤定义 ──────────────────────────────────────────────────────────────────
const steps = [
  { id: 'welcome', label: '欢迎' },
  { id: 'license', label: '许可协议' },
  { id: 'path', label: '安装位置' },
  { id: 'options', label: '安装选项' },
  { id: 'install', label: '安装中' },
  { id: 'finish', label: '完成' }
]

// ─── 状态 ──────────────────────────────────────────────────────────────────────
const currentStep = ref(0)
const licenseAgreed = ref(false)
// 根据平台初始化默认安装路径
const isMac = window.installer.platform === 'darwin'
const isWindows = window.installer.platform === 'win32'
const installPath = ref(isMac ? '/Applications' : '')
const installing = ref(false)
const installDone = ref(false)
const installFailed = ref(false)
const installError = ref('')
const installProgress = ref(0)
const installLog = ref<string[]>([])
const installedAppPath = ref('')
const isMaximize = ref(false)

// 日志区 DOM ref
const logEl = ref<HTMLElement | null>(null)
// 服务器警告框 DOM ref
const serverWarningEl = ref<HTMLElement | null>(null)

// 每次日志更新，自动滚动到底部
watch(
  installLog,
  async () => {
    await nextTick()
    if (logEl.value) {
      logEl.value.scrollTop = logEl.value.scrollHeight
    }
  },
  { deep: true }
)

// 磁盘信息
const diskInfo = reactive({ available: 0, total: 0, required: 200 * 1024 * 1024 })
const diskLoading = ref(false)

// 安装选项
const options = reactive({
  createShortcut: true,
  autoStart: false,
  associateFiles: true,
  sendUsageData: false,
  installServer: true
})

// 当服务器警告框显示/隐藏时，自动滚动到可视区域
watch(
  () => options.installServer,
  async (newValue) => {
    if (!newValue) {
      // 取消勾选时，等待警告框渲染后滚动到可视区域
      await nextTick()
      if (serverWarningEl.value) {
        // 找到可滚动的父容器 .step-panel
        const scrollContainer = serverWarningEl.value.closest('.step-panel') as HTMLElement
        if (scrollContainer && serverWarningEl.value) {
          // 计算警告框相对于滚动容器的位置
          const containerRect = scrollContainer.getBoundingClientRect()
          const warningRect = serverWarningEl.value.getBoundingClientRect()

          // 计算需要滚动的位置（让警告框出现在可视区顶部）
          const scrollTop = scrollContainer.scrollTop + (warningRect.top - containerRect.top) - 20

          // 平滑滚动到目标位置
          scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' })
        }
      }
    }
  }
)

const optionDefs: Record<keyof typeof options, { label: string; desc: string; icon: string }> = {
  createShortcut: {
    label: '创建桌面快捷方式',
    desc: '在桌面上创建应用程序图标，方便快速启动。',
    icon: 'M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19H5V5H12V3H5M17.78,4C17.61,4 17.43,4.07 17.3,4.2L16.08,5.41L18.58,7.91L19.8,6.7C20.06,6.44 20.06,6 19.8,5.75L18.25,4.2C18.12,4.07 17.95,4 17.78,4M15.37,6.12L8,13.5V16H10.5L17.87,8.62L15.37,6.12Z'
  },
  autoStart: {
    label: '开机自动启动',
    desc: '系统启动时自动运行音乐播放器。',
    icon: 'M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z'
  },
  associateFiles: {
    label: '关联音频文件',
    desc: '将 MP3、FLAC、AAC 等格式与本应用关联，双击自动打开。',
    icon: 'M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z'
  },
  sendUsageData: {
    label: '发送使用数据',
    desc: '帮助改进产品体验（不含个人隐私信息）。',
    icon: 'M13,2.05V4.05C17.39,4.59 20.5,8.58 19.96,12.97C19.5,16.61 16.64,19.5 13,19.93V21.93C18.5,21.38 22.5,16.5 21.95,11C21.5,6.25 17.73,2.5 13,2.05M5.67,19.74C7.18,21 9.04,21.79 11,21.93V19.93C9.58,19.76 8.23,19.21 7.1,18.37L5.67,19.74M7.1,5.74C8.22,4.84 9.57,4.26 11,4.06V2.06C9.05,2.25 7.19,3 5.67,4.26L7.1,5.74M5.69,7.1L4.26,5.67C3,7.19 2.25,9.04 2.05,11H4.05C4.24,9.58 4.8,8.23 5.69,7.1M4.06,13H2.06C2.26,14.96 3.03,16.81 4.27,18.33L5.69,16.9C4.81,15.77 4.24,14.42 4.06,13Z'
  },
  installServer: {
    label: '安装本地音乐服务器',
    desc: '内置网易云 API 服务，安装后立即启动并随系统自动开机运行。取消勾选需手动启动服务器，否则无法播放音乐、搜索歌曲或使用在线功能。',
    icon: 'M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M9,5H10V3H9V5M9,13H10V11H9V13M9,21H10V19H9V21M5,3V5H8V3H5M5,11V13H8V11H5M5,19V21H8V19H5Z'
  }
}

// ─── 进度条颜色 ────────────────────────────────────────────────────────────────
const progressStroke = computed(() => {
  const p = installProgress.value
  if (installFailed.value) return '#f87171'
  if (p < 40) return `hsl(${240 + p * 1.5}, 80%, 65%)`
  if (p < 80) return `hsl(${180 + p * 0.5}, 80%, 60%)`
  return '#4ade80'
})

// ─── 导航逻辑 ─────────────────────────────────────────────────────────────────
const canNext = computed(() => {
  if (currentStep.value === 1 && !licenseAgreed.value) return false
  if (currentStep.value === 4 && installing.value) return false
  return true
})

function goToStep(i: number) {
  if (i < currentStep.value && !installing.value) currentStep.value = i
}

function next() {
  if (!canNext.value) return
  if (currentStep.value === 3) {
    startInstall()
  } else if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prev() {
  if (currentStep.value > 0 && !installing.value) currentStep.value--
}

// ─── 选择安装目录 ─────────────────────────────────────────────────────────────
async function browseDir() {
  const chosen = await window.installer.chooseDir()
  if (chosen) {
    installPath.value = chosen
    loadDiskInfo()
  }
}

async function loadDiskInfo() {
  diskLoading.value = true
  try {
    const info = await window.installer.getDiskInfo(installPath.value)
    diskInfo.available = info.available
    diskInfo.total = info.total
    diskInfo.required = info.required
  } finally {
    diskLoading.value = false
  }
}

const diskAvailableGB = computed(() =>
  diskInfo.available > 0 ? (diskInfo.available / 1024 / 1024 / 1024).toFixed(1) + ' GB' : '—'
)
// 磁盘标签：Windows 显示盘符，macOS 显示 Macintosh HD
const diskLabel = computed(() => {
  if (isWindows) {
    // 取路径前两位作为盘符，如 C:
    return installPath.value.length >= 2 ? installPath.value.substring(0, 2).toUpperCase() : 'C:'
  }
  return 'Macintosh HD'
})
const diskRequiredMB = computed(() => {
  const mb = diskInfo.required / 1024 / 1024
  return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb.toFixed(0) + ' MB'
})
// 三段进度条：used + new + free = 100%，用小数保留精度避免溢出
const diskBarPcts = computed(() => {
  if (!diskInfo.total) return { used: 60, newPkg: 1, free: 39 }
  const usedBytes = diskInfo.total - diskInfo.available
  const usedPct = (usedBytes / diskInfo.total) * 100
  const newPct = (diskInfo.required / diskInfo.total) * 100
  // 保证 new 至少 0.5% 可见，同时三段之和不超过 100
  const newClamped = Math.max(0.5, newPct)
  const usedClamped = Math.min(usedPct, 100 - newClamped)
  const freePct = Math.max(0, 100 - usedClamped - newClamped)
  return {
    used: +usedClamped.toFixed(2),
    newPkg: +newClamped.toFixed(2),
    free: +freePct.toFixed(2)
  }
})
const diskUsedPct = computed(() => diskBarPcts.value.used)
const diskNewPct = computed(() => diskBarPcts.value.newPkg)

// ─── 执行安装 ─────────────────────────────────────────────────────────────────
let removeProgressListener: (() => void) | null = null

async function startInstall() {
  currentStep.value = 4
  installing.value = true
  installDone.value = false
  installFailed.value = false
  installProgress.value = 0
  installLog.value = []

  // 监听进度
  removeProgressListener = window.installer.onProgress(({ step, progress }) => {
    installLog.value.push(step)
    installProgress.value = progress
  })

  const result = await window.installer.runInstall({
    installDir: installPath.value,
    createShortcut: options.createShortcut,
    autoStart: options.autoStart,
    associateFiles: options.associateFiles,
    installServer: options.installServer
  })

  installing.value = false

  // 安装结束，清理进度监听器
  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }

  if (result.success) {
    installedAppPath.value = result.appPath ?? ''
    installDone.value = true
    setTimeout(() => {
      currentStep.value = 5
    }, 800)
  } else {
    installFailed.value = true
    installError.value = result.error ?? '未知错误'
    installLog.value.push('❌ 安装失败：' + installError.value)
  }
}

async function launchAndClose() {
  if (installedAppPath.value) {
    await window.installer.launchApp(installedAppPath.value)
  } else {
    window.installer.close()
  }
}

// ─── 窗口控制 ──────────────────────────────────────────────────────────────────
const minimize = () => window.installer.minimize()
const maximize = () => {
  window.installer.maximize()
  isMaximize.value = true
}
const unmaximize = () => {
  window.installer.unmaximize()
  isMaximize.value = false
}
const maximizeOrUnmaximize = () => {
  isMaximize.value ? unmaximize() : maximize()
}
const close = () => window.installer.close()

// ─── 生命周期 ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  // 从主进程获取真实的默认安装路径（Windows 会返回 AppData/Local/音乐）
  try {
    const defaultDir = await window.installer.getDefaultDir()
    if (defaultDir) installPath.value = defaultDir
  } catch {
    // 旧版安装包不支持此接口时使用前端硬编码兜底
    if (!installPath.value) {
      installPath.value = isWindows ? 'C:\\Program Files\\音乐' : '/Applications'
    }
  }
  loadDiskInfo()
})
onUnmounted(() => {
  removeProgressListener?.()
})
</script>

<template>
  <div class="installer-root">
    <!-- 纯色背景通过 CSS 实现 -->

    <!-- 主窗口卡片 -->
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
      <nav class="installer-nav">
        <div class="nav-logo">
          <img src="./assets/logo.png" class="logo-img" alt="logo" />
          <div class="logo-info">
            <span class="logo-text">音乐</span>
            <span class="logo-sub">Music Player</span>
          </div>
        </div>

        <div class="nav-steps">
          <div
            v-for="(step, i) in steps"
            :key="step.id"
            :class="[
              'nav-step',
              {
                active: i === currentStep,
                done: i < currentStep,
                clickable: i < currentStep && !installing
              }
            ]"
            @click="goToStep(i)"
          >
            <div class="step-dot">
              <svg v-if="i < currentStep" viewBox="0 0 24 24" class="step-check">
                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
              </svg>
              <span v-else class="step-num">{{ i + 1 }}</span>
            </div>
            <span class="step-label">{{ step.label }}</span>
            <div v-if="i < steps.length - 1" class="step-line" :class="{ done: i < currentStep }" />
          </div>
        </div>

        <div class="nav-footer">
          <span class="nav-version">v 1.0.0</span>
        </div>
      </nav>

      <!-- 右侧内容区 -->
      <main class="installer-content">
        <Transition name="slide" mode="out-in">
          <!-- ★ Step 0: 欢迎 -->
          <div v-if="currentStep === 0" key="welcome" class="step-panel step-panel--welcome">
            <div class="panel-header">
              <h2 class="panel-title">欢迎安装 <em class="panel-title-em">音乐</em></h2>
              <p class="panel-sub">一款优雅的桌面音乐播放器，支持网易云音乐账号登录。</p>
            </div>
            <div class="content-card">
              <!-- 上方：图标 + 简介横排 -->
              <div class="welcome-hero">
                <div class="hero-icon-wrap">
                  <svg viewBox="0 0 24 24" class="hero-icon">
                    <path
                      d="M12,3V12.26C11.5,12.09 11,12 10.5,12C8,12 6,14 6,16.5C6,19 8,21 10.5,21C13,21 15,19 15,16.5V6H19V3H12Z"
                    />
                  </svg>
                  <div class="hero-ring" />
                  <div class="hero-ring ring2" />
                </div>
                <div class="welcome-hero-text">
                  <p class="welcome-desc">全平台桌面音乐播放器，运行流畅、界面简洁</p>
                  <div class="welcome-chips">
                    <span class="chip">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"
                        />
                      </svg>
                      高清音质
                    </span>
                    <span class="chip">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z"
                        />
                      </svg>
                      歌词同步
                    </span>
                    <span class="chip">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6Z"
                        />
                      </svg>
                      开源免费
                    </span>
                  </div>
                </div>
              </div>
              <!-- 分隔线 -->
              <div class="welcome-divider" />
              <!-- 下方：2x2 特性网格 -->
              <div class="welcome-grid">
                <div class="feature-item">
                  <div class="feature-icon">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="feature-name">高清无损音质</div>
                    <div class="feature-desc">支持 FLAC、APE、WAV 等无损格式</div>
                  </div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="feature-name">歌词实时同步</div>
                    <div class="feature-desc">逐字高亮显示，沉浸式听歌体验</div>
                  </div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M8.46,14.45L6.35,16.56L5,15.21L7.1,13.1C6.4,11.84 6.4,10.3 7.1,9.03L5,6.93L6.35,5.57L8.46,7.68C9.73,6.97 11.27,6.97 12.54,7.68L14.65,5.57L16,6.93L13.9,9.03C14.6,10.3 14.6,11.84 13.9,13.1L16,15.21L14.65,16.56L12.54,14.45C11.27,15.16 9.73,15.16 8.46,14.45Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="feature-name">个性化推荐</div>
                    <div class="feature-desc">基于你的喜好，智能推送每日歌单</div>
                  </div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M9,5H10V3H9V5M9,13H10V11H9V13M9,21H10V19H9V21M5,3V5H8V3H5M5,11V13H8V11H5M5,19V21H8V19H5Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div class="feature-name">本地 API 服务器</div>
                    <div class="feature-desc">内置网易云 API，后台运行稳定可靠</div>
                  </div>
                </div>
              </div>
            </div>
            <!-- end content-card -->
          </div>

          <!-- ★ Step 1: 许可协议 -->
          <div v-else-if="currentStep === 1" key="license" class="step-panel step-panel--license">
            <div class="panel-header">
              <h2 class="panel-title">许可协议</h2>
              <p class="panel-sub">请阅读并同意以下条款，方可继续安装。</p>
            </div>
            <div class="content-card content-card--flex">
              <div class="license-box">
                <h3>MIT 开源许可证</h3>
                <p>版权所有 © 2024 YSH。保留所有权利。</p>
                <p>
                  特此授予任何获得本软件及相关文档文件（"软件"）副本的人员免费许可，允许其不受限制地处理本软件，包括但不限于使用、复制、修改、合并、发布、分发、再许可和/或销售软件副本的权利，以及允许向其提供软件的人员这样做，但须符合以下条件：
                </p>
                <p>上述版权声明和本许可声明应包含在软件的所有副本或实质性部分中。</p>
                <p>
                  本软件"按原样"提供，不附有任何明示或暗示的担保，包括但不限于对适销性、特定用途适用性和非侵权性的担保。在任何情况下，作者或版权持有人均不对任何索赔、损害或其他责任负责，无论是在合同诉讼、侵权行为还是其他方面，无论是由软件或软件的使用或其他交易引起的、产生的或与之相关的。
                </p>
                <h3>隐私政策</h3>
                <p>
                  本应用程序会连接网易云音乐官方 API
                  以提供音乐播放功能。我们不会收集或存储你的个人数据到服务器。你的登录凭证仅存储在本地设备中。
                </p>
                <h3>免责声明</h3>
                <p>
                  本软件为非官方第三方客户端，与网易云音乐官方无任何关联。请确保你拥有相关内容的合法访问权限。
                </p>
              </div>
              <label class="agree-row">
                <span
                  class="checkbox-custom"
                  :class="{ checked: licenseAgreed }"
                  @click="licenseAgreed = !licenseAgreed"
                >
                  <svg v-if="licenseAgreed" viewBox="0 0 24 24">
                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                  </svg>
                </span>
                <span>我已阅读并同意上述许可协议和隐私政策</span>
              </label>
            </div>
            <!-- end content-card -->
          </div>

          <!-- ★ Step 2: 安装位置 -->
          <div v-else-if="currentStep === 2" key="path" class="step-panel step-panel--path">
            <div class="panel-header">
              <h2 class="panel-title">安装位置</h2>
              <p class="panel-sub">选择应用程序的安装目录。</p>
            </div>
            <div class="content-card content-card--flex">
              <div class="path-section">
                <div class="path-row">
                  <svg viewBox="0 0 24 24" class="path-icon">
                    <path
                      d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"
                    />
                  </svg>
                  <input
                    class="path-input"
                    v-model="installPath"
                    type="text"
                    @blur="loadDiskInfo"
                  />
                  <button class="browse-btn" @click="browseDir">浏览…</button>
                </div>

                <div class="disk-block">
                  <div class="disk-top">
                    <span>{{ diskLabel }}</span>
                    <span>{{ diskAvailableGB }} 可用</span>
                  </div>
                  <div class="disk-bar">
                    <div class="disk-used" />
                    <div class="disk-new" />
                  </div>
                  <div class="disk-legend">
                    <span><i class="dot used" />已使用</span>
                    <span><i class="dot new" />本次安装</span>
                    <span><i class="dot free" />可用</span>
                  </div>
                </div>

                <div class="space-cards">
                  <div class="space-card">
                    <span class="sc-label">需要空间</span>
                    <span class="sc-val">{{ diskRequiredMB }}</span>
                  </div>
                  <div class="space-card">
                    <span class="sc-label">可用空间</span>
                    <span class="sc-val ok">{{ diskAvailableGB }}</span>
                  </div>
                </div>
              </div>
              <!-- end path-section -->
            </div>
            <!-- end content-card -->
          </div>

          <!-- ★ Step 3: 安装选项 -->
          <div v-else-if="currentStep === 3" key="options" class="step-panel">
            <div class="panel-header">
              <h2 class="panel-title">安装选项</h2>
              <p class="panel-sub">根据需要自定义安装选项。</p>
            </div>
            <div class="content-card">
              <div class="options-list">
                <div
                  v-for="(item, key) in optionDefs"
                  :key="key"
                  class="option-row"
                  :class="{ 'option-row--highlight': key === 'installServer' }"
                  @click="
                    (options as Record<string, boolean>)[key] = !(
                      options as Record<string, boolean>
                    )[key]
                  "
                >
                  <div class="option-left">
                    <svg viewBox="0 0 24 24" class="opt-icon"><path :d="item.icon" /></svg>
                    <div>
                      <div class="opt-title">
                        {{ item.label }}
                        <span v-if="key === 'installServer'" class="opt-badge">推荐</span>
                      </div>
                      <div class="opt-desc">{{ item.desc }}</div>
                    </div>
                  </div>
                  <div class="toggle" :class="{ on: (options as Record<string, boolean>)[key] }">
                    <div class="toggle-thumb" />
                  </div>
                </div>
              </div>

              <!-- 服务器未安装的警告提示 -->
              <div v-if="!options.installServer" ref="serverWarningEl" class="server-warning">
                <svg viewBox="0 0 24 24" class="warning-icon">
                  <path
                    d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
                  />
                </svg>
                <div class="warning-text">
                  <strong>注意：</strong
                  >未安装本地服务器将无法使用在线功能（播放、搜索、歌单等）。如需使用，请手动启动
                  NeteaseCloudMusicApi 服务。
                </div>
              </div>
            </div>
            <!-- end content-card -->
          </div>

          <!-- ★ Step 4: 安装进度 -->
          <div v-else-if="currentStep === 4" key="install" class="step-panel step-panel--install">
            <div class="panel-header">
              <h2 class="panel-title" :class="{ 'title-failed': installFailed }">
                {{ installing ? '正在安装...' : installFailed ? '安装失败' : '安装完成' }}
              </h2>
              <p class="panel-sub">
                {{
                  installing
                    ? '请稍候，安装程序正在处理必要文件。'
                    : installFailed
                      ? '请检查错误日志并重试。'
                      : '所有文件已成功写入。'
                }}
              </p>
            </div>
            <div class="content-card content-card--flex">
              <div class="install-body">
                <!-- 左侧：进度环 + 失败操作区 -->
                <div class="install-left">
                  <div class="ring-wrap">
                    <svg class="ring-svg" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" class="ring-bg" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        class="ring-fill"
                        :style="{
                          strokeDashoffset: 326.7 * (1 - installProgress / 100),
                          stroke: progressStroke
                        }"
                      />
                    </svg>
                    <div class="ring-center">
                      <span class="ring-pct">{{ installProgress }}<small>%</small></span>
                    </div>
                  </div>
                </div>
                <!-- 右侧：日志区 -->
                <div class="install-log-wrap">
                  <div class="log-title">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                      />
                    </svg>
                    安装日志
                  </div>
                  <div class="install-log" ref="logEl">
                    <TransitionGroup name="log-item" tag="div">
                      <div
                        v-for="(line, i) in installLog"
                        :key="i"
                        class="log-line"
                        :class="{
                          last: i === installLog.length - 1,
                          failed: installFailed && i === installLog.length - 1
                        }"
                      >
                        <svg viewBox="0 0 24 24" class="log-dot">
                          <path
                            d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z"
                          />
                        </svg>
                        {{ line }}
                      </div>
                    </TransitionGroup>
                  </div>
                </div>
              </div>
            </div>
            <!-- end content-card -->
          </div>

          <!-- ★ Step 5: 完成 -->
          <div v-else-if="currentStep === 5" key="finish" class="step-panel step-panel--finish">
            <div class="content-card">
              <div class="finish-layout">
                <div class="finish-icon-wrap">
                  <svg viewBox="0 0 24 24" class="finish-icon">
                    <path
                      d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8L10,17Z"
                    />
                  </svg>
                  <div class="sparkle s1" />
                  <div class="sparkle s2" />
                  <div class="sparkle s3" />
                  <div class="sparkle s4" />
                </div>
                <div class="finish-text">
                  <h1 class="finish-title">安装成功！</h1>
                  <p class="finish-desc">音乐已成功安装到你的电脑，立即开始探索音乐世界吧。</p>
                  <div class="finish-path">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"
                      />
                    </svg>
                    <code>{{ installedAppPath || installPath }}</code>
                  </div>
                </div>
              </div>
            </div>
            <!-- end content-card -->
          </div>
        </Transition>

        <!-- 底部按钮 -->
        <div class="installer-footer">
          <!-- 步骤 1-3 普通：上一步 -->
          <button v-if="currentStep > 0 && currentStep < 4" class="btn btn-ghost" @click="prev">
            ← 上一步
          </button>

          <!-- 步骤 4（安装中/失败）：返回修改（始终显示） -->
          <button
            v-if="currentStep === 4"
            class="btn btn-ghost"
            :class="{ disabled: installing }"
            :disabled="installing"
            @click="!installing && ((currentStep = 3), (installFailed = false))"
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
            @click="next"
          >
            {{ currentStep === 3 ? '开始安装' : '下一步 →' }}
          </button>

          <!-- 步骤 4（安装中/失败）：重新安装（始终显示，安装中变 loading） -->
          <button
            v-else-if="currentStep === 4"
            class="btn btn-primary"
            :class="{ loading: installing }"
            :disabled="installing"
            @click="!installing && startInstall()"
          >
            <svg v-if="installing" class="btn-spinner" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-dasharray="31.4"
                stroke-dashoffset="10"
                stroke-linecap="round"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24">
              <path
                d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"
              />
            </svg>
            {{ installing ? '安装中…' : '重新安装' }}
          </button>

          <!-- 步骤 5：启动 -->
          <button v-else-if="currentStep === 5" class="btn btn-finish" @click="launchAndClose">
            <svg viewBox="0 0 24 24"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
            立即启动
          </button>
        </div>
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
}

/* 标题栏拖动区 */
.titlebar-drag {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 38px;
  -webkit-app-region: drag;
  z-index: 9999;
  pointer-events: none;
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

/* ── 左侧导航 ── */
.installer-nav {
  width: 196px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 46px 16px 20px;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background: #1c1c26;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 28px;
  padding: 12px 14px;
  border-radius: 10px;
  background: transparent;
  border: none;
  .logo-img {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    flex-shrink: 0;
    object-fit: cover;
  }
  .logo-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .logo-text {
    font-size: 15px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 0.3px;
    line-height: 1.2;
  }
  .logo-sub {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    letter-spacing: 0.5px;
    font-weight: 400;
  }
}
.nav-steps {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-step {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  padding: 8px 10px;
  border-radius: 9px;
  transition: background 0.2s;
  &.clickable {
    cursor: pointer;
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}
.step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  transition: all 0.3s;
  .step-num {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.28);
  }
  .step-check {
    width: 11px;
    height: 11px;
    fill: #4ade80;
  }
}
.nav-step.active {
  background: rgba(99, 102, 241, 0.14);
  .step-dot {
    border-color: rgba(99, 102, 241, 0.9);
    background: rgba(99, 102, 241, 0.22);
    box-shadow: 0 0 8px rgba(99, 102, 241, 0.35);
    .step-num {
      color: #a5b4fc;
      font-weight: 700;
    }
  }
}
.nav-step.done .step-dot {
  border-color: rgba(74, 222, 128, 0.5);
  background: rgba(74, 222, 128, 0.1);
}
.step-label {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
  transition: color 0.2s;
  white-space: nowrap;
  line-height: 1;
}
.nav-step.active .step-label {
  color: #a5b4fc;
  font-weight: 600;
}
.nav-step.done .step-label {
  color: rgba(255, 255, 255, 0.5);
}
.step-line {
  display: none;
}
.nav-footer {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  .nav-version {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.16);
    letter-spacing: 0.8px;
  }
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
.step-panel {
  flex: 1;
  overflow-y: auto;
  padding: 32px 36px 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  display: flex;
  flex-direction: column;
}
/* 欢迎/完成页铺满 */
.step-panel--welcome,
.step-panel--finish {
  justify-content: center;
}

/* ── 内容卡片 ── */
.content-card {
  //background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 20px 22px;
}
/* 需要 flex 伸展填满剩余空间的卡片 */
.content-card--flex {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
/* 安装进度卡片横向布局 */
.content-card--install {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ── 面板通用头部 ── */
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

/* ── 欢迎页 ── */
.panel-title-em {
  font-style: normal;
  color: #a5b4fc;
}
.welcome-hero {
  display: flex;
  align-items: center;
  gap: 18px;
}
.hero-icon-wrap {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  .hero-icon {
    position: absolute;
    inset: 11px;
    fill: #818cf8;
    filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.6));
    animation: heroFloat 3s ease-in-out infinite;
  }
  .hero-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid rgba(99, 102, 241, 0.25);
    animation: ringPulse 2.5s ease-out infinite;
  }
  .ring2 {
    animation-delay: 1.2s;
  }
}
.welcome-hero-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.welcome-desc {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.38);
  line-height: 1.6;
  margin: 0;
}
.welcome-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  svg {
    width: 11px;
    height: 11px;
    fill: #818cf8;
    flex-shrink: 0;
  }
  transition: all 0.2s;
  &:hover {
    background: rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.35);
    color: #a5b4fc;
  }
}
.welcome-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 16px 0;
}
.welcome-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  background: transparent;
  transition: all 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
}
.feature-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.22);
  svg {
    width: 15px;
    height: 15px;
    fill: #818cf8;
  }
}
.feature-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 3px;
}
.feature-desc {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.32);
  line-height: 1.4;
}

/* ── 许可协议 ── */
.step-panel--license {
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

/* ── 安装路径 ── */
.step-panel--path {
  display: flex;
  flex-direction: column;
}
.path-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.path-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  flex-shrink: 0;
  .path-icon {
    width: 17px;
    height: 17px;
    fill: rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }
  .path-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12.5px;
    font-family: 'SF Mono', monospace;
  }
  .browse-btn {
    padding: 5px 13px;
    border-radius: 7px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.6);
    font-size: 11.5px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.9);
    }
  }
}
.disk-block {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px 0;
  border-radius: 0;
  border: none;
  background: transparent;
  .disk-top {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 14px;
  }
  .disk-bar {
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.07);
    overflow: hidden;
    display: flex;
    margin-bottom: 10px;
    .disk-used {
      flex: 0 0 v-bind('diskUsedPct + "%"');
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 4px 0 0 4px;
    }
    .disk-new {
      flex: 0 0 v-bind('diskNewPct + "%"');
      height: 100%;
      background: rgba(74, 222, 128, 0.7);
    }
  }
  .disk-legend {
    display: flex;
    gap: 14px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
    .dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
    }
    .dot.used {
      background: #8b5cf6;
    }
    .dot.new {
      background: rgba(74, 222, 128, 0.7);
    }
    .dot.free {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  }
}
.space-cards {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  .space-card {
    flex: 1;
    padding: 16px 0;
    border-radius: 0;
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 5px;
    .sc-label {
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.35);
      font-weight: 500;
    }
    .sc-val {
      font-size: 22px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.85);
      font-family: 'SF Mono', monospace;
      letter-spacing: -0.5px;
    }
    .sc-val.ok {
      color: #4ade80;
    }
  }
}

/* ── 安装选项 ── */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px;
  border-radius: 11px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .option-left {
    display: flex;
    align-items: center;
    gap: 13px;
  }
  .opt-icon {
    width: 19px;
    height: 19px;
    fill: rgba(129, 140, 248, 0.7);
    flex-shrink: 0;
  }
  .opt-title {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.78);
    margin-bottom: 2px;
  }
  .opt-desc {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.32);
    line-height: 1.5;
  }
}
/* 服务器选项高亮行 */
.option-row--highlight {
  background: transparent;
  border-color: transparent !important;
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: transparent !important;
  }
  .opt-icon {
    fill: #818cf8;
  }
}
/* 推荐标签 */
.opt-badge {
  display: inline-block;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.35);
  vertical-align: middle;
}
.toggle {
  width: 42px;
  height: 23px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
  &.on {
    background: #6366f1;
    border-color: #6366f1;
  }
  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.75);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }
  &.on .toggle-thumb {
    left: 21px;
    background: #fff;
  }
}

/* ── 服务器未安装警告 ── */
.server-warning {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.25);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  animation: warningFadeIn 0.3s ease;
  .warning-icon {
    width: 20px;
    height: 20px;
    fill: #fbbf24;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .warning-text {
    font-size: 12px;
    color: rgba(251, 191, 36, 0.9);
    line-height: 1.6;
    strong {
      font-weight: 600;
      color: #fbbf24;
    }
  }
}
@keyframes warningFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── 安装进度 ── */
.step-panel--install {
  display: flex;
  flex-direction: column;
}
.title-failed {
  color: #f87171 !important;
}
.install-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 20px;
}
.install-left {
  flex: 0 0 156px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding-top: 8px;
}
.ring-wrap {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
  .ring-svg {
    width: 140px;
    height: 140px;
    transform: rotate(-90deg);
  }
  .ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.07);
    stroke-width: 8;
  }
  .ring-fill {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
    stroke-dasharray: 326.7;
    stroke-dashoffset: 326.7;
    transition:
      stroke-dashoffset 0.4s ease,
      stroke 0.5s ease;
  }
  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    .ring-pct {
      font-size: 28px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.9);
      font-family: 'SF Mono', monospace;
      small {
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.38);
        margin-left: 1px;
      }
    }
  }
}
.install-log-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: none;
  border-radius: 0;
  background: transparent;
  overflow: hidden;
}
.log-title {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  svg {
    width: 13px;
    height: 13px;
    fill: rgba(255, 255, 255, 0.22);
    flex-shrink: 0;
  }
}
.install-log {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
  /* 让 TransitionGroup 渲染的 div 撑满宽度 */
  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
  }
  .log-line {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    padding: 5px 9px;
    border-radius: 7px;
    transition: all 0.25s;
    line-height: 1.5;
    width: 100%;
    box-sizing: border-box;
    word-break: break-all;
    &.last {
      color: rgba(255, 255, 255, 0.82);
      background: rgba(255, 255, 255, 0.05);
    }
    &.failed {
      color: #f87171;
      background: rgba(248, 113, 113, 0.08);
    }
    .log-dot {
      width: 6px;
      height: 6px;
      flex-shrink: 0;
      fill: rgba(255, 255, 255, 0.18);
      margin-top: 4px;
    }
    &.last .log-dot {
      fill: #4ade80;
    }
    &.failed .log-dot {
      fill: #f87171;
    }
  }
}
.retry-row {
  display: flex;
  flex-direction: column;
  gap: 9px;
  width: 100%;
}

/* ── 通用按钮 ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  white-space: nowrap;
  width: 100%;
  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
}
.btn-ghost {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  svg {
    fill: rgba(255, 255, 255, 0.5);
  }
  &:hover {
    background: rgba(255, 255, 255, 0.11);
    color: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.2) !important;
  }
}
.btn-primary {
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: 1px solid rgba(99, 102, 241, 0.3) !important;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  svg {
    fill: #fff;
  }
  &:hover {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    box-shadow: 0 6px 18px rgba(99, 102, 241, 0.48);
  }
}

/* ── 按钮 loading spinner ── */
@keyframes btnSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.btn-spinner {
  width: 15px !important;
  height: 15px !important;
  animation: btnSpin 0.8s linear infinite;
  flex-shrink: 0;
}

/* ── 完成页 ── */
.finish-layout {
  display: flex;
  align-items: center;
  gap: 40px;
  width: 100%;
}
.finish-icon-wrap {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  .finish-icon {
    position: absolute;
    inset: 9px;
    fill: #4ade80;
    filter: drop-shadow(0 0 16px rgba(74, 222, 128, 0.55));
    animation: successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .sparkle {
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4ade80;
    animation: sparkleOut 0.8s ease-out both;
  }
  .s1 {
    top: 3px;
    left: 50%;
    animation-delay: 0.1s;
  }
  .s2 {
    top: 50%;
    right: 3px;
    animation-delay: 0.2s;
  }
  .s3 {
    bottom: 3px;
    left: 50%;
    animation-delay: 0.15s;
  }
  .s4 {
    top: 50%;
    left: 3px;
    animation-delay: 0.25s;
  }
}
.finish-text {
  flex: 1;
  .finish-title {
    font-size: 28px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.92);
    margin: 0 0 10px;
    letter-spacing: -0.5px;
  }
  .finish-desc {
    font-size: 13.5px;
    color: rgba(255, 255, 255, 0.42);
    line-height: 1.7;
    margin: 0 0 18px;
  }
  .finish-path {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 9px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    svg {
      width: 13px;
      height: 13px;
      fill: rgba(255, 255, 255, 0.3);
      flex-shrink: 0;
    }
    code {
      font-family: 'SF Mono', monospace;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
    }
  }
}

/* ── 底部按钮 ── */
.installer-footer {
  display: flex;
  align-items: center;
  padding: 14px 40px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  gap: 10px;
  flex-shrink: 0;
  .spacer {
    flex: 1;
  }
  .btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 20px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    outline: none;
    svg {
      width: 15px;
      height: 15px;
    }
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
      svg {
        fill: #fff;
      }
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(99, 102, 241, 0.48);
      }
      &:active {
        transform: translateY(0);
      }
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
    &.btn-install {
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.18), rgba(34, 197, 94, 0.28));
      color: #4ade80;
      border: 1px solid rgba(74, 222, 128, 0.28);
      svg {
        fill: #4ade80;
      }
      &:hover {
        background: linear-gradient(135deg, rgba(74, 222, 128, 0.28), rgba(34, 197, 94, 0.38));
        transform: translateY(-1px);
      }
    }
    &.btn-finish {
      background: linear-gradient(135deg, rgba(74, 222, 128, 0.25), rgba(34, 197, 94, 0.38));
      color: #4ade80;
      border: 1px solid rgba(74, 222, 128, 0.32);
      box-shadow: 0 4px 14px rgba(74, 222, 128, 0.18);
      padding: 8px 26px;
      font-size: 13.5px;
      svg {
        fill: #4ade80;
      }
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 22px rgba(74, 222, 128, 0.28);
      }
    }
  }
}

/* ── checkbox ── */
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

/* ── 过渡 ── */
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
.log-item-enter-active {
  transition: all 0.22s ease;
}
.log-item-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

/* ── Keyframes ── */
@keyframes heroFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
@keyframes ringPulse {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
@keyframes successPop {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes sparkleOut {
  0% {
    transform: scale(1) translate(0, 0);
    opacity: 1;
  }
  100% {
    transform: scale(0) translate(var(--tx, 18px), var(--ty, -18px));
    opacity: 0;
  }
}
</style>
