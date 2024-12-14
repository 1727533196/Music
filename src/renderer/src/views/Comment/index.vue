<script setup lang="ts">
import { calculateIsToday, formatDate, toggleImg } from '@/utils'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { getCommentMusic, getMusicDetail, GetMusicDetailData } from '@/api/musicList'
import { useRoute, useRouter } from 'vue-router'
import { useFlags } from '@/store/flags'
import Pagination from '@/components/Pagination/index.vue'

interface State {
  comments: any[]
  song: GetMusicDetailData | null
  total: number
  pageSize: number
  currentPage: number
}
const flags = useFlags()
const router = useRouter()
const route = useRoute()
const page = ref(1)
const state: State = reactive({
  comments: [],
  song: null,
  total: 0,
  pageSize: 20,
  currentPage: 1
})
let id = +route.query.id!
const currentTab = ref<string>()
const imgEl = ref<HTMLDivElement>()
const bg = ref<string>('')

onMounted(() => {
  watch(bg, (val) => {
    toggleImg(val).then((img) => {
      imgEl.value!.style.backgroundImage = `url(${img.src})`
    })
  })
})
const getCommentMusicFn = async (id: number, page: number) => {
  const { data, code } = await getCommentMusic(id, 0, page, 20, 2)
  if (code === 200) {
    state.comments = data.comments
    state.total = data.totalCount
  }
}
const currentChange = (page: number) => {
  state.currentPage = page
  getCommentMusicFn(id, page)
}
const getMusicDetailFn = async (id: number) => {
  const { songs } = await getMusicDetail(String(id))
  state.song = songs[0]
  bg.value = state.song.al.picUrl
}
function init() {
  getCommentMusicFn(id, page.value)
  getMusicDetailFn(id)
}
init()
const gotoUserDetail = (uid: number) => {
  flags.isOpenDetail = false
  router.push({
    path: '/detail',
    query: {
      uid
    }
  })
}
watch(
  () => +route.query.id!,
  (value) => {
    if (route.path === '/comment') {
      id = value
      init()
    }
  }
)
</script>

<template>
  <div class="comment">
    <div v-if="state.song !== null" class="comment-box">
      <div class="info">
        <div ref="imgEl" class="bg-img"></div>
        <div class="song-info">
          <div class="song-name">{{ (state.song as GetMusicDetailData).name }}</div>
          <div class="singers">
            <div class="singer-info">
              <span v-for="(item, index) in state.song.ar"
                >歌手:
                {{
                  item.name + (index < (state.song as GetMusicDetailData).ar.length - 1 ? '/' : '')
                }}</span
              >
            </div>
            <div class="album">专辑: {{ (state.song as GetMusicDetailData).al.name }}</div>
          </div>
        </div>
      </div>
      <div class="comment-content">
        <div class="comment-content-box">
          <div class="title">精彩评论</div>
          <div @wheel.stop class="content">
            <div v-for="item in state.comments" class="content-line">
              <div
                @click="gotoUserDetail(item.user.userId)"
                :style="{ backgroundImage: `url(${item.user.avatarUrl})` }"
                class="photo"
              ></div>
              <div class="right-box">
                <div class="comment-text">
                  <div @click="gotoUserDetail(item.user.userId)" class="name">
                    {{ item.user.nickname }}:
                  </div>
                  <div class="text">{{ item.content }}</div>
                </div>
                <div class="handle-box">
                  <div class="time">{{ item.timeStr }}</div>
                  <div class="operation">
                    <el-icon><Star /></el-icon>
                    <span style="font-size: 12px">{{ item.likedCount }}</span>
                    <div class="operator-line"></div>
                    <el-icon><ChatDotSquare /></el-icon>
                  </div>
                </div>
              </div>
              <div class="line"></div>
            </div>
          </div>
          <pagination
            @current-change="currentChange"
            :total="state.total"
            :pageSize="state.pageSize"
            :currentPage="state.currentPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.el-tab-pane),
:deep(.el-tabs__content),
:deep(.el-tabs) {
  height: 100%;
}
.comment {
  height: 100%;
  width: 100%;
  //position: fixed;
  //transform: translateY(100%);
  //background-color: @bgColor;
  .comment-box {
    padding: 0 0 0 35px;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    flex-flow: column;
    height: 100%;
    .info {
      display: flex;
      margin-bottom: 30px;
      .song-info {
        display: flex;
        flex-direction: column;
        font-size: 13px;
        .song-name {
          font-size: 30px;
          margin-bottom: 20px;
          //margin-top: 10px;
        }
        .singers {
          display: flex;
          align-items: center;
          .singer-info {
            display: flex;
            align-items: center;
            margin-right: 20px;
          }
        }
      }
      .bg-img {
        transition: 1s background;
        width: 130px;
        height: 130px;
        border-radius: 10px;
        .bgSetting();
        margin-right: 20px;
      }
    }
    .comment-content {
      :deep(.el-tabs__item) {
        margin-right: 30px;
      }
      .comment-content-box {
        height: 100%;
        margin-bottom: 150px;
        .title {
          font-size: 18px;
          margin-bottom: 5px;
        }
        .content {
          padding-right: 35px;
          .content-line {
            display: flex;
            align-items: center;
            position: relative;
            padding-bottom: 25px;
            width: 100%;
            padding-top: 25px;
            .line {
              position: absolute;
              bottom: 0;
              left: 0;
              height: 1px;
              width: 100%;
              background-color: rgba(255, 255, 255, 0.08);
            }
            .photo {
              cursor: pointer;
              width: 40px;
              height: 40px;
              min-width: 40px;
              min-height: 40px;
              border-radius: 50%;
              background-color: #42b983;
              margin-right: 20px;
              .bgSetting();
            }
            .right-box {
              display: flex;
              flex-direction: column;
              align-content: space-around;
              width: 100%;
              .comment-text {
                display: flex;
                font-size: 13px;
                margin-bottom: 6px;
                .name {
                  color: #0086b3;
                  cursor: pointer;
                  margin-right: 5px;
                }
                .text {
                }
              }
              .handle-box {
                display: flex;
                justify-content: space-between;
                .time {
                  font-size: 13px;
                }
                .operation {
                  position: relative;
                  top: 4px;
                  display: flex;
                  align-items: center;
                  .operator-line {
                    width: 1.5px;
                    height: 15px;
                    background-color: rgba(255, 255, 255, 0.05);
                    margin: 0 10px;
                  }
                  .el-icon {
                    cursor: pointer;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
</style>
