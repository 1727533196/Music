//  快捷键配置文件
import { useFlags } from '@/store/flags'

const keydownHandler = (event: KeyboardEvent) => {
  const flags = useFlags()

  // 空格暂停|播放
  switch (event.code) {
    case 'Space':
      event.preventDefault()
      if ($audio.isPlay) {
        $audio.pause()
      } else {
        $audio.play()
      }
      break
    case 'ArrowRight':
    case 'ArrowLeft':
      event.code === 'ArrowRight' ? ($audio.time += 10) : ($audio.time -= 10)
      break
    case 'ArrowUp':
    case 'ArrowDown':
      event.preventDefault()
      flags.isOpenDetail = event.code === 'ArrowUp'
      break
  }
}
// 按键配置
document.onkeydown = keydownHandler

export {}
