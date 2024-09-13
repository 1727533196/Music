<script setup lang="ts">
import {computed, reactive, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {getArtistDetail, getArtistDetailRes} from "@/api/user";
import {getAlbumContent, getArtistAlbum, GetArtistAlbumRes} from "@/api/musicList";
import AdaptiveListBox from '@/components/AdaptiveListBox/index.vue'
import AdaptiveList from '@/components/AdaptiveList/index.vue'
import {tabsConfig} from "@/views/SingerPage/config";
import {useTheme} from "@/store/theme";

interface State {
  singerDetail: getArtistDetailRes['data']
  artist: getArtistDetailRes['data']['artist']
  albums: GetArtistAlbumRes['hotAlbums']
}
const state = reactive<State>({
  singerDetail: {} as getArtistDetailRes['data'],
  artist: {} as getArtistDetailRes['data']['artist'],
  albums: [],
})
type LabelType = 1 | 2 | 3 | 4
const activeTab = ref<LabelType>(tabsConfig[0].name as LabelType)
const route = useRoute()
const router = useRouter()
const theme = useTheme()
watch(() => route.fullPath, () => {
  if(route.path === '/singer-page') {
    init()
  }
}, {
  immediate: true,
})

function init() {
  const {id} = route.query as {id: number | null}
  if(id) {
    getSingerDetail(id)
    getSingerAlbum(id)
  }
}

async function getSingerDetail(id: number) {
  const {data} = await getArtistDetail(id)

  state.singerDetail = data
  state.artist = data.artist
  theme.change(state.artist.avatar)
}
async function getSingerAlbum(id: number) {
  const {hotAlbums} = await getArtistAlbum(id)
  state.albums = hotAlbums
}
const alias = computed(() => {
  return state.artist.alias?.join('；')
})

const gotoUserDetail = () => {
  router.push({
    path: '/detail',
    query: {
      uid: state.singerDetail.user!.userId
    }
  })
}
const getAlbumContentHandler = async (id: number) => {
  // const data = await getAlbumContent(id)
  // console.log(data)
  router.push({
    path: '/play-list',
    query: {
      id,
      type: 'album',
    }
  })
}
</script>

<template>
  <div class="singer-card-container">
    <div :style="{backgroundImage: `url(${state.artist.avatar})`}" class="avatar"></div>
    <div class="detail">
      <h2 class="name">{{state.artist.name}}</h2>
      <div class="alias">{{alias}}</div>
      <div class="btn">
        <BaseButton>已收藏</BaseButton>
        <BaseButton @click="gotoUserDetail" v-if="state.singerDetail.user">个人主页</BaseButton>
      </div>
      <div class="count">
        <span v-if="state.artist.musicSize">单曲数:{{state.artist.musicSize}}</span>
        <span v-if="state.artist.albumSize">专辑数:{{state.artist.albumSize}}</span>
        <span v-if="state.artist.mvSize">MV数:{{state.artist.mvSize}}</span>
      </div>
    </div>
  </div>
  <adaptive-list-box>
    <tabs v-model="activeTab">
      <tab-pane
        v-for="item in tabsConfig"
        :name="item.name"
        :label="item.label"
      >
        <adaptive-list>
          <card
            v-for="item in state.albums"
            @click="getAlbumContentHandler(item.id)"
            :name="item.name"
            :picUrl="item.picUrl"
            is-click
            is-start-icon
          ></card>
        </adaptive-list>
      </tab-pane>
    </tabs>
  </adaptive-list-box>
</template>

<style lang="less" scoped>
.singer-card-container {
  display: flex;
  //align-items: center;
  background-color: rgba(255, 255, 255, .05);
  padding: 20px;
  border-radius: 20px;
  width: calc(87vw - 180px);
  //width: 87%;
  margin: 0 auto;
  box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.1);
  transition: 0.4s;
  .bgSetting();
  .avatar {
    .bgSetting();
    height: 200px;
    width: 200px;
    border-radius: 10px;
    margin-right: 30px;
  }
  .detail {
    display: flex;
    flex-direction: column;
    //justify-content: flex-start;
    >* {
      margin-bottom: 10px;
    }
    .alias {
      font-size: 14px;
    }
    .count {
      >* {
        font-size: 13px;
        margin-right: 20px;
      }
    }
  }
}
</style>