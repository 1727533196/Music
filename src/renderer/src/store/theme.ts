import {defineStore} from "pinia";
import ColorThief from 'colorthief'
import {toggleImg} from "@/utils";

// 一些主题颜色
export const useTheme = defineStore('themeId', {
  state() {
    return {
      bgColor: '' as string | number[],
      pointer: 1,
    }
  },
  actions: {
    change(src?: string) {
      const app = document.querySelector('#opacity-bg1') as HTMLDivElement
      const opacityBg = document.querySelector('#opacity-bg') as HTMLDivElement
      if(src) {
        toggleImg(src).then(img => {
          const colorThief = new ColorThief()
          let rgb = colorThief.getColor(img)
          rgb = [rgb[0] / 2, rgb[1] * 0.6, rgb[2] * 0.7]

          const isRepeat = rgb.every((rgb, index) => {
            return rgb === this.bgColor[index]
          })
          if(isRepeat) {
            return
          }
          this.bgColor = rgb
          if(this.pointer === 0) {
            app.style.backgroundImage = `linear-gradient(rgb(${rgb}) , rgb(19, 19, 26) 50%)`
            app.style.opacity = '1'
            opacityBg.style.opacity = '0'
            this.pointer = 1
          } else {
            opacityBg.style.backgroundImage = `linear-gradient(rgb(${rgb}) , rgb(19, 19, 26) 50%)`
            opacityBg.style.opacity = '1'
            app.style.opacity = '0'
            this.pointer = 0
          }
        })

      } else {
        this.bgColor = ''
        if(this.pointer === 0) {
          app.style.backgroundImage = ``
          app.style.opacity = '1'
          opacityBg.style.opacity = '0'
          this.pointer = 1
        } else {
          opacityBg.style.backgroundImage = ``
          opacityBg.style.opacity = '1'
          app.style.opacity = '0'
          this.pointer = 0
        }
      }

    },
  },
})
