# TODO

## 安装器

- [ ] **ARM 架构支持**：主应用和安装器的 `electron-builder.yml` 需加 `arch: [arm64]`，安装器 `extraResources.from` 同步改为 `win-arm64-unpacked`
- [ ] **安装路径双层"音乐"**：`installDir` 和 `destAppPath` 各拼一次产品名，导致 `D:\音乐\音乐\音乐.exe`，考虑去重
- [ ] **macOS 构建未验证**：目前只测了 Windows，mac 打包流程未跑过

## 构建

- [ ] **npmmirror 源慢**：electron-builder 下载依赖偶发超时，考虑切回官方源或换个镜像
- [ ] **pnpm onlyBuiltDependencies 警告**：`package.json` 里的 `pnpm` 字段已废弃，需迁移到 `.npmrc`（`pnpm.onlyBuiltDependencies[]=electron` 等）

## 安装器 UI

- [ ] **步骤 2 路径输入**：手动输入路径后失焦时 `normalizeInstallPath` 自动补产品名，但 @input 事件未同步触发规范化
- [ ] **安装失败日志可复制**：已加 `user-select: text`，验证是否生效
