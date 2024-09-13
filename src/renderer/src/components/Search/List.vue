<script setup lang="ts">

import {RecordContent} from "@/components/Search/type";
import {useRouter} from "vue-router";

interface Props {
  list: {
    iconUrl: string
    searchWord: string
    content: string
    score: string
  }[]
  keywordsList: {
    order: string[]
    allMatch: []
    albums?: []
    artists?: []
    playlists?: []
    songs?:[]
  }
  model: 'hot' | 'keywords'
  recordContent: RecordContent[]
}

const emit = defineEmits(['click', 'clear', 'recordTagClick', 'deleteTag'])
const props = defineProps<Props>()
const router = useRouter()
const config = {
  allMatch: {
    text: '猜你想搜',
    icon: '<el-icon><Search /></el-icon>',
  },
  songs: {
    text: '单曲',
    icon: '',
  },
  artists:{
    text: '歌手',
    icon: '',
  } ,
  albums: {
    text: '专辑',
    icon: ''
  },
  playlists: {
    text: '歌单',
    icon: ''
  },
}

</script>

<template>
  <div class="list">
    <template v-if="model === 'hot'">
      <div v-show="recordContent.length" class="record">
        <div class="list-title-container">
          <span class="list-title">搜索历史</span>
          <el-icon @click="emit('clear')" color="rgba(255, 255, 255, 0.3)" class="clear"><DeleteFilled /></el-icon>
        </div>
        <div class="record-list">
          <div
            v-for="(item, index) in recordContent"
            :key="item.term"
            class="record-item"
          >
            <span @click="emit('recordTagClick', item, index)" class="record-tag">{{ item.term }}</span>
            <el-icon @click="emit('deleteTag', index)" color="rgba(255, 255, 255, 0.3)" class="delete"><CircleCloseFilled /></el-icon>
          </div>
        </div>
      </div>
      <div>
        <div style="padding: 0 30px;margin-bottom: 10px;" class="list-title">热搜榜单</div>
        <div  @click="emit('click', item, 'hot')" v-for="(item, index) in props.list" class="item">
          <div class="sort">{{ index+1 }}</div>
          <div class="content">
            <div class="title">
              <span class="name">{{ item.searchWord }}</span>
              <img v-if="item.iconUrl" :src="item.iconUrl" class="icon">
              <span class="score">{{ item.score }}</span>
            </div>
            <div class="desc">{{item.content}}</div>
          </div>
        </div>
      </div>
    </template>
    <template v-if="model === 'keywords'">
      <div class="suggest-box" v-for="key in props.keywordsList.order">
        <div class="title">{{ config[key].text }}</div>
        <div @click="emit('click', target, key)" class="item" v-for="target in props.keywordsList[key]">
          <div class="name" v-html="target.text"/>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="less" scoped>
.list {
  height: 100%;
  overflow: auto;
  margin-top: 20px;
  .record {
    padding: 0 30px;
    margin-bottom: 5px;
    .list-title-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .clear {
        cursor: pointer;
        &:hover {
          color: rgba(255, 255, 255, 0.7);
        }
      }
    }
    .record-list {
      display: flex;
      flex-wrap: wrap;
      padding: 10px 0;
      .record-item {
        position: relative;
        &:hover {
          .delete {
            display: inline-block;
          }
        }
        .delete {
          position: absolute;
          right: 0;
          top: 0;
          cursor: pointer;
          display: none;
          &:hover {
            color: rgba(255, 255, 255, 0.7);
          }
        }
        .record-tag {
          margin: 5px;
          font-size: 14px;
          padding: 5px 10px;
          border-radius: 5px;
          background-color: rgba(255,255,255,0.05);
          font-weight: 400;
          cursor: pointer;
          .textOverflow();
          display: inline-block;
          max-width: 120px;
          &:hover {
            color: white;
          }
        }
      }
    }
  }
  .item {
    display: flex;
    align-items: center;
    height: 60px;
    cursor: pointer;
    padding: 0 30px;
    &:hover {
      background-color: rgba(0,0,0,0.05);
    }

    .sort {
      margin-right: 20px;
      color: @darkText;
    }
    .content {
      display: flex;
      flex-direction: column;
      .title {
        margin-bottom: 5px;
        .name {
          font-size: 14px;
          font-weight: 600;
        }
        .score {
          color: @moreDark;
          font-size: 12px;
        }
        .icon {
          height: 13px;
          width: 13px;
        }
        > * {
          margin-right: 5px;
        }

      }
      .desc {
        font-size: 12px;
        color: @moreDark;
      }
    }
  }
  .item:nth-child(-n+3) {
    .sort {
      color: rgba(255, 0, 0, 0.9);
    }
  }
  .suggest-box {
    padding-top: 10px;
    .title {
      color: @moreDark;
      font-size: 16px;
      padding: 0 20px 10px 34px;
    }
    .name {
      font-size: 13px;
    }
    .item {
      cursor: pointer;
      padding: 8px 30px;
      height: auto;
    }
  }

}
</style>
