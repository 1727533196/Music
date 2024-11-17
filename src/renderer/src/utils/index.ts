// 根据毫秒数格式化出分钟及其秒数 msec: 275573 = 04:35
export function formattingTime(msec: number, isMsec = true) {
  let result = ''
  const s = isMsec ? msec / 1000 : msec
  const sec = Math.floor(s % 60)
  const minute = Math.floor((s - sec) / 60)

  result = `${
    minute.toString().length <= 1 ? '0' + minute : minute
  }:${sec.toString().length <= 1 ? '0' + sec : sec}`

  return result
}

export type Yrc = {
  time: number
  duration: number
  line: number
  yrc: Array<{
    text: string
    transition: number
    cursor: number
    width: number | string
  }>
}

// 随机产生指定范围数
export function randomNum(minNum: number, maxNum: number, decimals = false) {
  if (decimals) {
    return Math.random() * (maxNum - minNum) + minNum
  }
  return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum)
}

/*
* 首先Array(1,2,3,4)，你知道的吧,生成一个数组[1,2,3,4]
  然后是apply的问题,要求第二个参数是一个数组
  那么Array.apply(null,[1,2,3,4])生成的和上述的一样的[1,2,3,4]数组
  但apply有个奇怪的地方,当第二个参数是一个带有length属性的对象时,会当成一个数组使用
  所以Array.apply(null,{length:4})生成[undefined,undefined,undefined,undefined]
  相当于Array.apply(null,[undefined,undefined,undefined,undefined])

  +'1' 可以使string转为number
* */
// 格式化时间戳 YY-MM-DD hh:mm:ss = 2016-06-19 10:05:44    'YY-MM-DD hh:mm:ss' | 'YY-MM-DD'
export function formatDate(timestamp: number, format: string = 'YY-MM-DD hh:mm:ss') {
  const date = new Date(timestamp)
  const year = date.getFullYear(),
    month = date.getMonth() + 1, // 月份是从0开始的
    day = date.getDate(),
    hour = date.getHours(),
    min = date.getMinutes(),
    sec = date.getSeconds()
  const preArr = Array.apply(null, Array(10)).map((item, index) => {
    return '0' + index
  })
  const result = format
    .replace(/YY/g, '' + year)
    .replace(/MM/g, preArr[month] || '' + month)
    .replace(/DD/g, preArr[day] || '' + day)
    .replace(/hh/g, preArr[hour] || '' + hour)
    .replace(/mm/g, preArr[min] || '' + min)
    .replace(/ss/g, preArr[sec] || '' + sec)
  return result
}

// 获取当前月份的第几天
export function varDayim() {
  return new Date().getDate()
}

// 嵌套取值
export function lookup(obj: object, key: string | undefined): any {
  if (!key) {
    return ''
  }
  if (!key.includes('.')) {
    return obj[key as keyof typeof obj]
  }
  let temp = obj
  key.split('.').forEach((item) => {
    if (!temp) {
      return {}
    }
    temp = temp[item as keyof typeof obj]
  })
  return temp
}

// 切换图片过渡 (防止图片闪烁
export function toggleImg(src: string, size?: string): Promise<HTMLImageElement> {
  if (!src) {
    return Promise.reject(`toggleImg：传递的src为空: ${src}`)
  }
  const img = new Image()
  img.src = size ? src + `?param=${size}` : src
  img.crossOrigin = 'Anonymous'
  img.width = document.body.clientWidth
  img.height = document.body.clientHeight

  return new Promise((resolve) => {
    img.onload = () => {
      resolve(img)
    }
    img.onerror = () => {
      // 在实际应用中，您可能还想处理加载失败的情况
      console.error(`Failed to load image: ${src}`)
    }
  })
}

// 计算出合适的间隙
export function suitableSpace(el: Element, itemEl: Element, count: number): number {
  const totalWidth = el.clientWidth
  const itemWidth = itemEl.clientWidth * count
  const width = totalWidth - itemWidth
  const suitableMargin = width / (count - 1)

  return suitableMargin - 1
}

