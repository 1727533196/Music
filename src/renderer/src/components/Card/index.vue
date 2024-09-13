<script setup lang="ts">
interface Props {
  picUrl?: string
  name?: string
  isClick?: boolean
  isStartIcon?: boolean
}
defineOptions({
  name: 'Card'
})
const emit = defineEmits(['click'])
const props = defineProps<Props>()

const clickHandler = () => {
  emit('click')
}
</script>

<template>
  <div class="card-box">
    <div
      @click="clickHandler"
      :style="{ backgroundImage: `url(${props.picUrl}?param=400y400` }"
      :class="['card', { 'card-click': isClick }]"
    >
      <slot></slot>
      <div v-if="isStartIcon" class="start-icon-box">
        <i class="iconfont operation icon-kaishi1"></i>
      </div>
    </div>
    <span :class="['text', { 'card-click': isClick }]">{{ props.name }}</span>
  </div>
</template>

<style lang="less" scoped>
.card-box {
  display: inline-block;
  width: calc(15vw - 20px);
  margin-bottom: 20px;
  box-sizing: content-box;
  //& + & {
  //  margin-left: calc(10% - 90px);
  //}
  .card {
    width: calc(15vw - 20px);
    height: calc(15vw - 20px);
    border-radius: 5px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: 0.3s;
    position: relative;
    .start-icon-box {
      position: absolute;
      bottom: 10px;
      width: calc(5vw - 25px);
      height: calc(5vw - 25px);
      right: 10px;
      //width: 35px;
      //height: 35px;
      border-radius: 50%;
      background-color: rgb(255, 255, 255);
      opacity: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: 0.5s;
      visibility: hidden;

      .icon-kaishi1 {
        color: @subject;
        font-size: calc(2vw - 5px);
      }
    }
  }
  .card:hover {
    .start-icon-box {
      visibility: visible;
      opacity: 0.8;
    }
    box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.1);
  }
  .card-click {
    cursor: pointer;
  }
  .text {
    margin-top: 5px;
    color: @text;
    font-size: 15px;
    .textOverflow(2);
  }
}
</style>
