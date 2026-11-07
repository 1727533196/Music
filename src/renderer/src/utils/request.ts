import axios, { AxiosRequestConfig, Method } from 'axios'
import { message } from '@/utils/message'
import { useSettings } from '@/store/settings'
import { setActivePinia } from 'pinia'
import pinia from '@/store/sotre'
import { AccessRestrictionError, getAccessRestriction } from './accessRestriction'

type RequestConfig = AxiosRequestConfig & {
  handleAccessRestriction?: boolean
  silentError?: boolean
}

setActivePinia(pinia)

const settings = useSettings()

const http = axios.create({
  timeout: 30000,
  baseURL: settings.state.baseUrl
})

export function setBaseURL(url: string) {
  http.defaults.baseURL = url
}

const ignoreState = ['/login/qr/check']
function rejectRequest(
  data: unknown,
  config: RequestConfig | undefined,
  source: unknown = data,
  fallback = '请求失败，请稍后重试'
) {
  const restriction = config?.handleAccessRestriction && getAccessRestriction(source)
  if (restriction) return Promise.reject(new AccessRestrictionError(restriction, data))
  if (config?.silentError) return Promise.reject(data)
  const detail = data as { message?: string; msg?: string } | undefined
  message.error(detail?.message || detail?.msg || fallback)
  return Promise.reject(data)
}
http.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('token')
    if (!config.params) {
      config.params = {}
    }
    // const cookie = getCookie('MUSIC_U')
    const cookie = localStorage.getItem(`MUSIC_U`)
    if (cookie) {
      config.params.cookie = `MUSIC_U=${cookie};`
    }
    // POST 请求 url 必须添加时间戳,使每次请求 url 不一样,不然请求会被缓存
    /* 由于接口做了缓存处理 ( 缓存 2 分钟,不缓存数据极容易引起网易服务器高频 ip 错误 , 可在 app.js 设置 ,
   可能会导致登录后获取不到 cookie), 相同的 url 会在两分钟内只向网易服务器发一次请求 ,
   如果遇到不需要缓 存结果的接口 , 可在请求 url 后面加一个时间戳参数使 url 不同 */
    config.params.timestamp = Date.now()
    // token && (config.headers!.Authorization = token)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

http.interceptors.response.use(
  (response) => {
    const { status } = response
    const url = response.config.url?.split('?')[0]!
    // 此接口有的服务版本返回 { status, body: { code, ... } }。
    const data =
      url === '/playlist/tracks' && response.data?.body ? response.data.body : response.data
    const code = data?.code
    // 判断 status 和 code 是否为数字类型，只有是数字时才进行严格相等判断
    const isStatusError = typeof status === 'number' && status !== 200
    const isCodeError = typeof code === 'number' && code !== 200
    if (!ignoreState.includes(url) && (isStatusError || isCodeError)) {
      return rejectRequest(
        data,
        response.config,
        { response: { status, data } },
        `请求出现错误，当前状态码为${code || status}`
      )
    }
    return data
  },
  (error) => {
    const data = error.response?.data ?? error
    return rejectRequest(data, error.config, error, error.message)
  }
)

type Request = {
  <R extends unknown, D>(config: RequestConfig): Promise<D>
  <R extends unknown, D>(
    url: string,
    method?: Method,
    config?: RequestConfig | { data: R; params: R }
  ): Promise<D>
  <R extends unknown, D>(url: string, data: R, method?: Method): Promise<D>
  <R extends unknown, D>(url: string, data: R, config?: RequestConfig): Promise<D>
}
type Url<R> = RequestConfig | string
type Config<R> = (RequestConfig & { data: R; params: R }) | undefined | Method | RequestConfig
const request: Request = <R, D>(url: Url<R>, method?: unknown | Method, config?: Config<R>) => {
  if (typeof url !== 'string') {
    return http(url)
  } else if (method === undefined) {
    return request(url, 'post')
  } else if (typeof method === 'string') {
    return http({
      ...(<RequestConfig>config),
      url,
      method
    })
  } else if (typeof method === 'object' && config === undefined) {
    return http.post(url, method)
  } else if (typeof config === 'string') {
    return http({
      url,
      [config.toLowerCase() !== 'get' ? 'data' : 'params']: method,
      method: config
    })
  }
  return http(url)
}

export default request