// 是否处于今天
export function calculateIsToday(timestamp: number): boolean {
  // 把今天的日期时分秒设置为00:00:00, 返回一个时间戳
  const todayDate = new Date().setHours(0, 0, 0, 0)
  const paramsDate = new Date(timestamp).setHours(0, 0, 0, 0)

  return todayDate === paramsDate
}

// 解析路径参数
export function parsePathQuery(path: string) {
  const result = {
    path: path,
    query: {} as { [key: string]: any }
  }
  const index = path.indexOf('?')
  if (index === -1) {
    return result
  }
  result.path = path.slice(0, index)
  const queryArr = path.slice(index + 1).split('&')
  queryArr.forEach((item) => {
    const index = item.indexOf('=')
    const key = item.slice(0, index)
    const value = item.slice(index + 1)
    result.query[key] = value
  })
  return result
}

// 根据时间执行总时长    !!!! 请注意，当done为true时，必须调用pause来中断函数执行
export function animation(
  time: number,
  cb: (elapsed: number, done: boolean) => void
): (isPause: boolean) => void {
  let start: number | undefined
  let intervalId: number | undefined
  let elapsed = 0
  let paused = false

  function step() {
    if (!paused) {
      elapsed = Date.now() - (start ?? Date.now())
      const done = elapsed >= time
      if (done) {
        cb(time, true)
        clearInterval(intervalId)
      } else {
        cb(elapsed, false)
      }
    }
  }

  start = Date.now()
  intervalId = setInterval(step, 0) // 模拟 requestAnimationFrame 的频率

  return (isPause: boolean) => {
    if (isPause) {
      paused = true
    } else {
      if (paused) {
        paused = false
        start = Date.now() - elapsed // 重置开始时间
      }
    }
  }
}

