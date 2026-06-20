import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

// ─── 步骤定义 ──────────────────────────────────────────────────────────────────
export const steps = [
  { id: 'welcome', label: '欢迎' },
  { id: 'license', label: '许可协议' },
  { id: 'path', label: '安装位置' },
  { id: 'options', label: '安装选项' },
  { id: 'install', label: '安装中' },
  { id: 'finish', label: '完成' }
]

// ─── 选项定义 ──────────────────────────────────────────────────────────────────
export const optionDefs: Record<
  string,
  { label: string; desc: string; icon: string }
> = {
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

export function useInstaller() {
  // ─── 状态 ──────────────────────────────────────────────────────────────────────
  const currentStep = ref(0)
  const licenseAgreed = ref(false)
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

  // 日志区 DOM ref — 由 App.vue 通过模板 ref 注入
  const logEl = ref<HTMLElement | null>(null)
  const serverWarningEl = ref<HTMLElement | null>(null)

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

  // ─── 监 听 ──────────────────────────────────────────────────────────────────────
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

  watch(
    () => options.installServer,
    async (newValue) => {
      if (!newValue) {
        await nextTick()
        if (serverWarningEl.value) {
          const scrollContainer = serverWarningEl.value.closest('.step-panel') as HTMLElement
          if (scrollContainer && serverWarningEl.value) {
            const containerRect = scrollContainer.getBoundingClientRect()
            const warningRect = serverWarningEl.value.getBoundingClientRect()
            const scrollTop =
              scrollContainer.scrollTop + (warningRect.top - containerRect.top) - 20
            scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' })
          }
        }
      }
    }
  )

  // ─── 计算属性 ──────────────────────────────────────────────────────────────────
  const progressStroke = computed(() => {
    const p = installProgress.value
    if (installFailed.value) return '#f87171'
    if (p < 40) return `hsl(${240 + p * 1.5}, 80%, 65%)`
    if (p < 80) return `hsl(${180 + p * 0.5}, 80%, 60%)`
    return '#4ade80'
  })

  const canNext = computed(() => {
    if (currentStep.value === 1 && !licenseAgreed.value) return false
    if (currentStep.value === 4 && installing.value) return false
    return true
  })

  const diskAvailableGB = computed(() =>
    diskInfo.available > 0 ? (diskInfo.available / 1024 / 1024 / 1024).toFixed(1) + ' GB' : '—'
  )

  const diskLabel = computed(() => {
    if (isWindows) {
      return installPath.value.length >= 2
        ? installPath.value.substring(0, 2).toUpperCase()
        : 'C:'
    }
    return 'Macintosh HD'
  })

  const diskRequiredMB = computed(() => {
    const mb = diskInfo.required / 1024 / 1024
    return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb.toFixed(0) + ' MB'
  })

  const diskBarPcts = computed(() => {
    if (!diskInfo.total) return { used: 60, newPkg: 1, free: 39 }
    const usedBytes = diskInfo.total - diskInfo.available
    const usedPct = (usedBytes / diskInfo.total) * 100
    const newPct = (diskInfo.required / diskInfo.total) * 100
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

  // ─── 导航逻辑 ─────────────────────────────────────────────────────────────────
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

  // ─── 路径规范化 ────────────────────────────────────────────────────────────────
  function normalizeInstallPath(path: string): string {
    const appName = '音乐'
    const trimmed = path.replace(/[\\/]+$/, '')
    const lastPart = trimmed.split(/[\\/]/).pop() || ''
    if (lastPart !== appName) {
      return trimmed + (trimmed.includes('\\') || trimmed.includes('/') ? '\\' : '/') + appName
    }
    return trimmed
  }

  async function browseDir() {
    const chosen = await window.installer.chooseDir()
    if (chosen) {
      installPath.value = chosen
      loadDiskInfo()
    }
  }

  async function loadDiskInfo() {
    installPath.value = normalizeInstallPath(installPath.value)
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

  // ─── 执 行 安 装 ──────────────────────────────────────────────────────────────
  let removeProgressListener: (() => void) | null = null

  async function startInstall() {
    currentStep.value = 4
    installing.value = true
    installDone.value = false
    installFailed.value = false
    installProgress.value = 0
    installLog.value = []

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

  // ─── 反馈问题 ──────────────────────────────────────────────────────────────────
  function openFeedback(errorMsg: string, errorLog: string[]) {
    const title = encodeURIComponent(`安装失败：${errorMsg.substring(0, 80)}`)
    const body = encodeURIComponent(
      [
        '## 安装失败报告',
        '',
        '### 错误信息',
        '```',
        errorMsg,
        '```',
        '',
        '### 安装日志',
        '```',
        errorLog.join('\n').substring(errorLog.join('\n').length - 2000),
        '```',
        '',
        '### 环境信息',
        `- 平台：${isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'}`,
        `- 安装路径：${installPath.value}`,
      ].join('\n')
    )
    window.installer.openUrl(
      `https://github.com/1727533196/Music/issues/new?title=${title}&body=${body}`
    )
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

  // ─── 生命周期 ─────────────────────────────────────────────────────────────────
  onMounted(async () => {
    try {
      const defaultDir = await window.installer.getDefaultDir()
      if (defaultDir) installPath.value = defaultDir
    } catch {
      if (!installPath.value) {
        installPath.value = isWindows ? 'C:\\Program Files\\音乐' : '/Applications'
      }
    }
    loadDiskInfo()
  })

  onUnmounted(() => {
    removeProgressListener?.()
  })

  // ─── 对外暴露 ─────────────────────────────────────────────────────────────────
  return {
    // 常量
    steps,
    optionDefs,
    // 状态
    currentStep,
    licenseAgreed,
    isMac,
    isWindows,
    installPath,
    installing,
    installDone,
    installFailed,
    installError,
    installProgress,
    installLog,
    installedAppPath,
    isMaximize,
    diskInfo,
    diskLoading,
    options,
    // refs
    logEl,
    serverWarningEl,
    // 计算属性
    progressStroke,
    canNext,
    diskAvailableGB,
    diskLabel,
    diskRequiredMB,
    diskBarPcts,
    diskUsedPct,
    diskNewPct,
    // 方法
    goToStep,
    next,
    prev,
    browseDir,
    loadDiskInfo,
    normalizeInstallPath,
    startInstall,
    launchAndClose,
    openFeedback,
    // 窗口控制
    minimize,
    maximize,
    unmaximize,
    maximizeOrUnmaximize,
    close
  }
}
