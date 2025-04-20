<script lang="ts">
import {
  ref,
  h,
  withDirectives,
  resolveDirective,
  defineComponent,
  resolveComponent,
  PropType,
  watch
} from 'vue'
import { useRouter } from 'vue-router'
import { lookup } from '@/utils'
import { GetMusicDetailData, PlayList } from '@/api/musicList'
import { useUserInfo } from '@/store'
import useMusic from '@/components/MusicPlayer/useMusic'
import { useMusicAction } from '@/store/music'
import Pagination from '@/components/Pagination/index.vue'
import NotFound from '@/assets/not-found.png'
import ContextMenu from '@/components/ContextMenu/index.vue'
import { checkMusic } from '@/api/play'

export interface Columns {
  title: string
  picUrl?: string
  icon?: string[]
  prop?: string
  on?: object
  style?: object
  width?: string
  type?: 'index' | 'handle' | 'title' | 'album'
  class?: string
  processEl?: (createVNode: typeof h, arg: any, index: number) => any
}

interface Props {
  list: GetMusicDetailData[] // 列表信息
  songs: GetMusicDetailData // 播放器正在播放的歌曲信息
  // header: Header[]
  columns: Columns[]
  listInfo: PlayList // 歌单信息, 如果传入，则会定位到当前歌单播放级，不传则定位id级，用于确认当前歌曲是否选中
  loading?: boolean // 是否加载中
  ids?: number[] // 歌曲id列表, 用来判断是否为当前歌单, 如果需要使当前歌单进入运行时则需要传入
  scroll?: boolean // 是否显示滚动条
  lazy?: boolean // 图片懒加载
}

