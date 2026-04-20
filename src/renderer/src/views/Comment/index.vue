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
      <!-- 歌曲信息卡片 -->
      <div class="info-card">
        <div ref="imgEl" class="bg-img"></div>
        <div class="song-info">
          <div class="song-name">{{ (state.song as GetMusicDetailData).name }}</div>
          <div class="singers">
            <div class="singer-info">
              <v-icon icon="mdi-account-music" size="small" class="mr-1" />
              <span v-for="(item, index) in state.song.ar"
                >{{
                  item.name + (index < (state.song as GetMusicDetailData).ar.length - 1 ? ' / ' : '')
                }}</span
              >
            </div>
            <div class="album">
              <v-icon icon="mdi-album" size="small" class="mr-1" />
              {{ (state.song as GetMusicDetailData).al.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- 评论内容区 -->
      <div class="comment-content">
        <div class="comment-content-box">
          <div class="title">
            <v-icon icon="mdi-comment-text-multiple" size="small" class="mr-2" />
            精彩评论
            <span class="comment-count">({{ state.total }})</span>
          </div>

          <div @wheel.stop class="content">
            <div v-for="(item, index) in state.comments" :key="index" class="content-line">
              <div
                @click="gotoUserDetail(item.user.userId)"
                :style="{ backgroundImage: `url(${item.user.avatarUrl}?param=80y80)` }"
                class="photo"
              ></div>
              <div class="right-box">
                <div class="comment-header">
                  <div @click="gotoUserDetail(item.user.userId)" class="name">
                    {{ item.user.nickname }}
                  </div>
                  <div class="time">{{ item.timeStr }}</div>
                </div>
                <div class="text">{{ item.content }}</div>
                <div class="handle-box">
                  <div class="operation">
                    <v-btn
                      variant="text"
                      size="x-small"
                      class="action-btn"
                    >
                      <v-icon icon="mdi-star-outline" size="small" />
                      <span>{{ item.likedCount }}</span>
                    </v-btn>
                    <v-btn
                      variant="text"
                      size="x-small"
                      class="action-btn"
                    >
                      <v-icon icon="mdi-reply" size="small" />
                      <span>回复</span>
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="state.comments.length === 0" class="empty-state">
              <v-icon icon="mdi-comment-off-outline" size="x-large" color="grey" />
              <div class="empty-text">暂无评论</div>
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
.comment {
  height: 100%;
  width: 100%;
  overflow-y: auto;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  .comment-box {
    padding: 35px;
    padding-top: 10px;
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 24px;

    // 歌曲信息卡片
    .info-card {
      display: flex;
      align-items: center;
      padding: 20px 24px;
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      transition: all 0.3s ease;
      flex-shrink: 0;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }

      .bg-img {
        width: 110px;
        height: 110px;
        min-width: 110px;
        border-radius: 12px;
        background-size: cover;
        background-position: center;
        margin-right: 24px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        transition: transform 0.3s ease;
      }

      &:hover .bg-img {
        transform: scale(1.05);
      }

      .song-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;

        .song-name {
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 14px;
          background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .singers {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);

          .singer-info,
          .album {
            display: flex;
            align-items: center;
          }
        }
      }
    }

    // 评论内容区
    .comment-content {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .comment-content-box {
        height: 100%;
        display: flex;
        flex-direction: column;

        .title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          color: rgba(255, 255, 255, 0.9);

          .comment-count {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.5);
            margin-left: 8px;
            font-weight: 400;
          }
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding-right: 10px;
          margin-bottom: 16px;
          min-height: 0;

          // 自定义滚动条
          &::-webkit-scrollbar {
            width: 6px;
          }

          &::-webkit-scrollbar-track {
            background: transparent;
          }

          &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;

            &:hover {
              background: rgba(255, 255, 255, 0.25);
            }
          }

          .content-line {
            display: flex;
            align-items: flex-start;
            padding: 20px;
            margin-bottom: 12px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

            &:hover {
              background: rgba(255, 255, 255, 0.05);
              border-color: rgba(var(--v-theme-primary), 0.2);
              transform: translateX(4px);
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);

              .photo {
                transform: scale(1.1);
              }
            }

            .photo {
              width: 48px;
              height: 48px;
              min-width: 48px;
              border-radius: 50%;
              background-size: cover;
              background-position: center;
              margin-right: 16px;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
              border: 2px solid rgba(255, 255, 255, 0.1);
            }

            .right-box {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 8px;

              .comment-header {
                display: flex;
                justify-content: space-between;
                align-items: center;

                .name {
                  font-size: 14px;
                  font-weight: 600;
                  color: rgb(var(--v-theme-primary));
                  cursor: pointer;
                  transition: all 0.3s ease;

                  &:hover {
                    opacity: 0.8;
                  }
                }

                .time {
                  font-size: 12px;
                  color: rgba(255, 255, 255, 0.4);
                }
              }

              .text {
                font-size: 14px;
                line-height: 1.6;
                color: rgba(255, 255, 255, 0.85);
                word-break: break-word;
              }

              .handle-box {
                margin-top: 4px;

                .operation {
                  display: flex;
                  gap: 8px;

                  .action-btn {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                    padding: 0 8px;
                    min-width: auto;

                    &:hover {
                      color: rgb(var(--v-theme-primary));
                      background: rgba(var(--v-theme-primary), 0.1);
                    }

                    .v-icon {
                      margin-right: 4px;
                    }
                  }
                }
              }
            }
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            gap: 16px;

            .empty-text {
              font-size: 14px;
              color: rgba(255, 255, 255, 0.4);
            }
          }
        }
      }
    }
  }
}
</style>
