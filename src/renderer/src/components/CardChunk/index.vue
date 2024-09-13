<script setup lang="ts">
import {Recommend} from "@/api/home";
import {nextTick, onMounted, ref, watch} from "vue";
import {suitableSpace} from "@/utils";

interface Props {
  recommend: Recommend[]
  title: string
}
const props = defineProps<Props>()
const emit = defineEmits(['click'])

// 点击滑动卡片
const clickSliderHandler = () => {
  emit('click')
}

</script>

<template>
  <div class="chunk-container">
    <div class="header">
      {{ props.title }}
      <el-icon><ArrowRight /></el-icon>
    </div>
    <div class="subject">
      <div style="margin-right: calc(2vw - 10px)" class="item">
        <slot></slot>
      </div>
      <div
        class="item"
        :id="index+2"
        v-for="(item, index) in props.recommend"
      >
        <Card
          @click="emit('click', item)"
          is-click
          :item="item"
          :name="item.name"
          :pic-url="item.picUrl"
        />
      </div>
    </div>
<!--    <el-icon @click="clickSliderHandler" :size="50" class="arrow left"><ArrowLeft /></el-icon>-->
<!--    <el-icon @click="clickSliderHandler" :size="50" class="arrow right"><ArrowRight /></el-icon>-->
  </div>
</template>

<style lang="less" scoped>
.chunk-container {
  position: relative;
  .arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }
  .left {
    left: -42px;
  }
  .right {
    right: -40px;
  }
  .header {
    font-size: 20px;
    color: @text;
    font-weight: 800;
    display: flex;
    align-items: center;
  }

  .subject {
    padding-top: 15px;
    display: grid;
    //第一个属性：行与行间隔，第二个属性列与列间隔
    grid-gap: 20px 20px;
    //内容整体平均分布
    justify-content: space-between;
    //单元格的大小是固定的，但是容器的大小不确定。如果希望每一行（或每一列）容纳尽可能多的单元格，这时可以使用auto-fill关键字表示自动填充
    grid-template-columns: repeat(auto-fill, calc(15vw - 20px));
    .item {
      //margin-right: 10px;
      //width: calc((100%) / 5);
      //padding-right: 10px;
    }
  }
}
</style>