import request from "../utils/request";
import {getUserAccountRes} from "@/api/user";

interface PhoneLoginRes extends getUserAccountRes {
  token: string
  cookie: string
}

interface LoginQrCheckRes {
  code: 800 | 801 | 802 | 803 | number,
  cookie: string,
  message: '授权中' | '等待扫码' | '授权登陆成功' | '二维码不存在或已过期' | string
  avatarUrl?: string
  nickname?: string
}

// 发送验证码
export const captchaLogin = (phone: string) =>
  request<{phone: string}, {code: number, data: boolean}>(`/captcha/sent`, {phone})

// 登录
export const phoneLogin = (phone: string, captcha:string) =>
    request<{phone: string, captcha: string}, PhoneLoginRes>(`/login/cellphone`, {phone, captcha})

// 二维码key接口生成
export const loginQrKey = () => request<null, {code: number, data:{code: number, unikey: string}}>
('/login/qr/key', 'get')

// 二维码生成接口
export const loginQrCreate = (key: string, qrimg?: boolean) =>
  request<{key: string, qrimg?: boolean}, {code: number, data:{qrimg: string, qrurl: string}}>
  ('/login/qr/create', {key, qrimg}, 'get')

// 二维码检测扫码状态接口
export const loginQrCheck = (key: string) =>
  request<{key: string}, LoginQrCheckRes>(`/login/qr/check?key=${key}&noCookie=true`, 'get')

// 获取登录状态
export const loginStatus = (cookie: string) => request('/login/status', {cookie})

// 游客登陆
export const anonimousLogin = () => request('/register/anonimous')