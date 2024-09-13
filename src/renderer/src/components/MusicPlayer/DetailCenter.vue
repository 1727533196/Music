<script setup lang="ts">
interface Props {
  isPlay: boolean
  orderStatusVal: number
  orderStatus: string[]
}
const props = defineProps<Props>()
const emit = defineEmits(['setOrderHandler', 'cutSong', 'pause', 'play'])
</script>

<template>
  <div class="center">
    <div class="cut-container">
      <svg @click="emit('setOrderHandler')" style="width: 20px" :class="['icon', 'iconfont', props.orderStatus[orderStatusVal]]" aria-hidden="true">
        <use :xlink:href="'#'+props.orderStatus[orderStatusVal]"></use>
      </svg>
      <i @click="emit('cutSong', false)" class="iconfont cut icon-shangyishou"></i>
      <i v-show="isPlay"  @click="$emit('pause')" class="iconfont operation icon-Pause"></i>
      <i v-show="!isPlay" @click="$emit('play', false)" class="iconfont operation icon-kaishi1"></i>
      <i @click="emit('cutSong', true)" class="iconfont cut icon-xiayishou"></i>
    </div>
  </div>
</template>

<style scoped lang="less">
.center {
  color: rgb(212, 212, 212);
  width: 441px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;

  .cut-container {
    //width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    .icon-xihuan5 {
      font-size: 22px !important;
    }
    .icon {
      font-size: 18px;
    }
    .iconfont {
      cursor: pointer;
    }
    .iconfont + .iconfont {
      margin-left: 35px;
    }

    .iconfont:not(.operation):hover {
      color: rgb(194, 58, 59);
    }

    .operation:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .cut {
      font-size: 18px;
    }

    .operation {
      //margin: 0 40px;
      color: @text;
      font-size: 18px;
      display: inline-block;
      width: 37px;
      line-height: 37px;
      text-align: center;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.05);

      &::before {
        margin-left: 3px;
      }
    }

    .icon-Pause {
      font-size: 16px;

      &::before {
        margin-left: 1px;
      }
    }
  }
}
</style>
