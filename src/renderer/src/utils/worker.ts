import {animation} from "@/utils/index";

let pause: ((isPause: boolean) => void) | null
let activeTransition: any

onmessage = function (event) {
  const data = event.data

  // 如果有新的动画请求并且与当前动画不同，则取消当前动画
  if (data.transition && data.transition !== activeTransition) {
    if (pause) {
      pause(true);
      pause = null;
    }
    activeTransition = data.transition;
  }

  if(data.pause && pause) {
    // 如果收到暂停指令，暂停或恢复动画
    pause(data.val);
  } else if(data.transition) {
    pause = animation(data.transition, (elapsed, done) => {
      postMessage({
        elapsed, done, transition: data.transition
      })
      // 动画完成后，清理资源
      if (done) {
        pause?.(true);
        pause = null;
        activeTransition = null;
      }
    })
  }
}

