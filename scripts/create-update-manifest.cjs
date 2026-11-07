// Run after packaging the custom Windows installer. No GitHub credentials are needed.
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')

async function main() {
  const root = path.resolve(__dirname, '..')
  const args = process.argv.slice(2)
  const option = (name, fallback = '') => {
    const index = args.indexOf(name)
    if (index < 0) return fallback
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${name} 缺少参数`)
    return args[index + 1]
  }
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw new Error('仅支持 x.y.z 格式的正式版本')
  const repo = option('--repo', '1727533196/Music')
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('仓库格式应为 owner/repo')
  const notesFile = option('--notes-file')
  const notes = notesFile ? fs.readFileSync(path.resolve(notesFile), 'utf8') : option('--notes')
  const httpsUrl = (value) => {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('下载地址必须使用 HTTPS')
    return url.href
  }
  const mirrors = []
  args.forEach((argument, index) => {
    if (argument === '--mirror') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('--mirror 缺少参数')
      mirrors.push(httpsUrl(args[index + 1]))
    }
  })
  if (mirrors.length > 8) throw new Error('最多支持 8 个备用下载地址')
  const directory = path.join(root, 'dist', 'installer')
  const installer = path.join(directory, 'Tinglan-安装包.exe')
  const assetName = 'install-win.exe'
  const stat = fs.statSync(installer)
  const libEntry = require.resolve('app-builder-lib', {
    paths: [require.resolve('electron-builder')]
  })
  const asar = require(require.resolve('@electron/asar', { paths: [libEntry] }))
  const resources = path.join(directory, 'win-unpacked', 'resources')
  const installerArchive = path.join(resources, 'app.asar')
  const payloadArchive = path.join(resources, 'payload', '音乐', 'resources', 'app.asar')
  const payloadPackage = JSON.parse(
    asar.extractFile(payloadArchive, 'package.json').toString('utf8')
  )
  const installerMain = asar
    .extractFile(installerArchive, path.join('out', 'main', 'index.js'))
    .toString('utf8')
  const appMain = asar
    .extractFile(payloadArchive, path.join('out', 'main', 'index.js'))
    .toString('utf8')
  if (payloadPackage.version !== version)
    throw new Error('主程序版本与 package.json 不一致，请先重新打包主程序')
  if (!installerMain.includes('--music-update=') || !appMain.includes('updates:check')) {
    throw new Error('安装包未包含在线更新功能，请重新构建主程序和安装器')
  }
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(installer)) hash.update(chunk)
  const manifest = {
    version,
    platform: 'win32',
    arch: 'x64',
    url: httpsUrl(
      option(
        '--download-url',
        `https://github.com/${repo}/releases/download/v${version}/${assetName}`
      )
    ),
    sha256: hash.digest('hex'),
    size: stat.size,
    notes,
    ...(mirrors.length ? { mirrors: [...new Set(mirrors)] } : {})
  }
  const output = path.join(directory, 'version.json')
  fs.copyFileSync(installer, path.join(directory, assetName))
  fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`已生成更新信息：${output}`)
  console.log(`请向 GitHub Release v${version} 上传 version.json 和 ${assetName}`)
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
