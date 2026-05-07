<script setup lang="ts">
import { calculateIsToday, formatDate, toggleImg } from '@/utils'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { getCommentMusic, getMusicDetail, GetMusicDetailData } from '@/api/musicList'
import { useRoute, useRouter } from 'vue-router'
import { useFlags } from '@/store/flags'

interface State {
  comments: any[]
  song: GetMusicDetailData | null
  total: number
  pageSize: number
  currentPage: number
  loading: boolean
  hasMore: boolean
}
const flags = useFlags()
const router = useRouter()
const route = useRoute()
const page = ref(1)
const contentEl = ref<HTMLDivElement>()
const state: State = reactive({
  comments: [],
  song: null,
  total: 0,
  pageSize: 20,
  currentPage: 1,
  loading: false,
  hasMore: true
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

// 在 nextTick 后添加滚动监听
watch(
  () => contentEl.value,
  (el) => {
    if (el) {
      el.addEventListener('scroll', handleScroll)
    }
  },
  { immediate: true }
)
const getCommentMusicFn = async (id: number, page: number, append = false) => {
  if (state.loading) return

  state.loading = true
  const { data, code } = await getCommentMusic(id, 0, page, 20, 2)
  if (code === 200) {
    if (append) {
      state.comments = [...state.comments, ...data.comments]
    } else {
      state.comments = data.comments
    }
    state.total = data.totalCount
    state.hasMore = state.comments.length < state.total
  }
  state.loading = false
}
const loadMore = () => {
  if (!state.hasMore || state.loading) return
  state.currentPage++
  getCommentMusicFn(id, state.currentPage, true)
}

// 监听滚动到底部
const handleScroll = (e: Event) => {
  const target = e.target as HTMLDivElement
  if (!target) return

  const { scrollTop, scrollHeight, clientHeight } = target
  console.log('滚动:', { scrollTop, scrollHeight, clientHeight, diff: scrollHeight - scrollTop - clientHeight })

  // 距离底部 100px 时加载
  if (scrollHeight - scrollTop - clientHeight < 100) {
    console.log('触发加载')
    loadMore()
  }
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

          <div ref="contentEl" @wheel.stop class="content">
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
            <div v-if="state.comments.length === 0 && !state.loading" class="empty-state">
              <v-icon icon="mdi-comment-off-outline" size="x-large" color="grey" />
              <div class="empty-text">暂无评论</div>
            </div>

            <!-- 加载更多提示 -->
            <div v-if="state.loading" class="loading-more">
              <v-progress-circular indeterminate size="24" width="2" color="primary" />
              <span>加载中...</span>
            </div>

            <!-- 没有更多了 -->
            <div v-if="!state.hasMore && state.comments.length > 0" class="no-more">
              <span>没有更多评论了</span>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<style scoped lang="less">

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
    padding: 20px;
    padding-top: 10px;
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 16px;

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
          min-height: 0;
          display: flex;
          flex-direction: column;

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
            padding: 12px 16px;
            margin-bottom: 8px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 8px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

            &:hover {
              background: rgba(255, 255, 255, 0.05);
              border-color: rgba(var(--v-theme-primary), 0.2);
              transform: translateX(2px);

              .photo {
                transform: scale(1.05);
              }
            }

            .photo {
              width: 36px;
              height: 36px;
              min-width: 36px;
              border-radius: 50%;
              background-size: cover;
              background-position: center;
              margin-right: 12px;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .right-box {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 4px;

              .comment-header {
                display: flex;
                justify-content: space-between;
                align-items: center;

                .name {
                  font-size: 13px;
                  font-weight: 600;
                  color: rgb(var(--v-theme-primary));
                  cursor: pointer;
                  transition: all 0.3s ease;

                  &:hover {
                    opacity: 0.8;
                  }
                }

                .time {
                  font-size: 11px;
                  color: rgba(255, 255, 255, 0.4);
                }
              }

              .text {
                font-size: 13px;
                line-height: 1.5;
                color: rgba(255, 255, 255, 0.85);
                word-break: break-word;
              }

              .handle-box {
                margin-top: 2px;

                .operation {
                  display: flex;
                  gap: 4px;

                  .action-btn {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.5);
                    padding: 0 6px;
                    height: 24px;
                    min-width: auto;

                    &:hover {
                      color: rgb(var(--v-theme-primary));
                      background: rgba(var(--v-theme-primary), 0.1);
                    }

                    .v-icon {
                      margin-right: 3px;
                      font-size: 14px;
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
            padding: 60px 20px;
            gap: 12px;

            .empty-text {
              font-size: 14px;
              color: rgba(255, 255, 255, 0.4);
            }
          }

          .loading-more {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 24px 0;
            color: rgba(255, 255, 255, 0.5);
            font-size: 13px;
          }

          .no-more {
            text-align: center;
            padding: 20px 0;
            color: rgba(255, 255, 255, 0.3);
            font-size: 13px;
          }
        }
      }
    }
  }
</style>