export function rgbToHsl(r: number, g: number, b: number) {
  ;(r /= 255), (g /= 255), (b /= 255)
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h,
    s,
    l = (max + min) / 2

  if (max == min) {
    h = s = 0 // achromatic
  } else {
    let d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [h, s, l]
}

export function isGoodColor(r: number, g: number, b: number) {
  let hsl = rgbToHsl(r, g, b)
  let h = hsl[0],
    s = hsl[1],
    l = hsl[2]
  // 过滤掉过亮或过暗，过饱和或过淡的颜色
  if (l < 0.2 || l > 0.8 || s < 0.2 || s > 0.8) {
    return false
  }
  return true
}
export function findBestColors(colors: Array<Array<string>>, num: number): Array<Array<string>> {
  let goodColors = colors.filter((color) => isGoodColor(...color))
  if (goodColors.length < num) {
    let badColors = colors.filter((color) => !isGoodColor(...color))
    goodColors = [...goodColors, ...badColors.slice(0, num - goodColors.length)]
  }

  let bestColors = []
  for (let i = 0; i < num; i++) {
    let bestColor
    let maxDifference = 0
    for (let j = 0; j < goodColors.length; j++) {
      let color = goodColors[j]
      let minDifference = bestColors.reduce((min, bestColor) => {
        let hsl1 = rgbToHsl(...bestColor)
        let hsl2 = rgbToHsl(...color)
        let difference = Math.abs(hsl1[1] - hsl2[1]) + Math.abs(hsl1[2] - hsl2[2])
        return Math.min(min, difference)
      }, Infinity)
      if (minDifference > maxDifference) {
        maxDifference = minDifference
        bestColor = color
      }
    }
    bestColors.push(bestColor)
    let index = goodColors.indexOf(bestColor)
    goodColors.splice(index, 1)
  }

  return bestColors
}

// 获取屏幕刷新率
export const getScreenFps = (() => {
  // 先做一下兼容性处理
  const nextFrame = [
    window.requestAnimationFrame,
    window.webkitRequestAnimationFrame,
    window.mozRequestAnimationFrame
  ].find((fn) => fn)
  if (!nextFrame) {
    console.error('requestAnimationFrame is not supported!')
    return
  }
  return (targetCount = 50) => {
    // 判断参数是否合规
    if (targetCount < 1) throw new Error('targetCount cannot be less than 1.')
    const beginDate = Date.now()
    let count = 0
    return new Promise((resolve) => {
      ;(function log() {
        nextFrame(() => {
          if (++count >= targetCount) {
            const diffDate = Date.now() - beginDate
            const fps = (count / diffDate) * 1000
            return resolve(fps)
          }
          log()
        })
      })()
    })
  }
})()

export const isElectron = () => {
  // darwin: macOS 操作系统
  // linux: Linux 操作系统
  // win32: Windows 操作系统（即使在 64 位系统上也是返回这个值）
  return ['linux', 'win32'].includes(window.electron?.process.platform || '')
}

export const isString = (value: any): value is string => {
  return typeof value === 'string'
}

/*
* // 测试
console.log(formatNumberToMillion(8359838)); // 输出 "835.9万"
console.log(formatNumberToMillion(123456));   // 输出 "12.3万"
console.log(formatNumberToMillion(9876543));  // 输出 "987.7万"
console.log(formatNumberToMillion(5000));     // 输出 "5000"
* */
export function formatNumberToMillion(number: number) {
  if (number >= 100000000) {
    // 如果数字大于等于 1 亿
    const billionNumber = Math.floor(number / 10000000) / 10 // 强制截取一位小数
    return `${billionNumber}亿`
  } else if (number >= 10000) {
    // 如果数字大于等于 1 万
    const millionNumber = Math.floor(number / 1000) / 10 // 强制截取一位小数
    return `${millionNumber}万`
  } else {
    return number.toString() // 数字小于 1 万，不需要处理
  }
}

export const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timerId: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: any[]) {
    if (timerId) {
      clearTimeout(timerId)
    }

    timerId = setTimeout(() => {
      func.apply(this, args)
      timerId = null
    }, delay)
  }
}

type UrlValidationResult = {
  isValid: boolean
  message: string
}
export function checkUrlValidity(url: string): UrlValidationResult {
  // 使用正则表达式来检查 URL 的基本格式
  const baseUrlRegex = /^(https?:\/\/)?([a-zA-Z0-9.-]+)(:\d+)?(\/.*)?$/

  // 检查 URL 是否匹配基本格式
  const match = url.match(baseUrlRegex)
  if (!match) {
    return { isValid: false, message: 'URL 格式不正确' }
  }

  // 提取协议（http 或 https）、主机名和端口信息
  const protocol = match[1]
  const hostname = match[2]
  const port = match[3]

  // 校验协议（确保协议是 http 或 https）
  if (protocol && protocol !== 'http://' && protocol !== 'https://') {
    return { isValid: false, message: '协议必须是 http 或 https' }
  }

  // 判断是否为有效的 IP 地址
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipRegex.test(hostname)) {
    const parts = hostname.split('.').map(Number)
    const validIp = parts.every((part) => part >= 0 && part <= 255)
    if (!validIp) {
      return { isValid: false, message: 'IP 地址部分无效，每段数字必须在 0-255 之间' }
    }
  } else {
    // 判断是否为有效的域名
    const domainRegex = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(hostname)) {
      return { isValid: false, message: '域名格式无效' }
    }
  }

  // 校验端口号（如果存在）
  if (port) {
    const portNumber = Number(port.slice(1)) // 去掉前面的 ":" 进行解析
    if (portNumber < 1 || portNumber > 65535) {
      return { isValid: false, message: '端口号必须在 1 到 65535 之间' }
    }
  }

  // 如果一切校验通过，URL 是合法的
  return { isValid: true, message: '' }
}
