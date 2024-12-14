<script setup lang="ts">
import { useRouter } from 'vue-router'
import { getUserRecord, PlayList } from '@/api/musicList'
import img from '@/assets/img.jpg'
import { computed } from 'vue'
import { useUserInfo } from '@/store'
import AdaptiveListBox from '@/components/AdaptiveListBox/index.vue'
import AdaptiveList from '@/components/AdaptiveList/index.vue'

type List = { label: string; name: string }[]
interface Props {
  list: List
  modelValue: string
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
    emit('tabChange', val)
    emit('update:modelValue', val)
  }
})
const test = (val) => {
  console.log(val)
}

const gotoUserCover = async (uid: number) => {
  router.push({
    path: 'user-cover',
    query: {
      uid
    }
  })
}
</script>

<template>
  <AdaptiveListBox>
    <v-tabs v-model="val" align-tabs="center" color="primary">
      <v-tab v-for="item in props.list" :value="item.name">{{ item.label }}</v-tab>
    </v-tabs>
    <template v-for="item in props.list" :key="item.name">
      <div v-show="item.name === val">
        <AdaptiveList :loading="props.loading">
          <card
            v-if="store.profile.userId === props.userId && item.name === 'createSongList'"
            :picUrl="img"
            class="item"
            name="我的听歌排行"
            is-click
            is-start-icon
            @click="gotoUserCover(props.userId)"
          ></card>
          <template v-if="playList.length">
            <card
              v-for="playItem in playList"
              @click="cardClickHandler(playItem)"
              class="item"
              :pic-url="playItem.coverImgUrl"
              :name="playItem.name"
              is-click
              is-start-icon
            ></card>
          </template>
          <div v-else>
            <h1>无任何数据</h1>
          </div>
        </AdaptiveList>
      </div>
    </template>
  </AdaptiveListBox>
</template>

<style lang="less" scoped></style>
