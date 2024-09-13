<script setup lang="ts">
import {useRouter} from "vue-router";
import {PlayList} from "@/api/musicList";
import img from '@/assets/img.jpg'
import {computed} from "vue";
import {useUserInfo} from "@/store";
import AdaptiveListBox from '@/components/AdaptiveListBox/index.vue'
import AdaptiveList from '@/components/AdaptiveList/index.vue'

type List = {label: string, name: string}[]
interface Props {
  list: List
  modelValue: boolean
  playList: PlayList[]
  userId: number
  loading: boolean
}
const emit = defineEmits(['tabChange', 'update:modelValue'])
const props = defineProps<Props>()
const router = useRouter()
const store = useUserInfo()

const cardClickHandler = (item: PlayList) => {
  router.push({
    path: '/play-list',
    query: {
      id: item.id
    }
  })
}

const val = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  },
})

</script>

<template>
  <AdaptiveListBox>
    <tabs
      @tabChange="emit('tabChange', $event)"
      v-model="val"
    >
      <tab-pane
        v-for="item in props.list"
        :label="item.label"
        :name="item.name"
      >
        <AdaptiveList :loading="props.loading">
          <card
            v-if="store.profile.userId === props.userId && val === 'createSongList'"
            :picUrl="img"
            class="item"
            name="我的听歌排行"
            is-click
            is-start-icon
          ></card>
          <card
            v-for="playItem in playList"
            @click="cardClickHandler(playItem)"
            class="item"
            :pic-url="playItem.coverImgUrl"
            :name="playItem.name"
            is-click
            is-start-icon
          ></card>
        </AdaptiveList>
      </tab-pane>
    </tabs>
  </AdaptiveListBox>
</template>

<style lang="less" scoped>
</style>