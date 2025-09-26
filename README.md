# 音乐桌面应用

基于 Vue3 + TypeScript + Vite + Electron 构建的现代化音乐播放器桌面应用。

## ✨ 特性

- 🎵 支持网易云音乐播放功能
- 🎨 现代化 UI 设计
- 📱 支持二维码登录
- 🎤 逐字歌词显示
- 🖥️ 跨平台支持 (Windows/macOS/Linux)
- ⚡ 基于 Vite 的快速开发体验

## 📦 相关包

- **逐字歌词组件**: [@lrc-player/core](https://www.npmjs.com/package/@lrc-player/core)

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm/yarn

### 1. 安装网易云音乐 API 服务器

1. 下载 API 服务器包：
   ```
   解压：
   https://registry.npmjs.org/NeteaseCloudMusicApi/-/NeteaseCloudMusicApi-4.28.0.tgz
   ```

2. 解压并安装依赖：
   ```bash
   npm install
   # 或
   yarn install
   ```

3. 启动服务器：
   ```bash
   npm start
   # 或
   yarn start
   ```

### 2. 启动应用

1. 安装依赖：
   ```bash
   pnpm install
   ```

2. 启动开发服务器：
   ```bash
   pnpm dev
   ```
   > 默认请求端口号为3006, 可以在.env 文件中更改VITE_URL
3. 构建应用：
   ```bash
   # Windows
   pnpm build:win

   # macOS
   pnpm build:mac

   # Linux
   pnpm build:linux
   ```
### 可能会遇到的问题

#### 1. Electron uninstall
     尝试更改node版本， node 版本：20->18.20.1 。
     查看这个链接获取更多信息：https://github.com/alex8088/electron-vite/issues/129

### 3. 配置

在 `.env` 文件中配置 API 服务器地址：

```env
# 如果 API 服务器运行在 3000 端口
VITE_APP_WEB_URL=http://localhost:3000
```

### 4. 登录

支持两种登录方式（优先二维码登录）：

1. **二维码登录**：使用网易云音乐 APP 扫码
2. **手机号登录**：验证码登录（备用方案）


### 环境变量

Vite 提供开发模式和生产模式：

```typescript
// 在组件中使用
console.log(import.meta.env.VITE_URL)
```

### HTTP 请求器

项目提供了四种请求调用方式（配置型默认为 GET，其他默认为 POST）：

```typescript
// 1. 配置型请求
<R, D>(config: AxiosRequestConfig & {data: R, params: R}): Promise<D>

// 2. URL + 方法 + 配置
<R, D>(url: string, method?: Method, config?: AxiosRequestConfig & {data: R, params: R}): Promise<D>

// 3. URL + 数据 + 方法
<R, D>(url: string, data: R, method?: Method): Promise<D>

// 4. URL + 数据 + 配置
<R, D>(url: string, data: R, config?: AxiosRequestConfig): Promise<D>
```

### 音频播放器

重写了 `audio` 的 `play` 和 `pause` 方法，提供音量过渡效果：

- 开始播放的过渡时间比暂停稍长，提供更好的听觉体验

### 全局播放器实例

播放器组件实例 `$audio` 挂载到 `window` 对象上，可调用以下方法：

```typescript
// 可用的方法
window.$audio.play()    // 播放
window.$audio.pause()   // 暂停
window.$audio.el        // 音频元素
window.$audio.isPlay    // 播放状态
// ... 更多方法
```

## 🖼️ 应用截图

<div align="center">
  <img src="public/demo-images/img_0.png" alt="主界面" width="300"/>
  <img src="public/demo-images/img_1.png" alt="播放列表" width="300"/>
  <img src="public/demo-images/img_2.png" alt="歌词显示" width="300"/>
  <img src="public/demo-images/img_3.png" alt="设置界面" width="300"/>
  <img src="public/demo-images/img_4.png" alt="搜索功能" width="300"/>
  <img src="public/demo-images/img_5.png" alt="用户中心" width="300"/>
</div>

## 🔧 Electron API

应用提供以下窗口控制 API：

```typescript
// 窗口控制
win.maximize()    // 最大化窗口
win.unmaximize()  // 取消最大化
win.minimize()    // 最小化窗口
win.restore()     // 还原窗口
win.close()       // 关闭窗口
```

## 📝 问题反馈

如有任何问题，请创建 [Issues](https://github.com/your-repo/issues) 反馈。

## 📄 许可证

[MIT License](LICENSE)