export const indiviEl = (config: Columns, type: 1 | 2, value: any) => {
  const ClsasNames = {
    1: 'title-item',
    2: 'item'
  }
  return h(
    'div',
    {
      style: { ...config.style, width: config.width },
      class: [ClsasNames[type], config.class],
      ...config.on
    },
    value
  )
}
const playlistMenuItems = [
  { label: '收藏歌曲', value: 'collection' },
  { label: '删除歌曲', value: 'delete' }
]
export default defineComponent({
  props: {
    list: {
      type: Array as () => GetMusicDetailData[],
      required: true
    },
    songs: {
      type: Object as PropType<GetMusicDetailData>,
      required: true
    },
    columns: {
      type: Array as PropType<Columns[]>,
      required: true
    },
    loading: Boolean,
    ids: Array as PropType<number[]>,
    listInfo: {
      type: Object as PropType<PlayList>,
      required: true
    },
    scroll: Boolean, // 是否显示滚动条
    isPaging: {
      // 是否需要分页
      type: Boolean,
      default: false
    },
    total: Number, // 总数
    pageSize: {
      // 每页显示的最大数量
      type: Number,
      default: 50
    },
    currentPage: {
      // 当前页数
      type: Number,
      default: 1
    },
    isLoadingEndflyback: {
      // 等待loading开始移至滚动条为最上方
      type: Boolean,
      default: false
    },
    lazy: {
      // 是否启用图片懒加载
      type: Boolean,
      default: true
    },
    isNeedTitle: {
      // 是否需要标题
      type: Boolean,
      default: true
    },
    isSearch: {
      // 是否开启搜索功能
      type: Boolean,
      default: true
    }
  },
  emits: ['play', 'current-change', 'update:modelValue'], // 播放歌曲
  setup(props, { emit, attrs }) {
    const store = useUserInfo()
    const music = useMusicAction()
    const { likeMusic, deleteSongHandler } = useMusic()
    const id = ref(0)
    const filterList = ref(props.list)
    const copyrightVisible = ref(false)

    const loadingDiretive = resolveDirective('loading')!
    const input = resolveComponent('VTextField')
    const VDialog = resolveComponent('VDialog')
    const VCard = resolveComponent('VCard')
    const vImg = resolveComponent('VImg')
    const VCardTitle = resolveComponent('VCardTitle')
    const VBtn = resolveComponent('VBtn')
    const VCardText = resolveComponent('VCardText')
    const searchKeyword = ref('')

    const formatCount = (index: number) => {
      return index.toString().length > 1 ? index : '0' + index
    }
    const handlePlaylistMenuSelect = (item: { label: string; value: string }, row, index) => {
      console.log('listInfo', props.listInfo, row)
      switch (item.value) {
        case 'collection':
          break
        case 'delete':
          deleteSongHandler(row.id, props.listInfo.id, index)
          break
      }
    }
    const playHandler = async (item: GetMusicDetailData, index: number) => {
      const { success } = await checkMusic(item.id)
      if (success === false) {
        copyrightVisible.value = true
        return
      }
      // 歌曲相同的情况下, 如果当前双击的歌曲不是当前正在播放的歌单歌曲,那应该播放
      if (music.state.runtimeList?.id === music.state.currentItem?.id) {
        // 没暂停，双击当前应该什么都不做
        if (window.$audio.isPlay && props.songs.id === item.id) {
          return
        }
        // 暂停，双击应该继续播放。
        if (!window.$audio.isPlay && props.songs.id === item.id) {
          return window.$audio.play()
        }
      }
      id.value = item.id
      emit('play', item, index)

      // 确保顺序是先更新store songs，然后在更新runPlayList。判断与当前歌单是否相同
      if (
        music.state.runtimeList?.id !== music.state.currentItem?.id &&
        props.ids &&
        props.listInfo
      ) {
        // 如果不相同就更新 当前歌单
        music.updateRuntimeList({ tracks: props.list, ...props.listInfo }, props.ids)
      }
    }
    const mousedownHandler = (item: GetMusicDetailData) => {
      id.value = item.id
    }
    const isLike = (item: GetMusicDetailData) => {
      return store.userLikeIds.includes(item.id)
    }
    const activeText = (item: GetMusicDetailData) => {
      if (item.id === undefined) {
        return false
      } else if (props.listInfo) {
        return item.id === props.songs.id && props.listInfo.id === music.state.runtimeList?.id
      } else {
        return item.id === props.songs.id
      }
    }

    const router = useRouter()
    const singerDetail = (id: number) => {
      router.push(`/singer-page?id=${id}`)
    }
    const renderPagination = () => {
      return props.isPaging && props.total
        ? h(Pagination, {
            background: true,
            total: props.total,
            pageSize: props.pageSize,
            currentPage: props.currentPage,
            onCurrentChange: (page: number) => emit('current-change', page)
          })
        : ''
    }
    const renderSinger = (data: GetMusicDetailData, config: Columns) => {
      if (!data.ar) {
        return indiviEl(config, 2, data.artist)
      }
      const len = data.ar.length - 1
      return h(
        'div',
        { class: ['name-container'] },
        data.ar.map((ar, index) => {
          return [
            h(
              'span',
              {
                onClick: () => ar.id && singerDetail(ar.id),
                class: [ar.id && 'name'],
                style: {
                  cursor: ar.id ? 'pointer' : 'default',
                  color: ar.id ? '' : 'rgba(150, 150, 150, 0.60)'
                }
              },
              ar.name || data.artist || '未知艺人'
            ),
            index < len ? h('span', { style: { color: '#969696' } }, ` / `) : ''
          ]
        })
      )
    }

    watch(
      () => props.loading,
      (val) => {
        if (props.isLoadingEndflyback && val) {
          document.querySelector('.main')!.scrollTop = 0
        }
      }
    )
    watch(
      () => props.list,
      (val) => {
        filterList.value = val
      }
    )
    const renderTitle = () => {
      if (!props.isNeedTitle) {
        return ''
      }
      return h(
        'div',
        { class: 'title-container', style: { display: props.loading ? 'none' : '' } },
        props.columns.map((config) => {
          return indiviEl(config, 1, config.title)
        })
      )
    }
    const closeCopyrightVisible = () => {
      copyrightVisible.value = false
    }

    const Content = () =>
      props.loading || filterList.value.length
        ? [
            renderTitle(),
            h(
              'div',
              { class: 'list-container', style: { display: props.loading ? 'none' : '' } },
              filterList.value.map((data, i) => {
                return h(
                  ContextMenu,
                  {
                    items: playlistMenuItems,
                    onSelect: (e) => handlePlaylistMenuSelect(e, data, i)
                  },
                  () =>
                    h(
                      'div',
                      {
                        ondblclick: () => playHandler(data, i),
                        onMousedown: () => mousedownHandler(data),
                        key: data.id,
                        class: `list ${data.copyright === 0 ? 'disable-list' : ''}`
                        // style: {background: data.id === id.value ? 'rgba(255, 255, 255, 0.08)'
                        //     : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'none'}
                      },
                      props.columns.map((config) => {
                        if (config.processEl) {
                          return indiviEl(config, 2, config.processEl(h, data, i))
                        } else if (config.icon) {
                          return indiviEl(
                            config,
                            2,
                            config.icon.map((val) => {
                              const result = isLike(data)
                              if (val === 'love') {
                                return h('i', {
                                  onClick: () => likeMusic(data.id, !result),
                                  class: ['iconfont', result ? 'icon-xihuan1' : 'icon-xihuan']
                                })
                              }
                            })
                          )
                        } else if (!config.type && config.prop) {
                          return indiviEl(config, 2, lookup(data, config.prop))
                        } else if (config.type) {
                          if (config.type === 'index') {
                            return indiviEl(
                              config,
                              2,
                              formatCount(
                                props.isPaging
                                  ? props.pageSize * (props.currentPage - 1) + (i + 1)
                                  : i + 1
                              )
                            )
                          } else if (config.type === 'title') {
                            return [
                              indiviEl(
                                {
                                  ...config,
                                  style: {
                                    ...config.style,
                                    color: activeText(data) ? 'rgb(255,60,60)' : ''
                                  }
                                },
                                2,
                                [
                                  h('div', { class: 'title-box' }, [
                                    h(vImg, {
                                      style: {
                                        maxWidth: '50px'
                                      },
                                      width: '50',
                                      'aspect-ratio': '1/1',
                                      // gradient: 'to top right, rgba(100,115,201,.33), rgba(25,32,72,.7)',
                                      src: lookup(data, config.picUrl) + '?param=150y150',
                                      class: 'pic-url'
                                      // lazy: config.lazy
                                    }),
                                    h('div', { class: 'name-box' }, [
                                      h(
                                        'div',
                                        {
                                          style: {
                                            color: activeText(data) ? 'rgb(255,60,60)' : ''
                                          }
                                        },
                                        lookup(data, config.prop)
                                      ),
                                      renderSinger(data, config)
                                    ])
                                  ])
                                ]
                              )
                            ]
                          } else if (config.type === 'album') {
                            return indiviEl(config, 2, lookup(data, config.prop) || '未知专辑')
                          }
                        }
                      })
                    )
                )
              })
            )
          ]
        : h(
            'div',
            {
              style: {
                display: 'grid',
                placeItems: 'center',
                gap: '20px'
              }
            },
            [
              h(
                'div',
                {
                  style: {
                    fontSize: '20px'
                  }
                },
                `没有找到关于"${searchKeyword.value}"的任何内容`
              ),
              h(vImg, {
                src: NotFound,
                width: '150'
              })
            ]
          )

    return () => {
      return h(
        'div',
        {
          style: {
            overflowY: props.scroll ? 'auto' : 'visible'
          },
          class: 'song-list-container'
        },
        [
          props.isSearch &&
            h(
              'div',
              { class: 'search-container', style: { display: props.loading ? 'none' : '' } },
              [
                h(input, {
                  density: 'compact',
                  placeholder: '搜索此列表歌曲',
                  prependInnerIcon: 'mdi-magnify',
                  variant: 'outlined',
                  maxWidth: 400,
                  baseColor: '#ffffff33',
                  color: '#ffffff33',
                  modelValue: searchKeyword.value,
                  'onUpdate:modelValue': (val: string) => {
                    searchKeyword.value = val
                    if (!val.trim().length) {
                      filterList.value = props.list
                    } else {
                      filterList.value = props.list.filter((item) => {
                        const alName = item.al?.name || ' '
                        const keywords = [item.name?.toLowerCase(), alName.toLowerCase()]
                        item.ar?.forEach((a) => {
                          if (a.name) {
                            keywords.push(a.name.toLowerCase())
                          }
                        })

                        return keywords.some((keyword) => keyword.includes(val?.toLowerCase()))
                      })
                    }
                  }
                })
              ]
            ),
          h(
            VDialog,
            {
              scrim: false,
              modelValue: copyrightVisible.value,
              'onUpdate:modelValue': () => closeCopyrightVisible,
              maxWidth: '400'
            },
            [
              h(
                VCard,
                {
                  rounded: 'lg'
                },
                [
                  h(
                    VCardTitle,
                    {
                      class: 'd-flex justify-space-between align-center'
                    },
                    [
                      h('div', { class: 'text-h5 text-medium-emphasis ps-2' }, '当前歌曲暂无音源'),
                      h(VBtn, {
                        icon: 'mdi-close',
                        variant: 'text',
                        onClick: closeCopyrightVisible
                      })
                    ]
                  ),
                  h(
                    VCardText,
                    {
                      class: 'd-flex justify-center align-center'
                    },
                    h(
                      VBtn,
                      {
                        variant: 'tonal',
                        onClick: closeCopyrightVisible
                      },
                      '好'
                    )
                  )
                ]
              )
            ]
          ),
          Content(),
          // <el-pagination background layout="prev, pager, next" :total="1000" />
          renderPagination(),
          withDirectives(
            h('div', {
              class: 'loading',
              style: {
                display: props.loading ? 'block' : 'none'
              }
            }),
            [[loadingDiretive, props.loading]]
          )
        ]
      )
    }
  }
})
</script>

