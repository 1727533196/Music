<script setup lang="ts">
interface Props {
  item: any
  checked: boolean
}
const props = defineProps<Props>()
const emit = defineEmits(['click'])
</script>

<template>
  <div
    @click="emit('click', item)"
    :style="{ fontSize: item.asideFontSize + 'px' || '' }"
    :class="['play-list-item', { current: checked }]"
  >
    <i v-if="item.icon" :class="['iconfont', item.icon || '']"></i>
    <img v-else-if="item.coverImgUrl" :src="item.coverImgUrl + '?param=150y150'" alt="" />
    <span class="name">{{ item.name }}</span>
  </div>
</template>

<style lang="less" scoped>
.play-list-item {
  cursor: pointer;
  color: @text;
  font-size: 13px;
  text-align: left;
  line-height: 40px;
  .textOverflow();
  padding: 0 10px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  margin: 7px 0;
  > img {
    width: 34px;
    height: 34px;
    border-radius: 6px;
  }
  .name {
    margin-left: 10px;
    .textOverflow();
  }
}
.play-list-item:hover {
  background-image: linear-gradient(to right, rgba(255, 17, 104, 0.8), rgba(252, 61, 73, 0.3));
}
.current.play-list-item {
  background-image: linear-gradient(to right, rgba(255, 17, 104, 0.8), rgba(252, 61, 73, 0.7));
}
</style>
