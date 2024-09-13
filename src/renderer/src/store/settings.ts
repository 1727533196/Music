import {defineStore} from "pinia";

export const useSettings = defineStore('settingsId', {
  state() {
    return {
      lyricBg: 'rhythm' as 'rgb' | 'rhythm',
    }
  }
})