<style lang="less" scoped>
.song-list-container {
  flex: 1;
  position: relative;
  padding: 35px;
  .search-container {
    display: flex;
    justify-content: start;
  }
  .loading {
    position: relative;
    top: 100px;
    :deep(.el-loading-mask) {
      .el-loading-spinner {
      }
    }
  }
  .title-item.empty {
    position: relative;
    top: 2px;
    left: 2px;
  }
  .empty {
    width: 50px;
  }
  .handle {
    width: 45px;
    margin-right: 20px;
  }
  .title {
    width: 40%;
    color: @text;
    margin-right: 40% - 38px;
    .textOverflow();
    //margin-right: 20% - 19px;
  }

  .album {
    width: 20%;
    .textOverflow();
    margin-right: 20% - 19px;
  }
  .time {
    width: 10%;
  }
  .title-container {
    display: flex;
    font-size: 14px;
    height: 35px;
    color: @darkText;
    padding: 0 20px;
    justify-content: space-around;
    .title-item {
      text-align: left;
    }
    .title-item.title {
      color: @darkText;
    }
  }
  .list.disable-list {
    //background-color: rgba(0, 0, 0, 0.3);
  }
  .list {
    justify-content: space-around;
    font-size: 14px;
    display: flex;
    height: 70px;
    color: @darkText;
    align-items: center;
    padding: 0 20px;
    .title-box {
      display: flex;
      .pic-url {
        height: 50px;
        width: 50px;
        border-radius: 8px;
        margin-right: 10px;
        flex-shrink: 0;
      }
      .name-box {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        .name-container {
          color: @text;
        }
        .title {
          color: @text;
        }
        > div {
          .textOverflow();
        }
        .name {
          font-size: 13px;
          color: @darkText;
        }
      }
    }
    .name {
      cursor: pointer;
      &:hover {
        color: @text !important;
      }
    }
    .item {
      text-align: left;
    }
    .handle {
      font-size: 18px;
      cursor: pointer;
      .icon-xihuan1 {
        font-size: 18px;
        color: #eb4141;
        margin-left: 4px;
      }
      .icon-xihuan {
        color: #a5a7a8;
        font-size: 19px;
        margin-left: 4px;
      }
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.06) !important;
      border-radius: 10px;
    }
  }
}
</style>
