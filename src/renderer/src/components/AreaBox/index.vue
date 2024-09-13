<script lang="ts" setup>
import {ref, withDefaults} from 'vue'

interface Props {
  isMove?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  isMove: true,
})
const content = ref<HTMLDivElement>()
const emit = defineEmits(['titleClick'])
const left = ref(0)
const rightDisabled = ref(false)
const leftDisabled = ref(true);

const moveHandler = (direction: 'left' | 'right') => {
  if (content.value) {
    const children = content.value!.children;
    const containerWidth = content.value!.clientWidth;  // 可视区域宽度
    const totalScrollWidth = content.value!.scrollWidth;  // 总的可滚动宽度
    const currentScrollLeft = content.value!.scrollLeft;  // 当前滚动的位置

    if (direction === 'right' && !rightDisabled.value) {
      // 向右移动逻辑
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement;
        const distance = el.offsetLeft + el.clientWidth;
        console.log('el', el)
        if (distance > currentScrollLeft + containerWidth) {
          left.value = el.offsetLeft;
          break;
        }
      }
      content.value!.scrollTo({
        left: left.value,
        behavior: "smooth",
      });

      // 检查是否到达最右侧
      if (Math.ceil(currentScrollLeft + containerWidth) >= (totalScrollWidth - containerWidth)) {
        rightDisabled.value = true;
      }
      leftDisabled.value = false; // 向右移动后，左侧一定是可移动的
    }
    else if (direction === 'left' && !leftDisabled.value) {
      // 向左移动逻辑
      for (let i = children.length - 1; i >= 0; i--) {
        const el = children[i] as HTMLElement;
        const distance = el.offsetLeft;
        if (distance < currentScrollLeft) {
          left.value = (el.offsetLeft + el.clientWidth ) - containerWidth;
          break;
        }
      }
      content.value!.scrollTo({
        left: left.value,
        behavior: "smooth",
      });

      // 检查是否到达最左侧
      if (left.value <= 0) {
        leftDisabled.value = true;
      }
      rightDisabled.value = false; // 向左移动后，右侧一定是可移动的
    }
  }
};

</script>

<template>
  <div class="area-box">
    <div class="head">
      <div class="title">
        <slot name="title"></slot>
        <el-icon style="position: relative;top: 1px" :size="16"><ArrowRightBold /></el-icon>
      </div>
     </div>
    <template v-if="props.isMove">
      <div @click="moveHandler('left')" :class="['left', 'move', leftDisabled ? 'disabled' : '']">
        <el-icon :size="40"><ArrowLeft /></el-icon>
      </div>
      <div @click="moveHandler('right')" :class="['right', 'move', rightDisabled ? 'disabled' : '']">
        <el-icon :size="40"><ArrowRight /></el-icon>
      </div>
    </template>
    <div ref="content" class="content">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="less" scoped>
.area-box {
  margin-top: 20px;
  position: relative;
  .move {
    position: absolute;
    z-index: 10;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    cursor: pointer;
    color: rgba(255,255,255,0.4);
    transition: color 0.5s;
    &:hover {
      color: @text;
    }
  }
  .move.disabled {
    cursor: auto;
    color: rgba(255,255,255,0.4);
  }
  .left {
    left: -45px;
  }
  .right {
    right: -45px;
  }
  .head {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    .title {
      display: flex;
      align-items: center;
      font-size: 18px;
      cursor: pointer;
    }
  }
  .content {
    display: flex;
    overflow: hidden;
  }
}

</style>
